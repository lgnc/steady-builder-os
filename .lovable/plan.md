

# Time-Based Exercise Logging

Add automatic input switching so duration-based exercises (e.g., "Battle Ropes -- 30 sec", "Plank Hold -- 45-60 sec") show a time input instead of weight + reps fields.

---

## Current State

The `training_exercises.reps` field is a string with mixed formats:
- Rep-based: `"8-12"`, `"5"`, `"10 each"`
- Duration-based: `"30 sec"`, `"45-60 sec"`, `"45 sec each"`
- Distance/other: `"500m"`, `"40m"`, `"10 cal"`, `"6x100m"`

The `workout_logs` table only has `weight_kg` and `reps_completed` columns -- no duration field.

All exercises currently show weight + reps inputs regardless of type.

---

## 1. Database Migration

Add `duration_seconds` column to `workout_logs`:

```text
ALTER TABLE workout_logs ADD COLUMN duration_seconds integer;
```

This is nullable, so existing logs are unaffected. No other table changes needed -- the prescription type is inferred from the `reps` string, not stored separately.

---

## 2. Prescription Type Detection (Frontend Logic)

Add a helper function `getPrescriptionType(reps: string)` in `Workout.tsx`:

| Pattern | Type | Examples |
|---|---|---|
| Contains "sec" or "min" | `"duration"` | "30 sec", "45-60 sec", "45 sec each" |
| Everything else | `"reps"` | "8-12", "5", "10 each", "500m", "10 cal" |

Keep it simple: only `sec`/`min` patterns trigger duration mode. Distance and calorie exercises remain as reps (users can log distance in the reps field, which already works).

Also add `parsePrescribedSeconds(reps: string): number | null` to extract the target duration for display (e.g., "30 sec" returns 30, "45-60 sec" returns 60).

---

## 3. UI Changes in Workout.tsx

### SetInput interface update

```text
Current:  { weight: string; reps: string; saved: boolean }
New:      { weight: string; reps: string; duration: string; saved: boolean }
```

### Set header row (line ~593)

Conditionally render columns based on prescription type:

- **Reps-based**: `Set | Weight (kg) | Reps | Prev` (no change)
- **Duration-based**: `Set | Time (sec) | Prev` (2-column layout, no weight/reps)

### Set input rows (line ~601)

- **Reps-based**: Weight input + Reps input (no change)
- **Duration-based**: Single time input field (seconds), wider span. Placeholder shows prescribed time (e.g., "30").

### Save logic update

- Duration exercises: save `duration_seconds` instead of `weight_kg`/`reps_completed`
- Set `weight_kg = null` and `reps_completed = null` for duration sets
- Auto-save on blur when duration field has a value

### Previous log display

- Duration exercises: show previous `duration_seconds` value (e.g., "30s") instead of "weight x reps"

### allSetsLogged check (line ~458)

Update to check `duration` field for duration exercises instead of requiring both weight and reps.

---

## 4. PB Detection for Duration Exercises

Skip PB detection for duration-based exercises (no meaningful "personal best" for holding a plank longer in this context). The `detectPBs` function will only run for reps-based exercises.

---

## 5. Summary Calculations

In `computeSummaryData`, duration exercises contribute 0 volume (no weight x reps). They are excluded from volume calculations but still count toward workout completion.

---

## Files Changed

| File | Action |
|---|---|
| Database migration | Add `duration_seconds` column to `workout_logs` |
| `src/pages/Workout.tsx` | Add prescription type detection, conditional input rendering, updated save/load logic |

No new components or files needed. All changes are contained in the workout page and one migration.

---

## Technical Notes

- Prescription type is inferred from the `reps` string at render time -- no new database column on `training_exercises`
- The `duration` field in `SetInput` stores seconds as a string (same pattern as weight/reps)
- Historical logs with `duration_seconds = null` display correctly (they were rep-based)
- Distance exercises ("500m", "40m") stay as reps-based -- users log the distance value in the reps field

