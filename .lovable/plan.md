

# 8-Week Goals (12-Week Year Style)

## What You'll Get

A new onboarding step (after the existing Goals step) where you pick 1-3 measurable 8-week goals from a curated preset list. These goals appear on the Dashboard as progress bars right below the daily completion section, showing real-time percentage progress based on actual tracked data (weight, workout logs, etc.). Goals are editable during Week 1 only, then locked for the remaining 7 weeks.

## Preset Goal Categories

Goals the app can automatically measure from existing data:

| Category | Example Presets | How It's Measured |
|---|---|---|
| Weight Loss | Lose 3kg / 5kg / 8kg | Starting weight (onboarding) vs latest daily_weights entry |
| Strength - Bench | Bench 80kg / 100kg / 120kg | Best weight_kg in workout_logs for bench press exercise |
| Strength - Squat | Squat 100kg / 120kg / 140kg | Best weight_kg in workout_logs for squat exercise |
| Strength - Deadlift | Deadlift 120kg / 140kg / 180kg | Best weight_kg in workout_logs for deadlift exercise |
| Pull-ups | 5 / 8 / 10 pull-ups in a row | Best reps_completed in workout_logs for pull-ups |
| Consistency | Complete 90% of training sessions | user_training_schedule completed count vs total |
| Habits | Maintain 80% / 90% habit completion | habit_completions average over the 8 weeks |
| Nutrition | Hit nutrition targets 80% / 90% of the time | meal_completions percentage |

Users pick a category, then select or enter a specific target number within that category.

## Dashboard Integration

Below the daily completion bar and streaks, a new "8-Week Goals" card appears with:
- Each goal as a compact row: label + progress bar + percentage
- Subtle styling that doesn't overwhelm the daily view but keeps goals visible

## Changes

### 1. New database table: `user_eight_week_goals`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NOT NULL |
| goal_type | text | e.g. "weight_loss", "bench_press", "consistency" |
| goal_label | text | Display text e.g. "Bench 100kg" |
| target_value | numeric | The target number |
| baseline_value | numeric | Starting value at time of goal creation |
| current_value | numeric | Latest measured value (updated on Dashboard load) |
| created_at | timestamptz | When goal was set |
| locked_at | timestamptz | NULL until end of week 1, then set to lock edits |

- RLS: users can SELECT, INSERT, UPDATE, DELETE their own rows
- DELETE/UPDATE restricted in app code after locked_at is set

### 2. New onboarding step: `EightWeekGoalsStep`

- Inserted as step 9 (after current GoalsStep at step 8), shifting Friction/Nutrition/Habits/Review to 10-13
- TOTAL_STEPS becomes 13
- UI: category cards to pick from, then a number input for the target
- Max 3 goals, minimum 1 encouraged but not enforced
- Goals saved to the database during `completeOnboarding()`

### 3. Update `ReviewStep`

- Add an "8-Week Goals" section showing the selected goals

### 4. Update Dashboard

- New section below daily completion/streaks: "8-Week Goals"
- Each goal shows a progress bar calculated from real data:
  - Weight goals: query latest daily_weights vs baseline
  - Strength goals: query max weight_kg from workout_logs for matching exercise
  - Consistency goals: query completed training sessions as percentage
  - Habit/Nutrition goals: query completion percentages
- Compact card design, always visible as a reminder

### 5. Goal editing (Week 1 only)

- Profile page gets a small "Edit Goals" option
- After 7 days from created_at, the `locked_at` timestamp is set and edits are blocked
- UI shows "Locked" badge after Week 1

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Create `user_eight_week_goals` table with RLS |
| `src/components/onboarding/EightWeekGoalsStep.tsx` | New step component |
| `src/pages/Onboarding.tsx` | Add step 9, bump total to 13, save goals on complete |
| `src/components/onboarding/ReviewStep.tsx` | Add 8-week goals section |
| `src/pages/Dashboard.tsx` | Add goals progress section below streaks |
| `src/pages/Profile.tsx` | Add edit goals option (Week 1 only) |

