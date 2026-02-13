import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── BMR / TDEE helpers ──────────────────────────────────────────────

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

function calculateMacros(weightKg: number, calorieTarget: number) {
  let proteinG = Math.round(weightKg * 2.0);
  const proteinCals = proteinG * 4;
  let fatCals = Math.round(calorieTarget * 0.25);
  let fatG = Math.round(fatCals / 9);
  const fatPct = fatCals / calorieTarget;
  if (fatPct < 0.2) { fatG = Math.round((calorieTarget * 0.2) / 9); fatCals = fatG * 9; }
  else if (fatPct > 0.3) { fatG = Math.round((calorieTarget * 0.3) / 9); fatCals = fatG * 9; }
  const carbCals = calorieTarget - proteinCals - fatCals;
  const carbG = Math.max(0, Math.round(carbCals / 4));
  return { proteinG, fatG, carbG };
}

// ── Ingredient type ─────────────────────────────────────────────────

interface Ingredient {
  name: string;
  amount_grams: number;
  raw_or_cooked: "raw" | "cooked";
  category: string;
  /** per 100g macros for scaling */
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
  /** allergen keywords for filtering */
  allergens: string[];
}

function baseMacros(recipe: Recipe) {
  let p = 0, c = 0, f = 0;
  for (const ing of recipe.ingredients) {
    const factor = ing.amount_grams / 100;
    p += ing.p_per100 * factor;
    c += ing.c_per100 * factor;
    f += ing.f_per100 * factor;
  }
  return { protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f), calories: Math.round(p * 4 + c * 4 + f * 9) };
}

// ── Fixed Recipe Library ────────────────────────────────────────────

const RECIPE_LIBRARY: Recipe[] = [
  // ─ BREAKFAST 1: Scrambled Eggs & Oats ─
  {
    slot: "breakfast",
    name: "Scrambled Eggs & Oats",
    cook_time_minutes: 12,
    tags: ["gluten-free"],
    allergens: ["eggs"],
    ingredients: [
      { name: "Whole eggs", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 13, c_per100: 1.1, f_per100: 11, scalable: "protein" },
      { name: "Rolled oats", amount_grams: 80, raw_or_cooked: "raw", category: "grains", p_per100: 13.2, c_per100: 67.7, f_per100: 6.5, scalable: "carb" },
      { name: "Butter", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0.9, c_per100: 0.1, f_per100: 81, scalable: null },
      { name: "Salt & pepper", amount_grams: 2, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: [
      "Cook oats with water or milk according to packet instructions.",
      "Whisk eggs with a pinch of salt and pepper.",
      "Melt butter in a non-stick pan over medium-low heat.",
      "Add eggs, stir gently until just set.",
      "Serve eggs alongside oats.",
    ],
  },
  // ─ BREAKFAST 2: Protein Pancakes ─
  {
    slot: "breakfast",
    name: "Protein Pancakes",
    cook_time_minutes: 15,
    tags: [],
    allergens: ["eggs", "dairy", "gluten"],
    ingredients: [
      { name: "Whey protein powder", amount_grams: 40, raw_or_cooked: "raw", category: "protein", p_per100: 80, c_per100: 8, f_per100: 3, scalable: "protein" },
      { name: "Whole eggs", amount_grams: 100, raw_or_cooked: "raw", category: "protein", p_per100: 13, c_per100: 1.1, f_per100: 11, scalable: "protein" },
      { name: "Oat flour", amount_grams: 60, raw_or_cooked: "raw", category: "grains", p_per100: 13, c_per100: 66, f_per100: 7, scalable: "carb" },
      { name: "Banana", amount_grams: 100, raw_or_cooked: "raw", category: "other", p_per100: 1.1, c_per100: 23, f_per100: 0.3, scalable: "carb" },
      { name: "Coconut oil spray", amount_grams: 5, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
    ],
    steps: [
      "Blend protein powder, eggs, oat flour, and banana until smooth.",
      "Heat a non-stick pan with coconut oil spray over medium heat.",
      "Pour small rounds of batter, cook 2 minutes per side.",
      "Serve warm.",
    ],
  },
  // ─ LUNCH 1: Chicken Breast, Rice & Broccoli ─
  {
    slot: "lunch",
    name: "Chicken Breast, Rice & Broccoli",
    cook_time_minutes: 25,
    tags: ["gluten-free", "dairy-free"],
    allergens: [],
    ingredients: [
      { name: "Chicken breast", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 31, c_per100: 0, f_per100: 3.6, scalable: "protein" },
      { name: "White rice", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 7, c_per100: 80, f_per100: 0.6, scalable: "carb" },
      { name: "Broccoli", amount_grams: 150, raw_or_cooked: "raw", category: "vegetables", p_per100: 2.8, c_per100: 7, f_per100: 0.4, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Garlic & herbs", amount_grams: 5, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: [
      "Season chicken breast with garlic, herbs, salt and pepper.",
      "Cook chicken in a pan with olive oil over medium-high heat, 6-7 minutes per side.",
      "Cook rice according to packet instructions.",
      "Steam or boil broccoli for 4-5 minutes.",
      "Serve together.",
    ],
  },
  // ─ LUNCH 2: Turkey Mince Bolognese with Pasta ─
  {
    slot: "lunch",
    name: "Turkey Mince Bolognese with Pasta",
    cook_time_minutes: 30,
    tags: ["dairy-free"],
    allergens: ["gluten"],
    ingredients: [
      { name: "Turkey mince (lean)", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 27, c_per100: 0, f_per100: 8, scalable: "protein" },
      { name: "Penne pasta", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 13, c_per100: 71, f_per100: 1.5, scalable: "carb" },
      { name: "Tinned chopped tomatoes", amount_grams: 200, raw_or_cooked: "raw", category: "vegetables", p_per100: 1, c_per100: 3.5, f_per100: 0.1, scalable: null },
      { name: "Onion (diced)", amount_grams: 80, raw_or_cooked: "raw", category: "vegetables", p_per100: 1.1, c_per100: 9, f_per100: 0.1, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Garlic & Italian herbs", amount_grams: 5, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: [
      "Cook pasta according to packet instructions, drain.",
      "Sauté onion and garlic in olive oil until softened.",
      "Add turkey mince, brown for 5-6 minutes.",
      "Add tinned tomatoes and herbs, simmer 15 minutes.",
      "Serve sauce over pasta.",
    ],
  },
  // ─ LUNCH 3: Tuna & Sweet Potato ─
  {
    slot: "lunch",
    name: "Tuna & Sweet Potato",
    cook_time_minutes: 25,
    tags: ["gluten-free", "dairy-free"],
    allergens: ["fish"],
    ingredients: [
      { name: "Tinned tuna (in spring water, drained)", amount_grams: 185, raw_or_cooked: "cooked", category: "protein", p_per100: 26, c_per100: 0, f_per100: 1, scalable: "protein" },
      { name: "Sweet potato", amount_grams: 250, raw_or_cooked: "raw", category: "grains", p_per100: 1.6, c_per100: 20, f_per100: 0.1, scalable: "carb" },
      { name: "Mixed salad leaves", amount_grams: 60, raw_or_cooked: "raw", category: "vegetables", p_per100: 1.5, c_per100: 2.5, f_per100: 0.2, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Lemon juice", amount_grams: 10, raw_or_cooked: "raw", category: "other", p_per100: 0.4, c_per100: 6.9, f_per100: 0.2, scalable: null },
    ],
    steps: [
      "Peel and chop sweet potato into cubes, boil or bake until tender (20 min).",
      "Drain tuna and flake into a bowl.",
      "Combine tuna, sweet potato, and salad leaves.",
      "Drizzle with olive oil and lemon juice, toss gently.",
    ],
  },
  // ─ DINNER 1: Salmon, Sweet Potato & Asparagus ─
  {
    slot: "dinner",
    name: "Salmon, Sweet Potato & Asparagus",
    cook_time_minutes: 30,
    tags: ["gluten-free", "dairy-free"],
    allergens: ["fish"],
    ingredients: [
      { name: "Salmon fillet", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 20, c_per100: 0, f_per100: 13, scalable: "protein" },
      { name: "Sweet potato", amount_grams: 200, raw_or_cooked: "raw", category: "grains", p_per100: 1.6, c_per100: 20, f_per100: 0.1, scalable: "carb" },
      { name: "Asparagus", amount_grams: 150, raw_or_cooked: "raw", category: "vegetables", p_per100: 2.2, c_per100: 3.9, f_per100: 0.1, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Lemon & dill", amount_grams: 5, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: [
      "Preheat oven to 200°C / 400°F.",
      "Place salmon on a baking tray, season with lemon, dill, salt and pepper.",
      "Peel and cube sweet potato, toss in olive oil and roast for 25 minutes.",
      "Add asparagus to the tray for the last 10 minutes.",
      "Serve together.",
    ],
  },
  // ─ DINNER 2: Steak, Rice & Mixed Vegetables ─
  {
    slot: "dinner",
    name: "Steak, Rice & Mixed Vegetables",
    cook_time_minutes: 20,
    tags: ["gluten-free", "dairy-free"],
    allergens: [],
    ingredients: [
      { name: "Sirloin steak", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 27, c_per100: 0, f_per100: 8, scalable: "protein" },
      { name: "White rice", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 7, c_per100: 80, f_per100: 0.6, scalable: "carb" },
      { name: "Mixed vegetables (peppers, courgette, mushrooms)", amount_grams: 200, raw_or_cooked: "raw", category: "vegetables", p_per100: 2, c_per100: 5, f_per100: 0.3, scalable: null },
      { name: "Olive oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Salt, pepper & garlic powder", amount_grams: 3, raw_or_cooked: "raw", category: "other", p_per100: 0, c_per100: 0, f_per100: 0, scalable: null },
    ],
    steps: [
      "Cook rice according to packet instructions.",
      "Season steak with salt, pepper, and garlic powder.",
      "Heat olive oil in a skillet over high heat, cook steak 3-4 min per side for medium.",
      "Rest steak 5 minutes, then slice.",
      "Sauté vegetables in the same pan for 3-4 minutes.",
      "Serve steak sliced over rice with vegetables.",
    ],
  },
  // ─ DINNER 3: Chicken Stir-Fry with Rice ─
  {
    slot: "dinner",
    name: "Chicken Stir-Fry with Rice",
    cook_time_minutes: 20,
    tags: ["gluten-free", "dairy-free"],
    allergens: [],
    ingredients: [
      { name: "Chicken breast", amount_grams: 200, raw_or_cooked: "raw", category: "protein", p_per100: 31, c_per100: 0, f_per100: 3.6, scalable: "protein" },
      { name: "White rice", amount_grams: 100, raw_or_cooked: "raw", category: "grains", p_per100: 7, c_per100: 80, f_per100: 0.6, scalable: "carb" },
      { name: "Stir-fry vegetables (bell pepper, snap peas, carrot)", amount_grams: 200, raw_or_cooked: "raw", category: "vegetables", p_per100: 1.8, c_per100: 6, f_per100: 0.2, scalable: null },
      { name: "Soy sauce", amount_grams: 15, raw_or_cooked: "raw", category: "other", p_per100: 8, c_per100: 5, f_per100: 0, scalable: null },
      { name: "Sesame oil", amount_grams: 10, raw_or_cooked: "raw", category: "fats", p_per100: 0, c_per100: 0, f_per100: 100, scalable: null },
      { name: "Garlic & ginger", amount_grams: 10, raw_or_cooked: "raw", category: "other", p_per100: 3, c_per100: 10, f_per100: 0.5, scalable: null },
    ],
    steps: [
      "Cook rice according to packet instructions.",
      "Slice chicken breast into strips.",
      "Heat sesame oil in a wok over high heat.",
      "Stir-fry chicken strips for 5-6 minutes until cooked through.",
      "Add garlic, ginger, and vegetables, stir-fry 3-4 minutes.",
      "Add soy sauce, toss to combine.",
      "Serve over rice.",
    ],
  },
];

// ── Unit display mapping ────────────────────────────────────────────

const UNIT_MAP: { match: string; unit: string; gramsPerUnit: number }[] = [
  { match: "egg", unit: "eggs", gramsPerUnit: 60 },
  { match: "whey protein", unit: "scoops", gramsPerUnit: 30 },
  { match: "banana", unit: "banana", gramsPerUnit: 120 },
  { match: "coconut oil spray", unit: "spray", gramsPerUnit: 5 },
];

function toDisplayUnits(name: string, grams: number): { display_quantity: number; display_unit: string } {
  const lower = name.toLowerCase();
  for (const entry of UNIT_MAP) {
    if (lower.includes(entry.match)) {
      const raw = grams / entry.gramsPerUnit;
      const rounded = Math.max(0.5, Math.round(raw * 2) / 2);
      return { display_quantity: rounded, display_unit: entry.unit };
    }
  }
  return { display_quantity: Math.round(grams), display_unit: "g" };
}

// ── Helpers ─────────────────────────────────────────────────────────

function filterRecipes(
  recipes: Recipe[],
  dietaryFilters: string[],
  allergyText: string
): Recipe[] {
  const lowerFilters = dietaryFilters.map((f) => f.toLowerCase());
  const allergyKeywords = allergyText
    .toLowerCase()
    .split(/[,;\s]+/)
    .filter(Boolean);

  return recipes.filter((r) => {
    // Dietary filter checks
    if (lowerFilters.includes("vegetarian") || lowerFilters.includes("vegan")) {
      // These recipes all contain meat/fish/eggs — would need veg recipes
      const meatCategories = r.ingredients.some(
        (i) => i.category === "protein" && !["whey protein powder"].includes(i.name.toLowerCase())
      );
      const hasMeat = r.ingredients.some((i) => {
        const n = i.name.toLowerCase();
        return (
          n.includes("chicken") || n.includes("turkey") || n.includes("steak") ||
          n.includes("salmon") || n.includes("tuna") || n.includes("sirloin") ||
          n.includes("mince")
        );
      });
      if (hasMeat) return false;
      if (lowerFilters.includes("vegan")) {
        const hasAnimal = r.ingredients.some((i) => {
          const n = i.name.toLowerCase();
          return n.includes("egg") || n.includes("whey") || n.includes("dairy") || n.includes("butter") || n.includes("milk");
        });
        if (hasAnimal) return false;
      }
    }
    if (lowerFilters.includes("halal")) {
      // No pork in current library; all halal-compatible
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
        return n.includes("pasta") || n.includes("bread") || n.includes("flour") && !n.includes("oat");
      });
      if (hasGluten) return false;
    }

    // Allergen checks
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

function scaleRecipe(
  recipe: Recipe,
  targetProtein: number,
  targetCarbs: number
): { meal: any; actualMacros: { protein: number; carbs: number; fat: number; calories: number } } {
  const base = baseMacros(recipe);
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
    const { display_quantity, display_unit } = toDisplayUnits(ing.name, grams);
    return {
      name: ing.name,
      amount_grams: grams,
      raw_or_cooked: ing.raw_or_cooked,
      category: ing.category,
      display_quantity,
      display_unit,
    };
  });

  // Recalculate actual macros from scaled ingredients
  let p = 0, c = 0, f = 0;
  for (let idx = 0; idx < recipe.ingredients.length; idx++) {
    const orig = recipe.ingredients[idx];
    const scaled = scaledIngredients[idx];
    const factor = scaled.amount_grams / 100;
    p += orig.p_per100 * factor;
    c += orig.c_per100 * factor;
    f += orig.f_per100 * factor;
  }

  p = Math.round(p);
  c = Math.round(c);
  f = Math.round(f);
  const cal = p * 4 + c * 4 + f * 9;

  return {
    meal: {
      slot: recipe.slot,
      name: recipe.name,
      calories: cal,
      protein_g: p,
      carb_g: c,
      fat_g: f,
      cook_time_minutes: recipe.cook_time_minutes,
      ingredients: scaledIngredients,
      steps: recipe.steps,
    },
    actualMacros: { protein: p, carbs: c, fat: f, calories: cal },
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

    const primaryGoal = (onb.primary_goals || [])[0] || "athletic";
    const goalAdjustment = GOAL_ADJUSTMENTS[primaryGoal] ?? 0;
    let calorieTarget = tdee + goalAdjustment;
    if (calorieTarget < tdee - 1200) calorieTarget = tdee - 1200;
    if (calorieTarget < 1200) calorieTarget = 1200;

    const { proteinG, fatG, carbG } = calculateMacros(onb.weight_kg, calorieTarget);

    // Upsert nutrition profile
    const mCount = mealsPerDay || 3;
    const { error: profileErr } = await supabase
      .from("nutrition_profiles")
      .upsert(
        {
          user_id: user.id,
          bmr, tdee,
          calorie_target: calorieTarget,
          protein_g: proteinG, fat_g: fatG, carb_g: carbG,
          meals_per_day: mCount,
          dietary_filters: dietaryFilters || [],
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (profileErr) throw new Error(`Profile save failed: ${profileErr.message}`);

    // ── Filter recipes ──
    const allFilters = [...(dietaryFilters || []), ...(onb.dietary_choices || [])];
    const allergyText = [onb.allergies, onb.sensitivities].filter(Boolean).join(", ");

    const available = filterRecipes(RECIPE_LIBRARY, allFilters, allergyText);
    const breakfasts = available.filter((r) => r.slot === "breakfast");
    const lunches = available.filter((r) => r.slot === "lunch");
    const dinners = available.filter((r) => r.slot === "dinner");

    if (breakfasts.length === 0 && mCount >= 1) throw new Error("No breakfast recipes match your filters. Please adjust dietary preferences.");
    if (lunches.length === 0 && mCount >= 2) throw new Error("No lunch recipes match your filters. Please adjust dietary preferences.");
    if (dinners.length === 0 && mCount >= 3) throw new Error("No dinner recipes match your filters. Please adjust dietary preferences.");

    // ── Build meal slots & distribute macros ──
    const mealSlots: string[] = [];
    if (mCount >= 2) mealSlots.push("breakfast", "lunch");
    if (mCount >= 3) mealSlots.push("dinner");
    if (mCount >= 4) mealSlots.push("meal_4");
    if (mCount >= 5) mealSlots.push("meal_5");

    // Extra meals get 15% share, main meals split the rest equally
    const extraCount = mealSlots.filter((s) => s.startsWith("meal_")).length;
    const mainCount = mealSlots.length - extraCount;
    const extraShare = 0.15;
    const mainShare = mainCount > 0 ? (1 - extraShare * extraCount) / mainCount : 0;

    const slotTargets: Record<string, { protein: number; carbs: number; fat: number; calories: number }> = {};
    for (const slot of mealSlots) {
      const share = slot.startsWith("meal_") ? extraShare : mainShare;
      slotTargets[slot] = {
        protein: Math.round(proteinG * share),
        carbs: Math.round(carbG * share),
        fat: Math.round(fatG * share),
        calories: Math.round(calorieTarget * share),
      };
    }

    // ── Build 7-day plan ──
    const extraPool = [...lunches, ...dinners];
    const days: any[] = [];

    for (let day = 1; day <= 7; day++) {
      const meals: any[] = [];

      for (const slot of mealSlots) {
        let recipe: Recipe;
        if (slot === "breakfast") {
          recipe = breakfasts[(day - 1) % breakfasts.length];
        } else if (slot === "lunch") {
          recipe = lunches[(day - 1) % lunches.length];
        } else if (slot === "dinner") {
          recipe = dinners[(day - 1) % dinners.length];
        } else {
          // meal_4, meal_5 — pick from pool avoiding same-day duplicates
          const usedNames = meals.map((m) => m.name);
          const candidates = extraPool.filter((r) => !usedNames.includes(r.name));
          const poolIndex = slot === "meal_4" ? (day - 1) % candidates.length : (day) % candidates.length;
          recipe = candidates.length > 0 ? candidates[poolIndex % candidates.length] : extraPool[(day - 1) % extraPool.length];
        }

        const target = slotTargets[slot];
        const { meal } = scaleRecipe(recipe, target.protein, target.carbs);
        meal.slot = slot;
        meals.push(meal);
      }

      // ── Daily macro validation ──
      const dayTotals = meals.reduce(
        (acc: any, m: any) => ({
          protein: acc.protein + m.protein_g,
          carbs: acc.carbs + m.carb_g,
          fat: acc.fat + m.fat_g,
          calories: acc.calories + m.calories,
        }),
        { protein: 0, carbs: 0, fat: 0, calories: 0 }
      );

      // Check if off by more than 5%, adjust largest main meal
      const proteinOff = Math.abs(dayTotals.protein - proteinG) / proteinG;
      const carbOff = Math.abs(dayTotals.carbs - carbG) / carbG;

      if (proteinOff > 0.05 || carbOff > 0.05) {
        // Find the largest main meal to adjust
        const mainMeals = meals.filter((m: any) => !m.slot.startsWith("meal_"));
        const largest = mainMeals.reduce((a: any, b: any) => (a.calories > b.calories ? a : b), mainMeals[0]);
        const lIdx = meals.indexOf(largest);

        if (lIdx >= 0) {
          const proteinDiff = proteinG - dayTotals.protein;
          const carbDiff = carbG - dayTotals.carbs;

          // Find the recipe to re-scale
          const lSlot = largest.slot;
          let lRecipe: Recipe;
          if (lSlot === "breakfast") lRecipe = breakfasts[(day - 1) % breakfasts.length];
          else if (lSlot === "lunch") lRecipe = lunches[(day - 1) % lunches.length];
          else lRecipe = dinners[(day - 1) % dinners.length];

          const newTarget = {
            protein: slotTargets[lSlot].protein + proteinDiff,
            carbs: slotTargets[lSlot].carbs + carbDiff,
          };

          const { meal: adjusted } = scaleRecipe(lRecipe, newTarget.protein, newTarget.carbs);
          adjusted.slot = lSlot;
          meals[lIdx] = adjusted;
        }
      }

      days.push({ day, meals });
    }

    const planData = { days };

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
