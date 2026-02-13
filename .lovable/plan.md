

# Ingredient Unit Formatting

Add human-readable display units (eggs, scoops, pieces) to ingredient output while keeping gram-based macro calculations unchanged.

---

## Approach

Add a unit mapping table and a conversion function to both edge functions (`generate-nutrition-plan` and `swap-meal`). After scaling ingredients by grams (macro math stays the same), compute `display_quantity` and `display_unit` for each ingredient. The frontend reads these new fields with a gram fallback.

---

## 1. Unit Mapping (Edge Functions)

Add a `UNIT_MAP` lookup keyed by ingredient name substring:

| Ingredient match | Unit | Grams per unit |
|---|---|---|
| "egg" | "eggs" | 60 |
| "whey protein" | "scoops" | 30 |
| "banana" | "banana" | 120 |
| "coconut oil spray" | "spray" | 5 |

All other ingredients default to grams (`display_unit = "g"`).

Add a helper function `toDisplayUnits(name, grams)`:
- Look up ingredient name in `UNIT_MAP`
- Calculate `display_quantity = grams / grams_per_unit`, rounded to nearest 0.5 (minimum 0.5)
- For gram-based items: `display_quantity = grams`, `display_unit = "g"`

---

## 2. Edge Function Changes

### `generate-nutrition-plan/index.ts`

In the `scaleRecipe` function, after computing scaled grams, add `display_quantity` and `display_unit` to each ingredient object in the output:

```text
Current output per ingredient:
  { name, amount_grams, raw_or_cooked, category }

New output per ingredient:
  { name, amount_grams, raw_or_cooked, category, display_quantity, display_unit }
```

No changes to macro calculation logic -- `amount_grams` remains the source of truth.

### `swap-meal/index.ts`

Same change in its `scaleRecipe` function (identical structure).

---

## 3. Frontend Changes

### `MealCard.tsx`

Update the `Ingredient` interface:

```text
interface Ingredient {
  name: string;
  amount_grams: number;
  raw_or_cooked: "raw" | "cooked";
  category: string;
  display_quantity?: number;
  display_unit?: string;
}
```

Update the ingredient display line (currently `{ing.amount_grams}g`) to:

- If `display_unit` exists and is not `"g"`: show `{display_quantity} {display_unit}`
- Otherwise: show `{amount_grams}g`

Keep the `(raw/cooked)` indicator for gram-based items only.

---

## 4. Shopping List

Check `ShoppingListSheet.tsx` for ingredient rendering -- apply the same display logic there if it renders ingredient quantities.

---

## Files Changed

| File | Action |
|---|---|
| `supabase/functions/generate-nutrition-plan/index.ts` | Add UNIT_MAP + toDisplayUnits helper, update scaleRecipe output |
| `supabase/functions/swap-meal/index.ts` | Same UNIT_MAP + toDisplayUnits, update scaleRecipe output |
| `src/components/nutrition/MealCard.tsx` | Update Ingredient interface + display logic |
| `src/components/nutrition/ShoppingListSheet.tsx` | Update display if it renders quantities |

---

## Technical Notes

- No database migration needed -- display fields are computed at generation time and stored in the `plan_data` JSON
- Existing meal plans will not have display fields; the frontend gracefully falls back to grams
- Macro calculations remain 100% gram-based; display units are presentation only
- The UNIT_MAP is intentionally small and conservative -- only items where gram display is clearly wrong
