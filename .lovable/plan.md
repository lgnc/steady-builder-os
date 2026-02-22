

## Two Bugs to Fix

### Bug 1: 8-Week Goals Showing 100% After Re-Onboarding

**Root cause:** When re-running onboarding, the cleanup in `generateSchedule()` deletes old `habits`, `user_training_schedule`, and `scheduled_workouts`, but it does NOT delete:
- `habit_completions` -- old completion records remain, so the habits goal calculation finds completions and computes a high percentage
- `meal_completions` -- same issue for nutrition goal
- `workout_logs` -- stale logs can inflate strength/pull-up goals

When the dashboard loads, `EightWeekGoalsCard.updateCurrentValue()` queries these tables, finds old data, and writes inflated `current_value` back to the fresh goals.

**Fix in `src/pages/Onboarding.tsx` -- `generateSchedule()` function:**
Add deletion of `habit_completions`, `meal_completions`, and `workout_logs` to the cleanup block (before line 364), so re-onboarding starts with a truly clean slate.

---

### Bug 2: Workouts Scheduled During Work Hours

**Root cause:** The schedule builder places training blocks based on the preferred training window without checking whether they overlap with work hours. For a user working 06:00-18:00 who selects "morning" training:
1. Wake time might be 05:00, morning routine ends at 05:45
2. Gym commute places them at 06:00
3. Training block: 06:00-07:00 -- this lands squarely inside work hours

The code never validates training placement against the work block.

**Fix in `src/pages/Onboarding.tsx` -- `generateSchedule()` function:**
Add an overlap guard for morning training on work days:
- Calculate the latest time training (plus commutes) would end
- If that end time is after `workStart`, shift training to before work by working backwards from `workStart` (subtracting training duration and commute times)
- If there's genuinely no room before work (e.g., wake time is too close to work start), fall back to evening placement for that day

Apply a similar check for afternoon training to ensure it doesn't spill past `workEnd`.

---

### Technical Details

**File: `src/pages/Onboarding.tsx`**

Changes to `generateSchedule()`:

1. Add cleanup lines after the existing deletions (around line 362):
```typescript
await supabase.from("habit_completions").delete().eq("user_id", user.id);
await supabase.from("meal_completions").delete().eq("user_id", user.id);
await supabase.from("workout_logs").delete().eq("user_id", user.id);
```

2. In the morning training branch (line 419), before placing blocks, check if the training + commutes would end after `workStart`. If so, work backwards from `workStart`:
   - Subtract commute-to-work time
   - Subtract training duration
   - Subtract commute-to-gym time
   - If the resulting start time is before the morning routine end, fall back to evening placement

3. Similar validation for the afternoon branch to keep training within the lunch window rather than spilling into the afternoon.

No database schema changes are needed.

