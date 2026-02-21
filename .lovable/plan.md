

# Refactor: Session-Based Workout Architecture

## Overview
Replace the current flat `workout_logs` table approach with a proper session/sets model. Training templates (`training_days`, `training_exercises`) remain immutable. Each week, a distinct `workout_sessions` row is created per user per training day, and all set data lives in `workout_sets` linked to that session.

---

## Step 1: Create New Tables (Database Migration)

**Table: `workout_sessions`**
- `id` uuid PK
- `user_id` uuid NOT NULL
- `training_day_id` uuid NOT NULL (references `training_days`)
- `week_start_date` date NOT NULL
- `status` text NOT NULL DEFAULT 'not_started' (not_started | in_progress | completed)
- `performed_at` timestamptz NULL
- `created_at` timestamptz DEFAULT now()
- UNIQUE constraint on `(user_id, training_day_id, week_start_date)`
- RLS: full CRUD scoped to `auth.uid() = user_id`

**Table: `workout_sets`**
- `id` uuid PK
- `session_id` uuid NOT NULL references `workout_sessions` ON DELETE CASCADE
- `training_exercise_id` uuid NOT NULL references `training_exercises`
- `set_index` int NOT NULL
- `reps` int NULL
- `weight_kg` numeric NULL
- `duration_seconds` int NULL
- `notes` text NULL
- `created_at` timestamptz DEFAULT now()
- `updated_at` timestamptz DEFAULT now()
- Index on `(session_id)` and `(training_exercise_id)`
- RLS: CRUD via join to `workout_sessions` where `auth.uid() = user_id`

---

## Step 2: Refactor `src/pages/Workout.tsx`

### A) Session upsert on load
Replace the current `fetchData` logic that queries `workout_logs` by `training_day_id + week_start_date` with:

1. Upsert a `workout_sessions` row for `(user_id, training_day_id, weekStartDate)` with `status = 'in_progress'` (using `ON CONFLICT DO NOTHING` + select).
2. Store `currentSessionId` in state.
3. Load `workout_sets` WHERE `session_id = currentSessionId` -- this is the ONLY source for input values.

### B) "Last performed" (previous column)
Instead of querying `workout_logs` for `prevWeekStartDate`:

1. Query `workout_sessions` for the same `training_day_id` and user, where `week_start_date < currentWeekStart`, ordered by `week_start_date DESC`, limit 1.
2. Load that session's `workout_sets` for display-only "Prev" column.
3. These values are NEVER used to populate inputs.

### C) Saving sets
Replace `saveSet` to write to `workout_sets`:

1. Check for existing row: `session_id = currentSessionId AND training_exercise_id = exerciseId AND set_index = setIdx`.
2. If exists, UPDATE. If not, INSERT.
3. No more duplicate-guard logic needed -- the session_id scoping prevents cross-week bleed.

### D) Complete workout
Update `workout_sessions.status = 'completed'` and `performed_at = now()` instead of only updating `user_training_schedule`.

### E) PB detection (all-time history)
Query `workout_sets` joined to `workout_sessions` for the same `training_exercise_id` and user (excluding current session) to find all-time bests.

### F) Summary computation
Use the new `workout_sets` data for current session and previous session volumes.

### G) Warm-up gate
Keep the existing bypass: `isLocked = !warmupComplete && !workoutCompleted && currentSets.length === 0`.

---

## Step 3: Update interfaces and state variables

- Remove `WorkoutLog` interface; replace with `WorkoutSet` interface matching the new table.
- Rename `currentLogs` to `currentSets`, `previousLogs` to `previousSets`.
- Add `currentSessionId: string | null` state.
- Remove `allTimeLogs` state; replace with a dedicated PB query.

---

## Step 4: Update Onboarding cleanup

In `src/pages/Onboarding.tsx`, replace:
```
await supabase.from("workout_logs").delete().eq("user_id", user.id);
```
with:
```
await supabase.from("workout_sessions").delete().eq("user_id", user.id);
```
(Cascade will clean up `workout_sets` automatically.)

---

## Step 5: Migrate existing `workout_logs` data

A one-time SQL migration to copy existing `workout_logs` into the new tables:

1. INSERT INTO `workout_sessions` from distinct `(user_id, training_day_id, week_start_date)` in `workout_logs`.
2. INSERT INTO `workout_sets` by joining `workout_logs` to the new sessions.
3. The old `workout_logs` table can remain but will no longer be queried by the workout page.

---

## Files Changed

| File | Change |
|------|--------|
| Database migration | Create `workout_sessions` and `workout_sets` tables with RLS, migrate existing data |
| `src/pages/Workout.tsx` | Full refactor to session-based loading, saving, and history |
| `src/pages/Onboarding.tsx` | Update cleanup to delete `workout_sessions` instead of `workout_logs` |
| `src/components/workout/WorkoutSummaryModal.tsx` | No changes needed (receives computed data) |

