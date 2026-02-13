

# Add Weekly Review Section to Profile Page

Add a "This Week's Performance" summary card and a "View Weekly Review" modal inside the existing Profile tab, below the 8-week commitment block.

---

## New Component: `WeeklyPerformanceCard`

**File**: `src/components/profile/WeeklyPerformanceCard.tsx`

A self-contained component that receives `userId` and handles all data fetching internally. Placed in Profile.tsx between the 8-week commitment block and the Sign Out button.

### Data Fetching (current Sun-Sat week)

1. **Training Completion**: Query `schedule_blocks` for training blocks this week (by `day_of_week`), then check `user_training_schedule` for `completed = true` entries matching those days. Display as `X / Y sessions`.

2. **Habit Completion %**: For each day of the current week (up to today), query `habits` (active count) and `habit_completions` for that date. Calculate `total_completed / (habits_count * days_elapsed) * 100`.

3. **Nutrition Compliance %**: Get active `meal_plans`, count meals per day from `plan_data`, then count `meal_completions` with `completed = true` for each day this week. `completed_meals / total_configured_meals * 100`.

4. **Weight Change**: Query `daily_weights` for the earliest and latest entries this week. Show difference (e.g., "-0.4 kg this week"). If fewer than 2 entries, show "No weight logged this week."

5. **Longest Active Streak**: Query `streaks` table for all streak types + `habits` table for individual habit streaks. Show the maximum `current_streak` value across all sources.

### Card Layout

- Section heading: "This Week's Performance"
- Dark card (`card-ritual` class) with 5 rows, each showing a label + value
- Subtle progress bars for habit and nutrition percentages
- Below the card: a Button "View Weekly Review" with right arrow

---

## New Component: `WeeklyReviewModal`

**File**: `src/components/profile/WeeklyReviewModal.tsx`

A Dialog (using existing `Dialog` component) triggered by the button.

### Modal Content

- Header quote: "Execution creates identity. Review your week."
- **Section 1 -- Performance Breakdown**:
  - Training: X of Y completed
  - Habits: X% complete
  - Nutrition: X% compliant
  - Weight: delta or "No weight logged this week"
  - Longest streak: X days
- If any data is missing (no weight, no nutrition plan), show a muted inline note (not an error)

### Design

- Uses existing Dialog component (not a new tab or sheet)
- Dark minimal aesthetic, consistent with card-ritual styling
- No graphs, just clean text + progress bars
- Mobile-first layout

---

## Changes to `src/pages/Profile.tsx`

- Import `WeeklyPerformanceCard` and `WeeklyReviewModal`
- Add state for modal open/close
- Insert the card section after the 8-week commitment block (line ~142) and before the Actions section
- Pass `userId` and modal controls as props

---

## Week Boundary Logic

- Week runs Sunday to Saturday
- Use `startOfWeek(new Date(), { weekStartsOn: 0 })` for Sunday start
- Only count days up to and including today (don't penalize for future days)
- Resets automatically each Sunday

---

## No Database Changes Required

All data already exists in:
- `schedule_blocks` + `user_training_schedule` (training)
- `habits` + `habit_completions` (habits)
- `meal_plans` + `meal_completions` (nutrition)
- `daily_weights` (weight)
- `streaks` + `habits.current_streak` (streaks)

---

## Files

| File | Action |
|---|---|
| `src/components/profile/WeeklyPerformanceCard.tsx` | Create -- summary card with data fetching |
| `src/components/profile/WeeklyReviewModal.tsx` | Create -- expanded review dialog |
| `src/pages/Profile.tsx` | Edit -- add card + modal between commitment and sign out |

