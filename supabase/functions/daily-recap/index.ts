import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse context from client
    const body = await req.json();
    const {
      completionPct = 0,
      habitCounts = { total: 0, completed: 0 },
      nutritionCounts = { total: 0, completed: 0 },
      anchorCompletions = {},
      isTrainingDay = false,
      weeklyCompletion = null,
    } = body;

    // Build context string
    const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
    const parts: string[] = [];
    parts.push(`Today is ${today}.`);
    parts.push(`Daily completion: ${completionPct}%.`);
    parts.push(`Habits: ${habitCounts.completed}/${habitCounts.total} done.`);

    if (isTrainingDay) {
      parts.push(`Training day: ${anchorCompletions.training ? "completed" : "not yet done"}.`);
    } else {
      parts.push("Rest day — no training scheduled.");
    }

    parts.push(`Nutrition: ${nutritionCounts.completed}/${nutritionCounts.total} meals logged.`);
    parts.push(`Morning routine: ${anchorCompletions.morning_routine ? "done" : "not yet done"}.`);
    parts.push(`Evening routine: ${anchorCompletions.evening_routine ? "done" : "not yet done"}.`);
    parts.push(`Reading: ${anchorCompletions.reading ? "done" : "not yet done"}.`);

    if (weeklyCompletion) {
      parts.push(`Weekly stats — Habits: ${weeklyCompletion.habitsPercent}%, Training: ${weeklyCompletion.trainingCompleted}/${weeklyCompletion.trainingTotal} sessions, Nutrition: ${weeklyCompletion.nutritionPercent}%.`);
    }

    const contextStr = parts.join(" ");

    const systemPrompt = `You are Coach — a firm but fair performance coach for a busy professional. You speak directly, no fluff. You acknowledge wins, call out what's left, and push the user to close out their day strong. Keep it to 3-5 sentences. Speak as if you're recording a quick voice note for them. Use their data to be specific. Don't use bullet points — keep it conversational and punchy. Never say "I" — you're talking TO them. Address them as "mate" occasionally.`;

    // Call Lovable AI
    const aiUrl = "https://api.lovable.dev/v1/chat/completions";
    const aiResp = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here's my progress data for today:\n\n${contextStr}\n\nGive me my daily recap.` },
        ],
        max_tokens: 300,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "Failed to generate recap" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const recap = aiData.choices?.[0]?.message?.content || "No recap available right now. Keep pushing.";

    return new Response(JSON.stringify({ recap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-recap error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
