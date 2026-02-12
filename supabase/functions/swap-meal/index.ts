import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Same recipe library as generate-nutrition-plan ──────────────────

interface Ingredient {
  name: string;
  amount_grams: number;
  raw_or_cooked: "raw" | "cooked";
  category: string;
  p_per100: number;
  c_per100: number;
  f_per100: number;
  scalable: "protein" | "carb" | null;
}

interface Recipe {
  slot: "breakfast" | "lunch" | "dinner";
  name: string;
  cook_time_minutes: number;
  ingredients: Ingredient[];
  steps: string[];
  tags: string[];
  allergens: string[];
}

const RECIPE_LIBRARY: Recipe[] = [
  {
    slot: "breakfast", name: "Scrambled Eggs & Oats", cook_time_minutes: 12,
    tags: ["gluten-free"], allergens: ["eggs"],
    ingredients: [
      { name: "Whole eggs", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 13, c_per100: 1.1, f_per100: 11, scalable: "protein" },
      { name: "Rolled oats", amount_grams: 80, raw_or_cooked: "raw", category: "grains", p_per100: 13.2, c_per100: 67.7, f_per100: 6.5, scalable: "carb" },
      { name: "Butter", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0.9, c_per100: 0.1, f_per100: 81, scalable: null },
      { name: "Salt & pepper", amount_grams: 2, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: ["Cook oats with water or milk.", "Whisk eggs with salt and pepper.", "Melt butter, scramble eggs.", "Serve alongside oats."],
  },
  {
    slot: "breakfast", name: "Protein Pancakes", cook_time_minutes: 15,
    tags: [], allergens: ["eggs", "dairy", "gluten"],
    ingredients: [
      { name: "Whey protein powder", amount_grams: 40, raw_or_cooked: "raw", category: "protein", p_per100: 80, c_per100: 8, f_per100: 3, scalable: "protein" },
      { name: "Whole eggs", amount_grams: 100, raw_or_cooked: "raw", category: "protein", p_per100: 13, c_per100: 1.1, f_per100: 11, scalable: "protein" },
      { name: "Oat flour", amount_grams: 60, raw_or_cooked: "raw", category: "grains", p_per100: 13, c_per100: 66, f_per100: 7, scalable: "carb" },
      { name: "Banana", amount_grams: 100, raw_or_cooked: "raw", category: "other", p_per100: 1.1, c_per100: 23, f_per100: 0.3, scalable: "carb" },
      { name: "Coconut oil spray", amount_grams: 5, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
    ],
    steps: ["Blend all ingredients.", "Cook small rounds 2 min per side.", "Serve warm."],
  },
  {
    slot: "lunch", name: "Chicken Breast, Rice & Broccoli", cook_time_minutes: 25,
    tags: ["gluten-free", "dairy-free"], allergens: [],
    ingredients: [
      { name: "Chicken breast", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 31, c_per100: 0, f_per100: 3.6, scalable: "protein" },
      { name: "White rice", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 7, c_per100: 80, f_per100: 0.6, scalable: "carb" },
      { name: "Broccoli", amount_grams: 150, raw_or_cooked: "raw", category: "vegetables", p_per100: 2.8, c_per100: 7, f_per100: 0.4, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Garlic & herbs", amount_grams: 5, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: ["Season and cook chicken.", "Cook rice.", "Steam broccoli.", "Serve together."],
  },
  {
    slot: "lunch", name: "Turkey Mince Bolognese with Pasta", cook_time_minutes: 30,
    tags: ["dairy-free"], allergens: ["gluten"],
    ingredients: [
      { name: "Turkey mince (lean)", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 27, c_per100: 0, f_per100: 8, scalable: "protein" },
      { name: "Penne pasta", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 13, c_per100: 71, f_per100: 1.5, scalable: "carb" },
      { name: "Tinned chopped tomatoes", amount_grams: 200, raw_or_cooked: "raw", category: "vegetables", p_per100: 1, c_per100: 3.5, f_per100: 0.1, scalable: null },
      { name: "Onion (diced)", amount_grams: 80, raw_or_cooked: "raw", category: "vegetables", p_per100: 1.1, c_per100: 9, f_per100: 0.1, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Garlic & Italian herbs", amount_grams: 5, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: ["Cook pasta.", "Sauté onion and garlic.", "Brown turkey mince.", "Add tomatoes, simmer 15 min.", "Serve over pasta."],
  },
  {
    slot: "lunch", name: "Tuna & Sweet Potato", cook_time_minutes: 25,
    tags: ["gluten-free", "dairy-free"], allergens: ["fish"],
    ingredients: [
      { name: "Tinned tuna (in spring water, drained)", amount_grams: 185, raw_or_cooked: "cooked", category: "protein", p_per100: 26, c_per100: 0, f_per100: 1, scalable: "protein" },
      { name: "Sweet potato", amount_grams: 250, raw_or_cooked: "raw", category: "grains", p_per100: 1.6, c_per100: 20, f_per100: 0.1, scalable: "carb" },
      { name: "Mixed salad leaves", amount_grams: 60, raw_or_cooked: "raw", category: "vegetables", p_per100: 1.5, c_per100: 2.5, f_per100: 0.2, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Lemon juice", amount_grams: 10, raw_or_cooked: "raw", category: "other", p_per100: 0.4, c_per100: 6.9, f_per100: 0.2, scalable: null },
    ],
    steps: ["Cook sweet potato.", "Drain and flake tuna.", "Combine with salad.", "Drizzle with oil and lemon."],
  },
  {
    slot: "dinner", name: "Salmon, Sweet Potato & Asparagus", cook_time_minutes: 30,
    tags: ["gluten-free", "dairy-free"], allergens: ["fish"],
    ingredients: [
      { name: "Salmon fillet", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 20, c_per100: 0, f_per100: 13, scalable: "protein" },
      { name: "Sweet potato", amount_grams: 200, raw_or_cooked: "raw", category: "grains", p_per100: 1.6, c_per100: 20, f_per100: 0.1, scalable: "carb" },
      { name: "Asparagus", amount_grams: 150, raw_or_cooked: "raw", category: "vegetables", p_per100: 2.2, c_per100: 3.9, f_per100: 0.1, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Lemon & dill", amount_grams: 5, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: ["Preheat oven to 200°C.", "Season salmon, bake.", "Roast sweet potato cubes.", "Add asparagus last 10 min.", "Serve together."],
  },
  {
    slot: "dinner", name: "Steak, Rice & Mixed Vegetables", cook_time_minutes: 20,
    tags: ["gluten-free", "dairy-free"], allergens: [],
    ingredients: [
      { name: "Sirloin steak", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 27, c_per100: 0, f_per100: 8, scalable: "protein" },
      { name: "White rice", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 7, c_per100: 80, f_per100: 0.6, scalable: "carb" },
      { name: "Mixed vegetables (peppers, courgette, mushrooms)", amount_grams: 200, raw_or_cooked: "raw", category: "vegetables", p_per100: 2, c_per100: 5, f_per100: 0.3, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Salt, pepper & garlic powder", amount_grams: 3, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: ["Cook rice.", "Season steak, sear 3-4 min per side.", "Rest 5 min, slice.", "Sauté vegetables.", "Serve together."],
  },
  {
    slot: "dinner", name: "Chicken Stir-Fry with Rice", cook_time_minutes: 20,
    tags: ["gluten-free", "dairy-free"], allergens: [],
    ingredients: [
      { name: "Chicken breast", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 31, c_per100: 0, f_per100: 3.6, scalable: "protein" },
      { name: "White rice", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 7, c_per100: 80, f_per100: 0.6, scalable: "carb" },
      { name: "Stir-fry vegetables (bell pepper, snap peas, carrot)", amount_grams: 200, raw_or_cooked: "raw", category: "vegetables", p_per100: 1.8, c_per100: 6, f_per100: 0.2, scalable: null },
      { name: "Soy sauce", amount_grams: 15, raw_or_cooked: "raw", category: "other", p_per100: 8, c_per100: 5, f_per100: 0, scalable: null },
      { name: "Sesame oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Garlic & ginger", amount_grams: 10, raw_or_cooked: "raw", category: "other", p_per100: 3, c_per100: 10, f_per100: 0.5, scalable: null },
    ],
    steps: ["Cook rice.", "Slice chicken, stir-fry 5-6 min.", "Add garlic, ginger, veg, stir-fry 3-4 min.", "Add soy sauce.", "Serve over rice."],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────

function filterRecipes(recipes: Recipe[], dietaryFilters: string[], allergyText: string): Recipe[] {
  const lowerFilters = dietaryFilters.map((f) => f.toLowerCase());
  const allergyKeywords = allergyText.toLowerCase().split(/[,;\s]+/).filter(Boolean);

  return recipes.filter((r) => {
    if (lowerFilters.includes("vegetarian") || lowerFilters.includes("vegan")) {
      const hasMeat = r.ingredients.some((i) => {
        const n = i.name.toLowerCase();
        return n.includes("chicken") || n.includes("turkey") || n.includes("steak") ||
          n.includes("salmon") || n.includes("tuna") || n.includes("sirloin") || n.includes("mince");
      });
      if (hasMeat) return false;
      if (lowerFilters.includes("vegan")) {
        const hasAnimal = r.ingredients.some((i) => {
          const n = i.name.toLowerCase();
          return n.includes("egg") || n.includes("whey") || n.includes("butter") || n.includes("milk");
        });
        if (hasAnimal) return false;
      }
    }
    if (lowerFilters.includes("dairy-free")) {
      const hasDairy = r.ingredients.some((i) => {
        const n = i.name.toLowerCase();
        return n.includes("butter") || n.includes("milk") || n.includes("cheese") || n.includes("whey") || n.includes("yogurt");
      });
      if (hasDairy) return false;
    }
    if (lowerFilters.includes("gluten-free")) {
      const hasGluten = r.allergens.includes("gluten") || r.ingredients.some((i) => {
        const n = i.name.toLowerCase();
        return n.includes("pasta") || (n.includes("flour") && !n.includes("oat"));
      });
      if (hasGluten) return false;
    }
    for (const kw of allergyKeywords) {
      if (kw.length < 2) continue;
      for (const ing of r.ingredients) {
        if (ing.name.toLowerCase().includes(kw)) return false;
      }
      if (r.allergens.some((a) => a.includes(kw))) return false;
    }
    return true;
  });
}

function scaleRecipe(recipe: Recipe, targetProtein: number, targetCarbs: number) {
  const baseProteinFromScalable = recipe.ingredients
    .filter((i) => i.scalable === "protein")
    .reduce((s, i) => s + (i.p_per100 * i.amount_grams) / 100, 0);
  const baseCarbFromScalable = recipe.ingredients
    .filter((i) => i.scalable === "carb")
    .reduce((s, i) => s + (i.c_per100 * i.amount_grams) / 100, 0);

  const proteinScale = baseProteinFromScalable > 0 ? targetProtein / baseProteinFromScalable : 1;
  const carbScale = baseCarbFromScalable > 0 ? targetCarbs / baseCarbFromScalable : 1;

  const scaledIngredients = recipe.ingredients.map((ing) => {
    let grams = ing.amount_grams;
    if (ing.scalable === "protein") grams = Math.round(grams * proteinScale);
    else if (ing.scalable === "carb") grams = Math.round(grams * carbScale);
    return { name: ing.name, amount_grams: grams, raw_or_cooked: ing.raw_or_cooked, category: ing.category };
  });

  let p = 0, c = 0, f = 0;
  for (let idx = 0; idx < recipe.ingredients.length; idx++) {
    const orig = recipe.ingredients[idx];
    const scaled = scaledIngredients[idx];
    const factor = scaled.amount_grams / 100;
    p += orig.p_per100 * factor;
    c += orig.c_per100 * factor;
    f += orig.f_per100 * factor;
  }
  p = Math.round(p); c = Math.round(c); f = Math.round(f);

  return {
    slot: recipe.slot,
    name: recipe.name,
    calories: p * 4 + c * 4 + f * 9,
    protein_g: p, carb_g: c, fat_g: f,
    cook_time_minutes: recipe.cook_time_minutes,
    ingredients: scaledIngredients,
    steps: recipe.steps,
  };
}

// ── Main handler ────────────────────────────────────────────────────

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

    // Fetch filters
    const [profileRes, onbRes] = await Promise.all([
      supabase.from("nutrition_profiles").select("dietary_filters, protein_g, carb_g, fat_g, calorie_target, meals_per_day").eq("user_id", user.id).single(),
      supabase.from("onboarding_data").select("allergies, sensitivities, dietary_choices").eq("user_id", user.id).single(),
    ]);

    const profile = profileRes.data;
    const onb = onbRes.data;

    const planData = plan.plan_data as any;
    const day = planData.days?.find((d: any) => d.day === dayIndex);
    if (!day) throw new Error("Day not found in plan");

    const currentMeal = day.meals?.find((m: any) => m.slot === mealSlot);
    if (!currentMeal) throw new Error("Meal not found");

    const allFilters = [...(profile?.dietary_filters || []), ...(onb?.dietary_choices || [])];
    const allergyText = [onb?.allergies, onb?.sensitivities].filter(Boolean).join(", ");

    const available = filterRecipes(RECIPE_LIBRARY, allFilters, allergyText);

    // Determine which slot type to pick from
    let slotType: "breakfast" | "lunch" | "dinner";
    if (mealSlot === "breakfast") slotType = "breakfast";
    else if (mealSlot === "lunch") slotType = "lunch";
    else if (mealSlot === "dinner") slotType = "dinner";
    else slotType = "lunch"; // meal_4, meal_5 draw from lunch/dinner

    const pool = mealSlot.startsWith("meal_")
      ? available.filter((r) => r.slot === "lunch" || r.slot === "dinner")
      : available.filter((r) => r.slot === slotType);

    // Find next recipe that isn't the current one
    const currentIdx = pool.findIndex((r) => r.name === currentMeal.name);
    const nextIdx = (currentIdx + 1) % pool.length;
    const recipe = pool[nextIdx] || pool[0];

    if (!recipe) throw new Error("No alternative recipes available");

    // Scale to same macro targets as the current meal
    const newMeal = scaleRecipe(recipe, currentMeal.protein_g, currentMeal.carb_g);
    newMeal.slot = mealSlot;

    // Update plan_data
    const updatedDays = planData.days.map((d: any) => {
      if (d.day === dayIndex) {
        return { ...d, meals: d.meals.map((m: any) => (m.slot === mealSlot ? newMeal : m)) };
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
