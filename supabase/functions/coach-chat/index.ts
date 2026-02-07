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
    // Authenticate user
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
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's onboarding data for personalized context
    const { data: onboarding, error: onboardingError } = await supabase
      .from("onboarding_data")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (onboardingError) {
      console.error("Failed to fetch onboarding data:", onboardingError);
    }

    // Build personalized system prompt
    const systemPrompt = buildSystemPrompt(onboarding);

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Coach chat request from user ${userId}, ${messages.length} messages`);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limited by AI gateway");
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required from AI gateway");
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get a response from the coach." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Coach chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(onboarding: Record<string, unknown> | null): string {
  let context = "";

  if (onboarding) {
    const parts: string[] = [];

    if (onboarding.primary_goals) {
      parts.push(`Primary goals: ${(onboarding.primary_goals as string[]).join(", ")}`);
    }
    if (onboarding.secondary_goals) {
      parts.push(`Secondary goals: ${(onboarding.secondary_goals as string[]).join(", ")}`);
    }
    if (onboarding.weight_kg) parts.push(`Weight: ${onboarding.weight_kg}kg`);
    if (onboarding.height_cm) parts.push(`Height: ${onboarding.height_cm}cm`);
    if (onboarding.activity_level) parts.push(`Activity level: ${onboarding.activity_level}`);
    if (onboarding.calorie_target) parts.push(`Daily calorie target: ${onboarding.calorie_target} kcal`);
    if (onboarding.protein_target) parts.push(`Protein target: ${onboarding.protein_target}g`);
    if (onboarding.carb_target) parts.push(`Carb target: ${onboarding.carb_target}g`);
    if (onboarding.fat_target) parts.push(`Fat target: ${onboarding.fat_target}g`);
    if (onboarding.selected_program) parts.push(`Training program: ${onboarding.selected_program}`);
    if (onboarding.experience_tier) parts.push(`Experience tier: ${onboarding.experience_tier}`);
    if (onboarding.wake_time) parts.push(`Wake time: ${onboarding.wake_time}`);
    if (onboarding.bedtime) parts.push(`Bedtime: ${onboarding.bedtime}`);
    if (onboarding.sleep_duration) parts.push(`Sleep duration: ${onboarding.sleep_duration}h`);
    if (onboarding.work_type) parts.push(`Work type: ${onboarding.work_type}`);
    if (onboarding.work_start && onboarding.work_end) {
      parts.push(`Work hours: ${onboarding.work_start} – ${onboarding.work_end}`);
    }
    if (onboarding.stress_level) parts.push(`Stress level: ${onboarding.stress_level}/10`);
    if (onboarding.friction_points) {
      parts.push(`Friction points: ${(onboarding.friction_points as string[]).join(", ")}`);
    }

    if (parts.length > 0) {
      context = `\n\nHere is what you know about this user:\n${parts.join("\n")}`;
    }
  }

  return `You are a personal performance coach embedded in a daily operating system app. Your role is to give clear, specific, actionable advice on training, nutrition, recovery, routines, and mindset.

Persona:
- Calm, direct, and confident. You speak like a seasoned operator — no fluff, no hype.
- Supportive but firm. You don't sugarcoat, but you're never harsh.
- You reference the user's actual data when relevant (their macros, schedule, goals).
- Keep answers concise. Lead with the answer, then explain briefly if needed.
- If you don't have enough data to answer precisely, say so and give a general recommendation.
- Use metric units (kg, cm, g).
- Never use emojis excessively. One occasionally is fine.
- Do not hallucinate data you don't have about the user.${context}`;
}
