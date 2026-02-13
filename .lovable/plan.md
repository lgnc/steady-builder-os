

# 28-Day Review Modal -- Implementation Plan

This adds an automatic end-of-trial review experience that triggers on day 28, shows a full-screen metrics summary, captures a reflection, and leads to an upgrade CTA.

---

## 1. Database Migration

Create a new `day28_reviews` table to track review state and store the metrics snapshot.

```text
TABLE: day28_reviews
-----------------------------------------
id               | uuid PK (gen_random_uuid)
user_id          | uuid NOT NULL
day28_review_completed | boolean DEFAULT false
workouts_completed     | integer
avg_habits_percent     | numeric
avg_nutrition_percent  | numeric
start_weight           | numeric
end_weight             | numeric
journal_entries        | integer
longest_streak         | integer
reflection_text        | text
completed_at           | timestamptz
created_at             | timestamptz DEFAULT now()
```

RLS policies: Users can SELECT, INSERT, and UPDATE their own rows only.

No separate `trial_started_at` column needed -- use `onboarding_data.created_at` as the trial start date (the moment they completed onboarding is when their 28-day clock starts).

---

## 2. New Component: `Day28ReviewModal`

**File**: `src/components/profile/Day28ReviewModal.tsx`

A full-screen dialog (using the existing `Dialog` component with custom full-screen styling) containing:

### Layout (scrollable, single column)

1. **Header**: "28-Day Review" title, subtitle "You've completed 4 weeks of structure. Here's what changed.", close X button in corner

2. **Six Metric Cards** (big numbers + short labels, no graphs):
   - Total Workouts Completed -- count from `user_training_schedule` where `completed = true` in last 28 days
   - Average Habit Completion % -- for each of the 28 days: `completions_that_day / active_habits_count`, then average
   - Average Nutrition Compliance % -- `meal_completions (completed=true)` / total meals configured across 28 days
   - Weight Change -- first `daily_weights` entry in period vs latest; show "Start: X kg -> Now: Y kg (net change)"; if missing, show "No weigh-ins logged yet"
   - Total Journal Entries -- count from `journal_entries` in 28-day window
   - Longest Streak Achieved -- max of `habits.longest_streak` and `streaks.longest_streak`

3. **Reflection Input**: Text area with prompt "How do you feel compared to 4 weeks ago?"

4. **Reinforcement Copy**: "This is what structure does. You don't need motivation -- you need a system."

5. **CTA Section** (only visible after scrolling past metrics):
   - Primary button: "Continue with BetterMENt" (routes to placeholder upgrade page or closes with toast for now)
   - Secondary text link: "Not now" (closes modal, does NOT mark as completed)

### Completion Logic

When user submits reflection text OR taps the primary CTA:
- Upsert to `day28_reviews` with all metric values + reflection text + `day28_review_completed = true` + `completed_at = now()`

When user taps "Not now":
- Close modal, leave `day28_review_completed = false`

---

## 3. Trigger Logic

### In `Profile.tsx`

On mount (after auth + onboarding data loads):
1. Read `onboarding_data.created_at` as trial start
2. Check if `today >= trial_start + 28 days`
3. Query `day28_reviews` for this user -- if no row exists or `day28_review_completed = false`, auto-open the modal
4. Pass all needed data to the modal component

### In `Dashboard.tsx`

Same check on mount. If day 28 reached and review incomplete, auto-open the modal there too (covers "on app open" requirement).

Both pages share the same modal component. The trigger hook will be extracted into a reusable hook.

### Reusable Hook: `useDay28Review`

**File**: `src/hooks/useDay28Review.ts`

Returns `{ shouldShow, trialStart, dismiss }` -- checks the date math and DB state. Used by both Profile and Dashboard.

---

## 4. Reminder Card in Profile

When `day28_review_completed = false` AND day 28 has been reached AND user previously dismissed the modal:

Show a card below the Weekly Performance section:

```text
[Calendar icon] Day 28 Review incomplete -- finish review
[Button: Complete Review ->]
```

Tapping opens the Day28ReviewModal again.

---

## 5. Scroll-Gated CTA

The primary CTA button will only become visible/enabled after the user has scrolled past the metrics section. Implementation:

- Use an `IntersectionObserver` on a sentinel element placed after the last metric card
- When sentinel enters viewport, enable the CTA section
- CTA section starts with `opacity-0 pointer-events-none` and transitions to visible

---

## Files Changed

| File | Action |
|---|---|
| **Database migration** | Create `day28_reviews` table + RLS |
| `src/hooks/useDay28Review.ts` | Create -- shared trigger logic |
| `src/components/profile/Day28ReviewModal.tsx` | Create -- full-screen review modal |
| `src/pages/Profile.tsx` | Edit -- add trigger + reminder card |
| `src/pages/Dashboard.tsx` | Edit -- add trigger on mount |

---

## Technical Notes

- Trial start = `onboarding_data.created_at` (no new column needed)
- `longest_streak` uses `habits.longest_streak` (max across all habits) since this tracks the all-time peak, not just current
- The modal fetches its own metrics data on open (self-contained)
- No new navigation tabs or routes added
- Upgrade CTA routes to a placeholder for now (toast: "Upgrade coming soon") since no pricing page exists yet
- The `day28_reviews` row is created on first modal open (with `day28_review_completed = false`), then updated on completion

