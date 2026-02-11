

# Add Nutrition to Daily Completion %

## What Changes

Add today's meal completion status to the daily progress bar calculation. If the user has an active meal plan, each meal scheduled for today counts as a completable item.

## How It Works

In `Dashboard.tsx`'s `fetchData`:

1. Query `meal_plans` for the user's latest active plan (not expired)
2. If a plan exists, extract today's meals from `plan_data.days` (matching today's day index within the week)
3. Query `meal_completions` for today's date filtered to that plan
4. Store the counts: total meals today and completed meals today

In `getDailyCompletion`:

- Add nutrition meal counts (total and completed) alongside habits, training, and morning routine

## Technical Detail

### State additions in `Dashboard.tsx`

```typescript
const [nutritionCounts, setNutritionCounts] = useState({ total: 0, completed: 0 });
```

### In the existing `fetchData` effect, add after the reading query:

- Fetch the latest non-expired `meal_plans` row
- If a plan exists, determine today's day index relative to `week_start` (same logic as `DailyPlanView`)
- Count total meals for that day from `plan_data.days`
- Fetch `meal_completions` for today's date and that plan, count completed
- Set `nutritionCounts`

### In `getDailyCompletion`, add:

```typescript
total += nutritionCounts.total;
completed += nutritionCounts.completed;
```

## Files Modified

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Add `nutritionCounts` state; fetch meal plan + completions in `fetchData`; include in `getDailyCompletion` |

No database changes needed.

