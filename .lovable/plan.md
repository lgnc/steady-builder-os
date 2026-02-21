

# Add Weekly Progress Bar to Nutrition Page

## What You'll See

Between the Daily/Weekly tabs and the day selector, a compact progress bar showing your weekly meal compliance. It will display something like:

**"57% -- 12 of 21 meals"** with a colour-coded bar:
- Red (below 50%)
- Amber (50-79%)
- Green (80%+)

## Week Range Change: Sunday to Saturday

Currently the nutrition week runs Monday to Sunday. We'll change it to **Sunday to Saturday** across the entire Nutrition feature -- the day selector, weekly overview, and the new progress bar will all use this range.

## Changes

### 1. Update `src/lib/weekUtils.ts`
- Add a new function `getSundayWeekStartDate()` that returns the Sunday start of the current week (using `weekStartsOn: 0`).
- The existing `getWeekStartDate()` (Monday-based) stays untouched for other features like workouts.

### 2. Create `src/components/nutrition/WeeklyProgressBar.tsx` (new file)
A small component that:
- Takes `planData`, `weekStart`, and `completions` as props
- Counts total meals across all 7 days and how many are completed
- Computes percentage
- Renders a slim progress bar with colour thresholds:
  - Below 50%: red/destructive
  - 50-79%: amber/warning
  - 80%+: green/primary
- Shows label: "57% -- 12 of 21 meals"

### 3. Update `src/pages/Nutrition.tsx`
- Import the new `WeeklyProgressBar` component
- Switch from `getWeekStartDate` (Monday) to `getSundayWeekStartDate` (Sunday) for the nutrition-specific week start
- Place the progress bar between the tabs (line 287) and the content (line 289)

### 4. Update `src/components/nutrition/DailyPlanView.tsx`
- Change `startOfWeek` call to use `weekStartsOn: 0` (Sunday) so the day selector runs Sun-Sat

### 5. Update `src/components/nutrition/WeeklyOverview.tsx`
- Change `startOfWeek` call to use `weekStartsOn: 0` (Sunday) so the weekly grid runs Sun-Sat

## Technical Notes

| File | Change |
|---|---|
| `src/lib/weekUtils.ts` | Add `getSundayWeekStartDate()` |
| `src/components/nutrition/WeeklyProgressBar.tsx` | New component -- progress bar with colour thresholds |
| `src/pages/Nutrition.tsx` | Import progress bar, use Sunday-based week start, render bar between tabs and content |
| `src/components/nutrition/DailyPlanView.tsx` | `weekStartsOn: 0` for Sunday start |
| `src/components/nutrition/WeeklyOverview.tsx` | `weekStartsOn: 0` for Sunday start |
