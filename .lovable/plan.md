

# Dashboard Quick Actions + Nutrition Progress

Replace the single "Dynamic Primary Action" CTA button with two stacked quick-action buttons and a compact nutrition progress indicator.

---

## 1. Remove Current Primary CTA

Delete the `nextAction` useMemo block (lines ~315-362) and the motion.div rendering the hero button (lines ~456-475). Remove unused imports if any become orphaned.

---

## 2. Add Two Quick Action Buttons

Insert two full-width buttons between the progress tiles section and the Daily Habits section, wrapped in a single motion.div with `space-y-2`.

### Button A: Ritual Button (time-based)

- **Before 5:00 PM** (hour < 17): label = "Morning Journal", icon = Sun
- **5:00 PM onward** (hour >= 17): label = "Evening Journal", icon = Moon
- **Completed state**: If the corresponding routine (`morning_routine` before 5pm, `evening_routine` from 5pm) is completed for the selected date, show label + " ✓" with muted styling (non-primary variant)
- **On tap**: Opens the routine checklist sheet (`setRoutineSheetType` + `setRoutineSheetOpen(true)`) -- reuses existing logic from `handleAnchorClick`
- **Date-aware**: Uses `selectedDate` and `anchorCompletions` which already update on date navigation
- **Future dates**: Disabled

### Button B: Training Button (schedule-based)

Uses existing state: `todayBlocks` (has a training block?) and `anchorCompletions.training`.

| Condition | Label | Style | Action |
|---|---|---|---|
| Training day, not completed | Start Today's Training | Primary | Open training sheet or navigate to /training |
| Training day, completed | Training Complete ✓ | Muted/disabled | No action |
| Rest day (no training block) | Rest Day | Disabled, greyed out | None |

Rest day shows small subtext: "Recovery is the work."

Both buttons use the existing `Button` component with appropriate variants (`default` for active, `outline` or `secondary` for completed/rest states).

---

## 3. Add Nutrition Progress Indicator

### Data Fetching

The Dashboard already fetches the meal plan and computes `nutritionCounts` (total meals, completed meals). Extend this to also compute consumed calories and protein from completed meals.

Add new state:
```text
nutritionProgress: { 
  consumedCalories: number; 
  consumedProtein: number; 
  targetCalories: number; 
  targetProtein: number; 
}
```

In the existing `fetchData` useEffect (where meal plan is already loaded), after getting `todayMeals` and `mealCompletions`:
- Sum `calories` and `protein_g` from completed meals
- Fetch `nutrition_profiles` for `calorie_target` and `protein_g` targets
- Set the new state

### UI

A compact single section below the two buttons, before Daily Habits:

```text
Nutrition
Calories: 1,200 / 2,400 kcal  |  Protein: 90g / 180g
```

Two inline text items, small font (`text-xs`), muted color. No progress bars, no macro breakdown -- just two numbers. Wrapped in a subtle card-stat container to match the progress tiles style.

If no nutrition plan exists, hide this section entirely (don't show zeros with no context).

---

## Files Changed

| File | Action |
|---|---|
| `src/pages/Dashboard.tsx` | Remove nextAction useMemo + hero button; add ritual + training buttons; add nutrition progress state + UI |

No new files or components. All changes contained in Dashboard.tsx.

---

## Technical Notes

- The 5:00 PM cutoff uses `currentTime.getHours() >= 17` which already updates every 60 seconds
- Completion detection for morning/evening routines already exists in `anchorCompletions`
- Training day detection already exists via `todayBlocks.some(b => b.block_type === "training")`
- Nutrition profile fetch is one additional query but can be parallelized with existing fetches
- All buttons respect date navigation -- they read from `selectedDate`-dependent state
