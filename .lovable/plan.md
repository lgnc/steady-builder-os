

# Fix: TrainingBlockSheet Always Passes Today's Date

## Root Cause

When you navigate to Feb 23 on the Dashboard and click "Start Workout," the `TrainingBlockSheet` component hardcodes `new Date()` (today = Feb 17) as the date parameter:

```text
const today = new Date().toISOString().split("T")[0];  // always "2026-02-17"
navigate(`/workout/${block.training_day_id}?date=${today}`);
```

This means `Workout.tsx` computes `weekStartDate = 2026-02-16` (this week's Monday) and loads this week's logs -- showing pre-filled data instead of a blank session.

The same bug exists in `Training.tsx`, which also hardcodes `new Date()`.

## Fix

### 1. `TrainingBlockSheet.tsx`

Accept a `selectedDate` prop (string, "YYYY-MM-DD") and use it instead of `new Date()`:

```text
// Before:
const today = new Date().toISOString().split("T")[0];
navigate(`/workout/${block.training_day_id}?date=${today}`);

// After:
navigate(`/workout/${block.training_day_id}?date=${selectedDate}`);
```

### 2. `Dashboard.tsx`

Pass the currently selected date from Dashboard to TrainingBlockSheet as a prop. The Dashboard already has `selectedDate` state -- format it as "YYYY-MM-DD" and thread it through.

### 3. `Training.tsx`

Change the hardcoded `new Date()` to use a properly computed date. Since Training.tsx shows "today's" program, this can stay as `format(new Date(), "yyyy-MM-dd")` -- but if we want consistency, pass the correct date context.

## Files Changed

| File | Change |
|---|---|
| `src/components/calendar/TrainingBlockSheet.tsx` | Add `selectedDate` prop; use it in navigation URL instead of `new Date()` |
| `src/pages/Dashboard.tsx` | Pass formatted `selectedDate` to `TrainingBlockSheet` |
| `src/pages/Training.tsx` | No change needed (it correctly shows today's program only) |

## What This Fixes

- Navigating to Feb 23 on Dashboard and clicking "Start Workout" will pass `?date=2026-02-23`, computing `weekStartDate = 2026-02-23`, which finds zero logs -- showing a blank workout
- Current week's workout remains unaffected
- Historical data preserved

