import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOAL_ADJUSTMENTS: Record<string, number> = {
  fat_loss: -500,
  recomposition: -250,
  muscle_gain: 300,
  athletic: 0,
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

function calculateBMR(gender: string, weightKg: number, heightCm: number, age: number): number {
  if (gender === "female") {
    return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
  }
  return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
}

function calculateMacros(
  weightKg: number,
  calorieTarget: number,
  tdee: number
) {
  // Protein: 2g/kg for most, capped at 2.2
  let proteinG = Math.round(weightKg * 2.0);
  const proteinCals = proteinG * 4;

  // Fat: 25% of calories
  let fatCals = Math.round(calorieTarget * 0.25);
  let fatG = Math.round(fatCals / 9);

  // Ensure fat is 20-30%
  const fatPct = fatCals / calorieTarget;
  if (fatPct < 0.2) {
    fatG = Math.round((calorieTarget * 0.2) / 9);
    fatCals = fatG * 9;
  } else if (fatPct > 0.3) {
    fatG = Math.round((calorieTarget * 0.3) / 9);
    fatCals = fatG * 9;
  }

  // Carbs fill remainder
  const carbCals = calorieTarget - proteinCals - fatCals;
  const carbG = Math.max(0, Math.round(carbCals / 4));

  return { proteinG, fatG, carbG };
}

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { mealsPerDay, dietaryFilters } = await req.json();

    // Fetch onboarding data
    const { data: onb, error: onbErr } = await supabase
      .from("onboarding_data")
      .select("age, gender, height_cm, weight_kg, activity_level, primary_goals, dietary_choices, allergies, sensitivities")
      .eq("user_id", user.id)
      .single();

    if (onbErr || !onb) throw new Error("Onboarding data not found");
    if (!onb.age || !onb.height_cm || !onb.weight_kg || !onb.gender) {
      throw new Error("Missing required fields: age, height, weight, or gender");
    }

    // Calculate BMR & TDEE
    const bmr = Math.round(calculateBMR(onb.gender, onb.weight_kg, onb.height_cm, onb.age));
    const activityMultiplier = ACTIVITY_MULTIPLIERS[onb.activity_level || "moderate"] || 1.55;
    const tdee = Math.round(bmr * activityMultiplier);

    // Goal adjustment
    const primaryGoal = (onb.primary_goals || [])[0] || "athletic";
    const goalAdjustment = GOAL_ADJUSTMENTS[primaryGoal] ?? 0;
    let calorieTarget = tdee + goalAdjustment;

    // Guardrail: deficit cannot exceed 1200 kcal below TDEE
    if (calorieTarget < tdee - 1200) {
      calorieTarget = tdee - 1200;
    }

    // Minimum floor
    if (calorieTarget < 1200) {
      calorieTarget = 1200;
    }

    const { proteinG, fatG, carbG } = calculateMacros(onb.weight_kg, calorieTarget, tdee);

    // Upsert nutrition profile
    const { error: profileErr } = await supabase
      .from("nutrition_profiles")
      .upsert(
        {
          user_id: user.id,
          bmr,
          tdee,
          calorie_target: calorieTarget,
          protein_g: proteinG,
          fat_g: fatG,
          carb_g: carbG,
          meals_per_day: mealsPerDay || 3,
          dietary_filters: dietaryFilters || [],
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (profileErr) throw new Error(`Profile save failed: ${profileErr.message}`);

    // Build AI prompt for meal plan generation
    const allFilters = [
      ...(dietaryFilters || []),
      ...(onb.dietary_choices || []),
    ];
    const allergyText = [onb.allergies, onb.sensitivities].filter(Boolean).join(", ");

    const mealSlots: string[] = [];
    if (mealsPerDay >= 2) mealSlots.push("breakfast", "lunch");
    if (mealsPerDay >= 3) mealSlots.push("dinner");
    if (mealsPerDay >= 4) mealSlots.push("snack_1");
    if (mealsPerDay >= 5) mealSlots.push("snack_2");

    const caloriesPerMeal: Record<string, number> = {};
    const proteinPerMeal: Record<string, number> = {};
    const fatPerMeal: Record<string, number> = {};
    const carbPerMeal: Record<string, number> = {};

    // Distribute macros across meals
    const snackCount = mealSlots.filter((s) => s.startsWith("snack")).length;
    const mainMealCount = mealSlots.length - snackCount;
    const snackShare = 0.1; // each snack gets 10%
    const mainShare = (1 - snackShare * snackCount) / mainMealCount;

    for (const slot of mealSlots) {
      const share = slot.startsWith("snack") ? snackShare : mainShare;
      caloriesPerMeal[slot] = Math.round(calorieTarget * share);
      proteinPerMeal[slot] = Math.round(proteinG * share);
      fatPerMeal[slot] = Math.round(fatG * share);
      carbPerMeal[slot] = Math.round(carbG * share);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a sports nutrition chef. Generate a weekly meal plan. All recipes must be high-protein, minimal ingredients (5-8 per recipe), meal-prep friendly, and simple to prepare. Every ingredient weight must be in grams. Clearly state whether weights are raw or cooked.`;

    const userPrompt = `Create a 7-day meal plan for someone with these targets:
- Daily calories: ${calorieTarget} kcal
- Protein: ${proteinG}g, Fat: ${fatG}g, Carbs: ${carbG}g
- Meals per day: ${mealsPerDay} (${mealSlots.join(", ")})

Per-meal calorie targets: ${JSON.stringify(caloriesPerMeal)}

Variety rules:
- 2 unique breakfast recipes (rotate across the week)
- 3 unique lunch recipes (rotate across the week)
- 4 unique dinner recipes (rotate across the week)
- Snacks generated as needed to hit macros

${allFilters.length > 0 ? `Dietary filters: ${allFilters.join(", ")}` : ""}
${allergyText ? `Allergies/sensitivities to avoid: ${allergyText}` : ""}

Return the plan using the generate_meal_plan function.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_meal_plan",
              description: "Generate a structured 7-day meal plan",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "integer", description: "Day 1-7 (1=Monday)" },
                        meals: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              slot: { type: "string", description: "breakfast, lunch, dinner, snack_1, snack_2" },
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
                              steps: {
                                type: "array",
                                items: { type: "string" },
                              },
                            },
                            required: ["slot", "name", "calories", "protein_g", "carb_g", "fat_g", "cook_time_minutes", "ingredients", "steps"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["day", "meals"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_meal_plan" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const planData = JSON.parse(toolCall.function.arguments);

    // Calculate week start (current Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split("T")[0];

    // Save meal plan
    const { data: mealPlan, error: planErr } = await supabase
      .from("meal_plans")
      .insert({
        user_id: user.id,
        week_start: weekStart,
        plan_data: planData,
      })
      .select()
      .single();

    if (planErr) throw new Error(`Plan save failed: ${planErr.message}`);

    return new Response(
      JSON.stringify({
        profile: { bmr, tdee, calorieTarget, proteinG, fatG, carbG },
        plan: mealPlan,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-nutrition-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
