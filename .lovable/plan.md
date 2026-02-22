

# Replace Streak Counters with Weekly Completion Block

## What Changes

The two streak counter cards (Training streak and Morning streak) at the top of the dashboard will be replaced with a single **Weekly Completion** block that shows three progress bars: Habits, Training, and Nutrition -- each targeting 85%+.

## Layout

The current top section has:
- Daily completion % (left, larger)
- Training streak (middle)
- Morning streak (right)

The new layout will be:
- Daily completion % (unchanged, stays at top)
- **Weekly Completion card** (full width, below daily completion) containing three mini progress bars for Habits, Training, and Nutrition, each with a percentage and color-coded against the 85% target

## Weekly Completion Card Design

A single `card-stat` with the heading "This Week" showing:

```text
This Week                          Target: 85%
Habits      ████████░░  72%
Training    ██████████  100% (3/3)
Nutrition   ███████░░░  68%
```

- Bars turn green (primary) at 85%+, amber at 50-84%, red below 50%
- Each row shows the category icon, label, progress bar, and percentage
- Training also shows session count (e.g., "3/3")

## Data Fetching

A new `useEffect` will compute weekly totals using the same week boundaries (Sunday start) already used elsewhere:

1. **Training %**: Count completed sessions vs scheduled sessions for the week from `user_training_schedule`
2. **Habits %**: Count habit completions vs (active habits x days elapsed) from `habit_completions` and `habits`
3. **Nutrition %**: Count completed meals vs expected meals from `meal_completions` and `meal_plans`

This reuses the same queries already proven in `WeeklyPerformanceCard.tsx` on the Profile page.

## Technical Changes

### `src/pages/Dashboard.tsx`

1. Add new state: `weeklyCompletion` with `{ habitsPercent, trainingCompleted, trainingTotal, nutritionPercent }`
2. Add a `useEffect` that fetches weekly data (habits, training, nutrition) for the current week
3. Remove the two streak counter `div`s (lines 444-459)
4. Replace with a full-width Weekly Completion card below the daily completion bar
5. Remove `streaks` state and its fetch since it's no longer needed
6. Remove `Flame` icon import (no longer used)

### No database changes needed
All data is already available in existing tables.

