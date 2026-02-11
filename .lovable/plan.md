

# Dashboard MVP Refinement

## Overview

Clean up the Today dashboard to be scannable in under 5 seconds. No navigation or layout system changes -- just streamlining sections within the existing page.

---

## 1. Replace Streaks Section with Daily Completion + 2 Streaks

**Remove**: The current streaks section that renders ALL streak types from the database (strategy, routine, morning_routine, etc.).

**Replace with** a new section containing three items in a single row:

| Item | Source | Display |
|---|---|---|
| Daily Completion % | Calculated client-side | "Today: XX%" with a horizontal progress bar beneath |
| Training Streak | `streaks` table, `streak_type = 'training'` | Flame icon + number + "Training" |
| Morning Routine Streak | `streaks` table, `streak_type = 'morning_routine'` | Flame icon + number + "Morning" |

**Daily Completion % calculation:**
- Count completable items for today:
  - Daily habits (from `habits` table, active ones)
  - Training (if a training block is scheduled today)
  - Morning routine (if morning_routine anchor exists today)
- Count completed items:
  - Habits completed today (from `habit_completions`)
  - Training completed (from `anchorCompletions.training`)
  - Morning routine completed (from `anchorCompletions.morning_routine`)
- Evening reflection and weight are NOT counted (optional)
- Percentage = (completed / total) x 100

The progress bar uses the existing `ProgressBar` component from `src/components/ui/progress-bar.tsx`.

---

## 2. Increase Quote Font Size

Change the daily quote text from `text-xs` to `text-sm` and the author attribution from `text-[11px]` to `text-xs`. Keeps the italic, right-aligned styling -- just slightly more readable.

---

## 3. Daily Habits -- No Changes Needed

The current implementation already uses emerald for "build" habits and rose for "break" habits, with clean spacing. No modifications required.

---

## 4. Weight Tracker Visual Cleanup

Minor styling refinements to `DailyWeightTracker.tsx`:
- Reduce input field width slightly (`w-16` instead of `w-20`)
- Make the separator between habits and weight more subtle (lighter border, less padding)
- Keep the same functionality -- just less visual weight

---

## 5. Today's Anchors -- Remove Strategy

Update the `ANCHOR_TYPES` and `ANCHOR_CONFIG` arrays to remove `"strategy"` from the anchors list on the dashboard. Keep only:
- Morning Routine
- Today's Training
- Reading
- Evening Routine

No other changes to anchors section.

---

## 6. Remove Quick Actions Section

The Quick Actions section (Morning Journal / Today's Training buttons) adds clutter since these actions are already accessible via Today's Anchors. Remove this entire section.

---

## Files Modified

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Replace streaks with completion % + 2 streaks; remove Quick Actions; remove strategy from anchors; bump quote font size; compute daily completion % |
| `src/components/dashboard/DailyWeightTracker.tsx` | Minor styling: smaller input, subtler appearance |
| `src/components/dashboard/DailyHabits.tsx` | Expose completed count via a callback prop so Dashboard can compute daily completion % |

---

## Technical Notes

- Daily completion % is computed in `Dashboard.tsx` using data already fetched (habits completions from `DailyHabits`, anchor completions from the existing `anchorCompletions` state). The `DailyHabits` component will call back with `{ total, completed }` so the parent can include habit counts in the percentage.
- No new database tables or edge functions needed.
- No changes to navigation, layout system, or other pages.

