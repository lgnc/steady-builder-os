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
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { mealPlanId, dayIndex, mealSlot } = await req.json();

    // Fetch current plan
    const { data: plan, error: planErr } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", mealPlanId)
      .eq("user_id", user.id)
      .single();

    if (planErr || !plan) throw new Error("Meal plan not found");

    // Fetch nutrition profile for filters
    const { data: profile } = await supabase
      .from("nutrition_profiles")
      .select("dietary_filters")
      .eq("user_id", user.id)
      .single();

    // Fetch onboarding for allergies
    const { data: onb } = await supabase
      .from("onboarding_data")
      .select("allergies, sensitivities, dietary_choices")
      .eq("user_id", user.id)
      .single();

    const planData = plan.plan_data as any;
    const day = planData.days?.find((d: any) => d.day === dayIndex);
    if (!day) throw new Error("Day not found in plan");

    const currentMeal = day.meals?.find((m: any) => m.slot === mealSlot);
    if (!currentMeal) throw new Error("Meal not found");

    const allFilters = [
      ...(profile?.dietary_filters || []),
      ...(onb?.dietary_choices || []),
    ];
    const allergyText = [onb?.allergies, onb?.sensitivities].filter(Boolean).join(", ");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Generate an alternative ${mealSlot.replace("_", " ")} recipe that matches these macros within ±5%:
- Calories: ${currentMeal.calories} kcal
- Protein: ${currentMeal.protein_g}g
- Carbs: ${currentMeal.carb_g}g
- Fat: ${currentMeal.fat_g}g

Current meal to replace: "${currentMeal.name}"
Make it a DIFFERENT recipe. High-protein, minimal ingredients (5-8), meal-prep friendly, simple preparation. All weights in grams. State raw or cooked.

${allFilters.length > 0 ? `Dietary filters: ${allFilters.join(", ")}` : ""}
${allergyText ? `Allergies to avoid: ${allergyText}` : ""}

Return using the swap_meal function.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a sports nutrition chef. Generate a single replacement meal recipe." },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "swap_meal",
              description: "Return a replacement meal",
              parameters: {
                type: "object",
                properties: {
                  meal: {
                    type: "object",
                    properties: {
                      slot: { type: "string" },
                      name: { type: "string" },
                      calories: { type: "integer" },
                      protein_g: { type: "integer" },
                      carb_g: { type: "integer" },
                      fat_g: { type: "integer" },
                      cook_time_minutes: { type: "integer" },
                      ingredients: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            amount_grams: { type: "number" },
                            raw_or_cooked: { type: "string", enum: ["raw", "cooked"] },
                            category: { type: "string", enum: ["protein", "vegetables", "grains", "dairy", "fats", "other"] },
                          },
                          required: ["name", "amount_grams", "raw_or_cooked", "category"],
                          additionalProperties: false,
                        },
                      },
                      steps: { type: "array", items: { type: "string" } },
                    },
                    required: ["slot", "name", "calories", "protein_g", "carb_g", "fat_g", "cook_time_minutes", "ingredients", "steps"],
                    additionalProperties: false,
                  },
                },
                required: ["meal"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "swap_meal" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI swap failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { meal: newMeal } = JSON.parse(toolCall.function.arguments);
    newMeal.slot = mealSlot;

    // Update plan_data
    const updatedDays = planData.days.map((d: any) => {
      if (d.day === dayIndex) {
        return {
          ...d,
          meals: d.meals.map((m: any) => (m.slot === mealSlot ? newMeal : m)),
        };
      }
      return d;
    });

    const { error: updateErr } = await supabase
      .from("meal_plans")
      .update({ plan_data: { days: updatedDays } })
      .eq("id", mealPlanId)
      .eq("user_id", user.id);

    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

    return new Response(JSON.stringify({ meal: newMeal }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("swap-meal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
