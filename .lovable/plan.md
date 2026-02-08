
# Daily Habit Tracker with Custom Habit Creation

## Overview

Add an editable daily habit tracker to the Dashboard (Today screen). Users get 4 smart defaults on first load but can freely create, delete, and reorder their own habits at any time. Each habit tracks its own independent streak, and habits are visually split into "build" (introduce a new behavior) and "break" (eliminate a behavior) types.

---

## What the User Sees

### Dashboard: New "Daily Habits" Section

A new card between **Quick Actions** and **Today's Schedule** containing:

- Header row: "Daily Habits" label on the left, a pencil (edit) icon button on the right
- A compact checklist of habits, each showing:
  - A checkbox on the left
  - The habit title
  - A small streak badge on the right (flame icon + day count)
  - Color accent indicating build (emerald) vs break (rose) type
- Checked habits get a strikethrough + fade treatment
- When a habit is checked, the streak badge animates up by one

### Creating Custom Habits (Edit Mode)

Tapping the pencil icon opens a **bottom sheet** (same visual pattern as the existing Routine Checklist editor) with:

- The full list of current habits with up/down reorder arrows and a delete (trash) button per item
- An **"Add habit" input field** at the bottom with a type selector
- The type selector is two pill buttons side by side:
  - **Build** (emerald) -- for habits you want to introduce (e.g., "Meditate 10 min")
  - **Break** (rose) -- for habits you want to eliminate (e.g., "No scrolling before bed")
- Users type a habit name, pick the type, and tap the + button to add it
- Changes persist immediately to the database
- Deleting a habit is a soft delete (sets `is_active = false`) so streak history is preserved

### Visual Distinction: Build vs Break

**Build habits** (things to start doing):
- Emerald/green accent color
- Checkbox fills emerald when checked
- Streak badge in emerald

**Break habits** (things to stop doing):
- Rose/red accent color
- Small shield icon instead of the default indicator
- Checkbox fills rose when checked
- Streak badge in rose

### Smart Defaults (First Load Only)

When a user first visits the Dashboard and has no habits, these 4 are automatically created:

| Habit | Type |
|-------|------|
| No phone first 30 min | Break |
| Read 10 pages | Build |
| Walk 10,000 steps | Build |
| Drink 2L water | Build |

Users can immediately edit, delete, or add to these. No onboarding step required -- defaults seed lazily on first Dashboard visit.

---

## Streak Mechanics

Each habit has its own independent streak:

- **On check-off**: If last completed yesterday, increment streak by 1. If older, reset to 1. Update longest streak if new record.
- **On uncheck**: Decrement streak by 1 (minimum 0). Revert last completed date.
- **On Dashboard load**: Any habit where `last_completed_date` is more than 1 day old gets its streak reset to 0.
- These per-habit streaks are shown inline next to each habit, not in the top-level streaks row (which stays focused on routines/journaling/strategy).

---

## Technical Details

### Database Migration

**New table: `habits`**

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| user_id | uuid | -- | Not null, indexed |
| title | text | -- | Not null |
| habit_type | text | 'build' | 'build' or 'break' |
| sort_order | integer | 0 | For display ordering |
| is_active | boolean | true | Soft delete flag |
| current_streak | integer | 0 | Per-habit streak counter |
| longest_streak | integer | 0 | All-time best |
| last_completed_date | date | null | For streak calculation |
| created_at | timestamptz | now() | -- |

**New table: `habit_completions`**

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| user_id | uuid | -- | Not null |
| habit_id | uuid | -- | Not null, references habits(id) on delete cascade |
| completed_date | date | -- | Not null |
| created_at | timestamptz | now() | -- |

Unique constraint on `(user_id, habit_id, completed_date)` to prevent duplicates.

**RLS policies** (both tables): Users can only select/insert/update/delete their own rows, matching the pattern on `routine_checklist_items` and `routine_checklist_completions`.

### New Files

| File | Description |
|------|-------------|
| `src/components/dashboard/DailyHabits.tsx` | Main habits section for the Dashboard. Fetches habits and today's completions, renders the inline checklist with per-habit streaks, handles check/uncheck with optimistic updates, seeds defaults on first load. |
| `src/components/dashboard/HabitEditSheet.tsx` | Bottom sheet for managing habits. Contains the add input with build/break type toggle, reorder controls, and delete buttons. Uses the Sheet component consistent with RoutineChecklistSheet. |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Import and render `DailyHabits` between Quick Actions and Today's Schedule. Pass the user ID. |

### Component: DailyHabits.tsx

Key responsibilities:
- Fetch active habits ordered by `sort_order`
- Fetch today's completions from `habit_completions`
- On mount, run streak decay: reset `current_streak` to 0 for any habit where `last_completed_date` is more than 1 day old
- If zero habits exist, seed the 4 smart defaults
- Render each habit row with checkbox, title, type color accent, and streak badge
- On check: insert into `habit_completions`, update streak fields on the `habits` row
- On uncheck: delete from `habit_completions`, revert streak
- Pencil button opens `HabitEditSheet`
- On sheet close, refetch the habit list

### Component: HabitEditSheet.tsx

Key responsibilities:
- Display all active habits with up/down reorder arrows and delete buttons
- **Add habit form**: text input + two pill buttons for type selection (Build / Break)
- Insert new habit into `habits` table with the selected type and next sort order
- Delete sets `is_active = false` (soft delete preserves streak history)
- Reorder updates `sort_order` values via optimistic swap + database persist
- Follows the same Sheet + motion patterns used in RoutineChecklistSheet

### Color Treatment

Build habits:
- Unchecked: default border with `text-emerald-500` accent indicator
- Checked: `bg-emerald-500/10`, checkbox fills emerald, text strikethrough + fade
- Streak badge: `text-emerald-400`

Break habits:
- Unchecked: default border with `text-rose-500` accent and shield icon
- Checked: `bg-rose-500/10`, checkbox fills rose, text strikethrough + fade
- Streak badge: `text-rose-400`

### Streak Update Logic

On check-off:
1. If `last_completed_date` is today, skip (already counted)
2. If `last_completed_date` is yesterday, increment `current_streak` by 1
3. Otherwise, set `current_streak` to 1
4. Update `longest_streak` to max of current and longest
5. Set `last_completed_date` to today

On uncheck:
1. If `last_completed_date` is not today, skip
2. Set `current_streak` to max(0, current_streak - 1)
3. If streak > 0, set `last_completed_date` to yesterday; otherwise set to null

### Default Habits Seeding

When `DailyHabits` mounts and finds zero active habits for the user:

```text
defaults = [
    { title: "No phone first 30 min", habit_type: "break", sort_order: 0 },
    { title: "Read 10 pages",         habit_type: "build", sort_order: 1 },
    { title: "Walk 10,000 steps",     habit_type: "build", sort_order: 2 },
    { title: "Drink 2L water",        habit_type: "build", sort_order: 3 },
]
```

Inserted in a single batch with the user's ID. No onboarding step needed.
