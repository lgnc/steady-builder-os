

# Fix: Weekly Workout Data Isolation

## Problem

Two issues are causing the "stale data" experience:

1. **Warm-up gate locks ALL inputs** -- When you re-open a workout, the warm-up is unchecked (it's not persisted), which locks all the weight/reps inputs behind a warm-up wall. This makes already-logged data appear "greyed out and uneditable" even though the data belongs to the correct week.

2. **Duplicate workout logs** -- There are 2 identical log entries for the same exercise/set in the database, likely from a double-tap or race condition during saving.

3. **Onboarding doesn't clean up workout_logs** -- When re-running onboarding and switching programs, old workout_logs from the previous program remain in the database. These can cause confusion if training_day_ids are reused.

## Plan

### Step 1: Clean up duplicate workout_logs in the database
Delete the duplicate log entry so only one remains per exercise/set/week.

### Step 2: Fix warm-up gate for returning sessions
Change the lock logic so that if the user already has saved sets for the current week (i.e., they're returning to a workout they started), the warm-up gate is bypassed. The warm-up only gates brand-new sessions.

### Step 3: Add workout_logs cleanup to onboarding
In `src/pages/Onboarding.tsx`, add a delete of `workout_logs` in the `generateSchedule` function alongside the other cleanup queries. This ensures a fresh start when re-onboarding.

### Step 4: Prevent duplicate log inserts
In the `saveSet` function in `src/pages/Workout.tsx`, re-check for existing logs right before inserting to prevent race conditions from double-taps creating duplicates.

---

### Technical Details

**File: `src/pages/Workout.tsx`**
- Modify the `isLocked` logic (line 515): if `currentLogs.length > 0`, skip the warm-up gate (the user is resuming a started workout)
- In `saveSet` (lines 297-363): add a guard to check for existing logs before inserting, preventing duplicate entries

**File: `src/pages/Onboarding.tsx`**
- In `generateSchedule`: add `await supabase.from("workout_logs").delete().eq("user_id", user.id)` to the cleanup block

**Database cleanup**
- Delete the duplicate workout_log entry for the current user

