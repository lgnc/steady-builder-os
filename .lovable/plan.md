

# Fix: Nutrition Calendar Showing Stale Week

## Problem

The Nutrition tab's day selector always shows the week from when the meal plan was generated (Feb 9). It uses `plan.week_start` (a static stored date) instead of the current week's dates.

The meal plan data has 7 generic days (day 1-7) with meals. These should map to whatever the current week is, not the original generation week.

## Fix

In `src/pages/Nutrition.tsx`, replace the static `plan.week_start` with the current week's Monday date computed via `getWeekStartDate(new Date())`.

This affects two places where `weekStart` is passed:
1. `DailyPlanView` (line 291) -- controls the day selector dates
2. `WeeklyOverview` (line 307) -- controls the weekly overview dates

### Change in `src/pages/Nutrition.tsx`

```text
// Add import
import { getWeekStartDate } from "@/lib/weekUtils";

// Compute current week start
const currentWeekStart = getWeekStartDate(new Date());

// Pass currentWeekStart instead of plan.week_start to both components
<DailyPlanView weekStart={currentWeekStart} ... />
<WeeklyOverview weekStart={currentWeekStart} ... />
```

## Files Changed

| File | Change |
|---|---|
| `src/pages/Nutrition.tsx` | Import `getWeekStartDate`, pass current week's Monday instead of `plan.week_start` |

## What This Fixes

- Day selector shows current week dates (Feb 16-22 this week)
- "Today" highlight works correctly
- Meal completions are dated to the correct current dates
- Next week the dates will automatically advance

