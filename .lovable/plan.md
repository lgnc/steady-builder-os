

# Phase 1 Nutrition & Meal Planning System

## Overview

Build a full nutrition planner that calculates daily calorie/macro targets from onboarding data and generates AI-powered weekly meal plans with recipes, swapping, shopping lists, and compliance tracking.

---

## 1. Onboarding Changes

### Add age to the Body & Nutrition step (step 10)

Add a "Date of Birth" or "Age" number input to `NutritionStep.tsx`. Store as a new `age` integer column on the `onboarding_data` table. Save it during `completeOnboarding()`.

### Map existing goals to calorie adjustments

No new goal options needed. The existing primary goals map as follows:
- `fat_loss` -> -500 kcal deficit
- `recomposition` -> -250 kcal deficit
- `muscle_gain` -> +300 kcal surplus
- `athletic` -> maintenance (0 adjustment)

This mapping lives in the backend edge function logic, not in the database.

---

## 2. Database Schema

### New tables

**`nutrition_profiles`** -- Stores calculated targets per user

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| user_id | uuid | Not null, unique |
| bmr | integer | Calculated BMR |
| tdee | integer | BMR x activity multiplier |
| calorie_target | integer | TDEE + goal adjustment |
| protein_g | integer | 1.6-2.2 g/kg |
| fat_g | integer | 20-30% of calories |
| carb_g | integer | Remainder |
| meals_per_day | integer | 2-5 |
| dietary_filters | text[] | halal, dairy-free, etc. |
| generated_at | timestamptz | When targets were last calculated |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now() |

**`meal_plans`** -- Weekly plan container

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | Not null |
| week_start | date | Monday of the plan week |
| plan_data | jsonb | Full plan (meals, recipes, macros per meal) |
| compliance_score | numeric | 0-100 weekly score |
| created_at | timestamptz | |
| expires_at | timestamptz | 8 weeks after creation |

**`meal_completions`** -- Tracks which meals were followed

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | Not null |
| meal_plan_id | uuid | FK to meal_plans |
| meal_date | date | |
| meal_slot | text | breakfast, lunch, dinner, snack |
| completed | boolean | Default false |
| created_at | timestamptz | |

**`favourite_meals`** -- Saved recipes

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | Not null |
| meal_data | jsonb | Full recipe data |
| meal_slot | text | breakfast, lunch, dinner, snack |
| created_at | timestamptz | |

All tables get RLS policies: users can only access their own rows.

### Modify existing table

Add `age` column (integer, nullable) to `onboarding_data`.

---

## 3. Edge Functions

### `generate-nutrition-plan`

A backend function that:

1. Fetches user's onboarding data (age, gender, height, weight, activity level, primary goals, dietary choices, allergies, sensitivities)
2. Calculates BMR using Harris-Benedict:
   - Male: 88.362 + (13.397 x weight_kg) + (4.799 x height_cm) - (5.677 x age)
   - Female: 447.593 + (9.247 x weight_kg) + (3.098 x height_cm) - (4.330 x age)
3. Applies activity multiplier (sedentary 1.2, light 1.375, moderate 1.55, very_active 1.725)
4. Applies goal adjustment (fat_loss -500, recomposition -250, muscle_gain +300, athletic 0)
5. Enforces guardrails (deficit cannot exceed 1200 kcal/day below TDEE, protein 1.6-2.2 g/kg, fat 20-30%)
6. Saves targets to `nutrition_profiles`
7. Calls Lovable AI to generate the weekly meal plan with recipe variety rules (2 breakfast, 3 lunch, 4 dinner options)
8. Returns the full plan

Uses tool calling to get structured JSON output from the AI model -- recipe names, ingredients with gram weights (raw vs cooked noted), macros per serving, cooking steps.

### `swap-meal`

A backend function that:
1. Takes current meal slot + day
2. Calls AI to generate an alternative recipe within +/-5% of the original meal's macros
3. Respects dietary filters and allergies
4. Returns the new meal and updates the plan_data in `meal_plans`

---

## 4. Frontend -- Nutrition Page

Replace the current placeholder with a multi-view nutrition hub.

### First-time setup flow (shown if no `nutrition_profiles` row exists)

1. **Meal count selector** -- Pick 2-5 meals per day
2. **Dietary filters** -- Toggle: Vegetarian, Vegan, Halal, Dairy-free, Gluten-free (pre-populated from onboarding dietary choices)
3. **Allergies confirmation** -- Show existing allergies from onboarding, allow edits
4. **"Generate My Plan" button** -- Calls the edge function, shows loading state

### Main views (after plan exists)

**Daily View (primary)**
- Date selector (today highlighted)
- For each meal slot (Breakfast, Lunch, Dinner, Snacks):
  - Meal name
  - Calorie + macro summary (P/C/F in grams)
  - Tap to expand: full recipe with ingredients, cooking steps, timing
  - Checkbox to mark as "followed"
  - Swap button (generates alternative)
  - Favourite heart icon
- Daily macro summary bar at top (calories, protein, carbs, fat vs targets)

**Weekly Overview (secondary tab)**
- 7-day grid showing compliance per day (checkmark or X)
- Weekly nutrition compliance score (% of meals followed)
- "Shopping List" button

**Shopping List (sheet/modal)**
- Auto-generated from current week's plan
- Grouped by category (Protein, Vegetables, Grains, Dairy, Other)
- All weights in grams
- Raw vs cooked clearly marked
- Checkbox to tick off items

### Paywalled features
- When user taps "Food dislikes", "Cuisine preferences", or "Advanced personalisation", show an upgrade modal explaining these are Pro features.

---

## 5. File Structure

### New files

| File | Purpose |
|---|---|
| `supabase/functions/generate-nutrition-plan/index.ts` | BMR/macro calculation + AI meal plan generation |
| `supabase/functions/swap-meal/index.ts` | AI-powered meal swap within macro constraints |
| `src/pages/Nutrition.tsx` | Complete rewrite: setup flow + daily/weekly views |
| `src/components/nutrition/NutritionSetup.tsx` | First-time setup (meal count, filters) |
| `src/components/nutrition/DailyPlanView.tsx` | Daily meal list with expand/swap/complete |
| `src/components/nutrition/WeeklyOverview.tsx` | Compliance grid + shopping list trigger |
| `src/components/nutrition/MealCard.tsx` | Individual meal component (expandable recipe) |
| `src/components/nutrition/ShoppingListSheet.tsx` | Aggregated shopping list |
| `src/components/nutrition/MacroSummary.tsx` | Daily macro progress bars (cal/P/C/F) |
| `src/components/nutrition/SwapMealSheet.tsx` | Loading + result for meal swap |
| `src/components/nutrition/UpgradeModal.tsx` | Pro feature paywall modal |

### Modified files

| File | Change |
|---|---|
| `src/components/onboarding/NutritionStep.tsx` | Add age input field |
| `src/pages/Onboarding.tsx` | Save age to onboarding_data on completion |

---

## 6. Implementation Sequence

1. Database migration: add `age` column + create 4 new tables with RLS
2. Update onboarding to collect and save age
3. Build `generate-nutrition-plan` edge function (BMR calc + AI recipe generation)
4. Build `swap-meal` edge function
5. Build the Nutrition page setup flow
6. Build the daily plan view with meal cards
7. Build the weekly overview + shopping list
8. Add compliance tracking (meal checkboxes + weekly score)
9. Add favourites support
10. Add upgrade modal for paywalled filters

---

## 7. Key Technical Decisions

- **Plan storage**: Full plan stored as JSONB in `meal_plans.plan_data` rather than normalised recipe tables. This keeps the schema simple and avoids complex joins. Each meal entry in the JSON includes: name, ingredients (with gram weights, raw/cooked flag), macros, cooking time, steps.

- **AI model**: Uses `google/gemini-3-flash-preview` via Lovable AI for recipe generation. Tool calling enforces structured JSON output so recipes always include required fields.

- **Compliance score**: Calculated client-side as (completed meals / total meals) x 100 for the week, then saved to `meal_plans.compliance_score`.

- **8-week regeneration**: The plan has an `expires_at` timestamp. When the user opens the Nutrition page and the plan is expired, they see a prompt to regenerate. No automatic regeneration.

- **Macro guardrails**: All enforced server-side in the edge function before AI generation. The AI prompt includes the exact calorie and macro targets per meal slot.

