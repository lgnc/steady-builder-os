

# Fix: Week-Scoped Workout Instances

## Problem

The `user_training_schedule` and `workout_logs` tables use a static `week_number` integer (usually 1) with no date context. Once a workout is marked completed, it stays completed forever. New weeks don't get fresh sessions.

## Solution

Add a `week_start_date` (date) column to both `user_training_schedule` and `workout_logs`. This column stores the Monday of the ISO week the workout belongs to. All queries filter by `week_start_date` instead of (or in addition to) `week_number`.

No new tables needed -- just an additional column that turns the existing rows into proper weekly instances.

---

## 1. Database Migration

Add `week_start_date` (date, nullable) to both tables:

```text
ALTER TABLE user_training_schedule ADD COLUMN week_start_date date;
ALTER TABLE workout_logs ADD COLUMN week_start_date date;
```

Nullable so existing rows aren't broken. New rows will always populate it.

---

## 2. Week Start Calculation (Frontend Helper)

Add a helper that computes the Monday of the ISO week for any given date:

```text
getWeekStartDate(date: Date): string
  -> returns "YYYY-MM-DD" of the Monday of that week
```

Uses `date-fns/startOfWeek` with `weekStartsOn: 1` (already imported in Dashboard).

---

## 3. Changes to `Workout.tsx`

Currently the page loads logs and completion by `week_number`. Changes:

- Accept an optional `?date=YYYY-MM-DD` search param (the selected date from Dashboard/Calendar)
- Compute `weekStart = getWeekStartDate(date || today)`
- Query `workout_logs` filtered by `week_start_date = weekStart` instead of just `week_number`
- Query `user_training_schedule` filtered by `week_start_date = weekStart`
- Previous week logs: use `weekStart - 7 days` instead of `week_number - 1`
- On save: include `week_start_date` in all inserts
- On complete: include `week_start_date` in the `user_training_schedule` insert/query

This means opening the same training day in a new week creates a fresh session with no pre-filled data.

---

## 4. Changes to `Dashboard.tsx`

The training completion check (line ~189-197) currently queries by `day_of_week` only. Change to:

- Compute `weekStart = getWeekStartDate(selectedDate)`
- Query `user_training_schedule` with `.eq("week_start_date", weekStart)` AND `.eq("day_of_week", dayOfWeek)`
- This ensures completion only shows for the current week's instance

When navigating to workout (quick action button + anchor click):
- Pass `?date=YYYY-MM-DD` as a search param so `Workout.tsx` knows which week to load

---

## 5. Changes to `Training.tsx`

The training program list page checks `isCompleted` using `userSchedule`. Change:

- Compute `weekStart = getWeekStartDate(today)`
- Filter `user_training_schedule` by `week_start_date = weekStart`
- Navigation to workout: pass `?date=today` param
- Checkmarks now reflect current week only

---

## 6. Changes to `TrainingBlockSheet.tsx`

When "Start Workout" is clicked (line 52-56), pass the date context:

```text
navigate(`/workout/${block.training_day_id}?date=${selectedDateStr}`)
```

This requires threading `selectedDateStr` as a prop from Dashboard. Or we can default to today if not provided.

---

## 7. Calendar Events

Schedule blocks (`schedule_blocks`) store the template reference (`training_day_id`). They don't need changes -- they always point to the template. The resolution to the current week's instance happens when `Workout.tsx` opens and queries by `week_start_date`.

---

## Files Changed

| File | Change |
|---|---|
| Database migration | Add `week_start_date` column to `user_training_schedule` and `workout_logs` |
| `src/pages/Workout.tsx` | Use `week_start_date` for all queries/inserts; accept `?date` param |
| `src/pages/Dashboard.tsx` | Filter training completion by `week_start_date`; pass date to workout navigation |
| `src/pages/Training.tsx` | Filter schedule by current `week_start_date`; pass date in navigation |
| `src/components/calendar/TrainingBlockSheet.tsx` | Accept + pass date context to workout URL |

---

## What This Fixes

- New week = all workouts appear unticked (no matching `week_start_date` rows exist yet)
- Opening a workout loads only the current week's logs (or blank if none)
- Past weeks' logs remain in the database, queryable by their `week_start_date`
- Calendar/Dashboard checkmarks reflect current week only
- Date navigation on Dashboard shows correct completion for that week

## What Stays the Same

- No schema restructuring (just one new column per table)
- `schedule_blocks` unchanged (they're templates/events, not instances)
- All existing UI patterns preserved
- Historical data unaffected (old rows have `week_start_date = null`, won't match current week queries)
