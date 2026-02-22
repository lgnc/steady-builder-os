import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const {
      trainingCompleted,
      trainingTotal,
      habitPercent,
      nutritionPercent,
      weightDelta,
      longestStreak,
    } = body;

    // Fetch onboarding context
    const { data: onboarding } = await supabase
      .from("onboarding_data")
      .select("primary_goals, secondary_goals, friction_points, experience_tier, selected_program")
      .eq("user_id", userId)
      .single();

    const goals = onboarding?.primary_goals?.join(", ") || "not specified";
    const frictions = onboarding?.friction_points?.join(", ") || "none listed";
    const program = onboarding?.selected_program || "unknown";
    const tier = onboarding?.experience_tier || "unknown";

    const systemPrompt = `You are the Coach — an authoritative, firm-but-fair mentor who reviews a trainee's weekly performance. Your tone is calm, direct, and honest. You don't sugarcoat, but you're not cruel. You speak like a seasoned operator who genuinely cares about the person in front of them — someone who respects effort, understands the grind, and calls out slacking without drama.

Rules:
- Write exactly 3 paragraphs
- Reference specific numbers from the data provided
- First paragraph: Overall verdict — how did the week go? Be honest but fair
- Second paragraph: What's working and what's not. Be specific about which areas are strong vs weak
- Third paragraph: One clear, actionable focus for next week. Frame it as an opportunity, not a demand. Be concrete but compassionate — show you understand the effort required without making excuses for them
- No fluff, no motivational quotes, no emojis
- Keep it under 200 words total
- Address the reader as "you"
- If performance is genuinely strong across the board, acknowledge it — don't manufacture criticism
- Your tone should feel like tough love with heart. Direct and honest, but warm enough that the reader feels supported, not attacked`;

    const userPrompt = `Here's the weekly performance data:

Training: ${trainingCompleted} of ${trainingTotal} sessions completed
Habits: ${habitPercent}% complete
Nutrition: ${nutritionPercent}% compliant
Weight change: ${weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg` : "No weight logged"}
Longest active streak: ${longestStreak} days

Trainee context:
- Goals: ${goals}
- Known friction points: ${frictions}
- Program: ${program}
- Experience tier: ${tier}

Write your weekly coaching review.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const summaryText = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ summary: summaryText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-review-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
