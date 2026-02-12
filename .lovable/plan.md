

# Nutrition System Accuracy Refinement

This plan replaces the AI-generated meal system with a fixed recipe library, adds server-side macro validation, and refines the Pro upsell. No UI redesign.

---

## 1. Fixed Recipe Library (Edge Function)

Replace the AI prompt-based meal generation with a hardcoded library of 8 classic bodybuilding recipes inside `generate-nutrition-plan/index.ts`.

### Recipe Library Structure

Each recipe has a **base serving** with exact macros, **scalable ingredients** (protein + carb sources), and **fixed ingredients** (vegetables, fats, seasoning). Each also carries dietary and allergen tags for filtering.

| Slot | Recipe | Base Calories | P | C | F | Tags |
|---|---|---|---|---|---|---|
| Breakfast | Scrambled Eggs and Oats | ~450 | 30g | 45g | 15g | gluten-free(oats vary) |
| Breakfast | Protein Pancakes | ~420 | 35g | 40g | 12g | |
| Lunch | Chicken Breast, Rice and Broccoli | ~520 | 45g | 50g | 10g | gluten-free, dairy-free |
| Lunch | Turkey Mince Bolognese with Pasta | ~530 | 42g | 55g | 12g | dairy-free |
| Lunch | Tuna and Sweet Potato | ~480 | 44g | 48g | 8g | gluten-free, dairy-free |
| Dinner | Salmon, Sweet Potato and Asparagus | ~550 | 40g | 42g | 20g | gluten-free, dairy-free |
| Dinner | Steak, Rice and Mixed Vegetables | ~580 | 45g | 48g | 18g | gluten-free, dairy-free |
| Dinner | Chicken Stir-Fry with Rice | ~510 | 42g | 50g | 12g | gluten-free, dairy-free |

Exact ingredient lists with gram weights (raw), categories, and which are scalable will be hardcoded in the function.

### Portion Scaling Logic

1. Calculate per-meal macro targets (distribute daily targets across meal slots)
2. For each recipe assigned to a slot, compute a **protein scale factor** (`target_protein / base_protein`) and a **carb scale factor** (`target_carbs / base_carbs`)
3. Scale only protein-source and carb-source ingredient grams by their respective factors
4. Recalculate actual macros from scaled ingredients
5. Keep vegetables, fats, and seasoning quantities fixed

### Macro Validation

After building each day's meals:
- Sum all meal macros for the day
- Compare against daily targets
- If any macro is off by more than 5%, adjust the largest meal's protein/carb portions to close the gap
- Verify `calories = (protein * 4) + (carbs * 4) + (fat * 9)` for each meal

### 7-Day Rotation

- 2 breakfasts rotate (A-B-A-B-A-B-A)
- 3 lunches rotate (A-B-C-A-B-C-A)
- 3 dinners rotate (A-B-C-A-B-C-A)
- For 4-5 meals/day: extra slots draw from the lunch/dinner pool (different recipe than that day's main lunch/dinner), scaled to a smaller portion

### Recipe Filtering

Before building the plan, filter the library:
- Remove recipes that conflict with user's `dietary_choices` (vegetarian, vegan, halal)
- Remove recipes containing ingredients matching `allergies` or `sensitivities`
- If fewer than the minimum recipes remain for a slot after filtering, return an error asking the user to adjust their filters

---

## 2. Swap Meal (Edge Function)

Update `swap-meal/index.ts` to use the same fixed library:

- When user swaps a meal, pick the next unused recipe from the same slot's pool
- Scale it to the same macro targets as the original
- No AI call needed -- deterministic swap
- If all recipes for that slot have been used in the current week, cycle back to the first

---

## 3. Remove Snack Slots

### Edge function changes
- Remove `snack_1` and `snack_2` from slot generation
- For 4 meals: use `breakfast`, `lunch`, `dinner`, `meal_4`
- For 5 meals: add `meal_5`
- `meal_4` and `meal_5` draw from the lunch/dinner recipe pool with smaller portions

### Frontend changes (`NutritionSetup.tsx`)
- Keep the 2-5 selector as-is
- Update the description text:
  - 2: "Breakfast + Lunch"
  - 3: "Breakfast + Lunch + Dinner"
  - 4: "Breakfast + Lunch + Dinner + Extra Meal"
  - 5: "Breakfast + Lunch + Dinner + 2 Extra Meals"

### MealCard slot labels (`MealCard.tsx`)
- Add labels for `meal_4` ("Meal 4") and `meal_5` ("Meal 5")
- Remove `snack_1` and `snack_2` labels

---

## 4. Weekly Compliance Logic Verification

The current compliance calculation in `WeeklyOverview.tsx` already uses dynamic meal counts:
```
totalMeals = sum of all meals across 7 days
compliance = totalCompleted / totalMeals * 100
```

This is already correct -- it counts actual meals in the plan, not a hardcoded number. No code change needed, but I will verify the `DailyPlanView` consumed macro calculation also works correctly with the new slot names.

---

## 5. Pro Upsell Refinement

### Current state
- Settings gear icon in the Nutrition header opens an `UpgradeModal`
- Swap button is freely available on each `MealCard`

### Changes to `MealCard.tsx`
- Add a subtle "Customise" button with a lock icon below the swap button
- Tapping it opens the existing `UpgradeModal` with feature text "Customise Meals"
- Keep swap button free and unlocked

### Changes to `Nutrition.tsx`
- Replace the settings gear with a more visible "Customise Plan" button
- Style: outline button with lock icon and text "Customise Plan -- Pro"
- Small muted text below: "Customise meals in Pro."
- Still triggers the same `UpgradeModal`

---

## Files Changed

| File | Action |
|---|---|
| `supabase/functions/generate-nutrition-plan/index.ts` | Major rewrite -- fixed library, scaling, validation |
| `supabase/functions/swap-meal/index.ts` | Rewrite -- deterministic swap from library |
| `src/components/nutrition/NutritionSetup.tsx` | Update meal count descriptions |
| `src/components/nutrition/MealCard.tsx` | Add slot labels, add Pro customise button |
| `src/pages/Nutrition.tsx` | Update Pro upsell button visibility |
| `src/components/nutrition/DailyPlanView.tsx` | No changes expected (verify compatibility) |
| `src/components/nutrition/WeeklyOverview.tsx` | No changes expected (verify compliance logic) |

---

## Technical Notes

- No AI API calls for plan generation -- entirely deterministic. Faster, cheaper, and guaranteed macro accuracy.
- AI is still NOT used for swap -- swaps cycle through the fixed pool.
- Recipe data is embedded in the edge function code, not in a database table. This keeps it simple for MVP and avoids migration complexity.
- The `plan_data` JSON structure stored in `meal_plans` remains the same (days array with meals), so all existing frontend components work without changes.
- Existing meal plans in the database are unaffected. New plans use the fixed library.

