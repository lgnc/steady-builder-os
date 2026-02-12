

# Training Experience Upgrade -- Implementation Plan

This plan adds 5 features on top of the existing workout logging system. No redesign -- just layering in warm-ups, PB detection, a summary modal, mobility, and exercise form cues.

---

## Phase 1: Database Migration

Two columns added to existing tables:

| Table | New Column | Type | Default | Purpose |
|---|---|---|---|---|
| `training_exercises` | `form_cues` | `text[]` | `'{}'::text[]` | 3-5 bullet-point cues per exercise |
| `training_days` | `warmup_items` | `jsonb` | `'[]'::jsonb` | Focus-specific warm-up checklist items |
| `training_days` | `mobility_items` | `jsonb` | `'[]'::jsonb` | Focus-specific post-workout stretches |

After migration, populate data with UPDATE statements:

- **Warm-up items** tailored by `focus` (e.g., Push day gets shoulder circles, chest openers; Leg day gets hip circles, ankle mobility)
- **Mobility items** tailored by `focus` (e.g., Push day gets pec stretch, thoracic opener; Leg day gets hamstring stretch, hip flexor stretch)
- **Form cues** for all ~40 exercises (e.g., Bench Press: "Retract shoulder blades", "Feet flat on floor", "Bar path over mid-chest", "Control the eccentric")

---

## Phase 2: New Components

### 2a. `WarmUpBlock.tsx`
- Renders the `warmup_items` from the training day as a checkbox list
- Two sections: "General Warm-Up" (dynamic stretching) and "Movement Prep" (session-specific)
- Tracks completion state locally (not persisted to DB -- resets each session)
- Visual: collapsible card at the top of the workout, with a lock icon on exercises until all items checked

### 2b. `MobilityBlock.tsx`
- Renders `mobility_items` as optional checkboxes at the bottom of the exercise list
- Clearly labelled "Optional -- Mobility / Recovery"
- Not required for workout completion
- Simple checkbox list, no data logging

### 2c. `ExerciseFormCues.tsx`
- Small collapsible section within each expanded exercise
- Displays the `form_cues` array as bullet points
- Icon: info/lightbulb icon, togglable
- If `form_cues` is empty, section is hidden

### 2d. `PBIndicator.tsx`
- Inline badge that shows "New Best" next to a set row
- Three PB types detected:
  - Highest weight ever for that exercise
  - Highest reps at a given weight for that exercise
  - Highest single-session volume for that exercise
- Appears immediately when a set is saved (compares against all-time logs fetched on page load)

### 2e. `WorkoutSummaryModal.tsx`
- Dialog triggered after `completeWorkout()` succeeds
- Content sections:
  1. **Exercises Improved** -- list exercises where weight, reps, or volume increased vs. the previous session of this same workout
  2. **Total Session Volume** -- sum of (sets x reps x weight) across all exercises, with delta vs. previous session
  3. **Weekly Consistency** -- "X of Y sessions completed this week" (query `user_training_schedule` for current week)
- If no improvements detected: "Session logged. Stay consistent."
- Single "Done" button that navigates back

---

## Phase 3: Workout Page Changes (`src/pages/Workout.tsx`)

### State additions
```
warmupItems: array of { label, checked }
mobilityItems: array of { label, checked }
warmupComplete: boolean
allTimeLogs: WorkoutLog[] (for PB detection)
showSummary: boolean
summaryData: { improvements, volume, prevVolume, weeklyCount, weeklyTotal }
```

### Data fetching additions (in the existing `fetchData` effect)
- Fetch `training_days.warmup_items` and `training_days.mobility_items` (already fetching the day row)
- Fetch `training_exercises.form_cues` (already fetching exercises)
- Fetch ALL historical `workout_logs` for the exercises in this session (for all-time PB comparison) -- filtered by exercise IDs, no week filter
- Fetch `user_training_schedule` rows for the current week number to calculate weekly consistency

### Warm-up gating logic
- While `warmupComplete` is false, all Input fields for working sets are `disabled`
- A visual overlay/message on the exercise section: "Complete warm-up to unlock working sets"
- Once all warm-up checkboxes are ticked, `warmupComplete` flips to true and inputs unlock

### PB detection logic (runs on each `saveSet`)
- Compare the just-saved weight against max weight ever logged for that exercise_id
- Compare the just-saved reps against max reps at that same weight
- Compare current session volume for that exercise against best historical session volume
- If any PB detected, display the indicator inline

### Summary modal trigger
- After `completeWorkout()` succeeds, compute summary data:
  - Compare each exercise's total volume (sum of weight x reps across sets) vs. previous session logs
  - Calculate total session volume and delta
  - Count completed sessions this week vs. scheduled
- Set `showSummary = true` to open the modal

### Layout changes
- Insert `WarmUpBlock` above the exercise list
- Insert `ExerciseFormCues` inside each expanded exercise (below notes, above set rows)
- Insert `PBIndicator` inline in each set row (next to the "Prev" column)
- Insert `MobilityBlock` below the exercise list
- `WorkoutSummaryModal` rendered at the page level, controlled by `showSummary` state

---

## Files Summary

| File | Action |
|---|---|
| `supabase/migrations/[timestamp].sql` | Add columns + seed warm-up/mobility/cue data |
| `src/components/workout/WarmUpBlock.tsx` | New |
| `src/components/workout/MobilityBlock.tsx` | New |
| `src/components/workout/ExerciseFormCues.tsx` | New |
| `src/components/workout/PBIndicator.tsx` | New |
| `src/components/workout/WorkoutSummaryModal.tsx` | New |
| `src/pages/Workout.tsx` | Modified -- integrate all 5 features |

---

## Technical Notes

- All-time PB queries use `workout_logs` filtered by `exercise_id IN (...)` with no week filter. This is bounded by the number of exercises in a session (typically 4-8), so data volume is manageable.
- Warm-up and mobility completion is session-local state only (not persisted). Refreshing the page resets checkboxes.
- Form cues are stored in the database per exercise for easy future editing without code deploys.
- The summary modal reuses the existing `Dialog` component from the UI library.
- Weekly consistency counts against `user_training_schedule` rows matching the current `week_number`.

