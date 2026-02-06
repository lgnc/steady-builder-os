

# Morning Routine Checklist

## Overview

When a user taps their "Morning Routine" block on the calendar, a bottom sheet will slide up showing an interactive checklist of tasks. Users start with a sensible default set of items and can customise it (add/remove/reorder). The checklist resets fresh each day, and completing all items marks the routine as done and increments the user's "morning_routine" streak.

## Default Checklist Items

The morning routine will ship with these default items (in order):

1. Hydrate (500ml water)
2. Make bed
3. Cold shower / wash face
4. 10-min stretch or mobility
5. Morning journal entry
6. Review today's schedule

Users can add their own items, remove defaults they don't need, and reorder the list.

## What Needs to Happen

### 1. Database -- Two New Tables

**`routine_checklist_items`** -- stores each user's personalised template

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| routine_type | text | `morning_routine` (later `evening_routine`) |
| title | text | Item label |
| sort_order | integer | Display order |
| created_at | timestamptz | Auto |

**`routine_checklist_completions`** -- tracks daily tick-offs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| checklist_item_id | uuid | FK to routine_checklist_items |
| completed_date | date | The day this was ticked |
| completed_at | timestamptz | Exact time ticked |
| created_at | timestamptz | Auto |

Both tables get RLS policies so users can only access their own data. A unique constraint on `(checklist_item_id, completed_date)` prevents duplicate completions per day.

### 2. Seed Default Items on Onboarding

When the user completes onboarding (`completeOnboarding` in `Onboarding.tsx`), we insert the 6 default checklist items into `routine_checklist_items` alongside the schedule generation. This also creates an initial `streaks` row for `streak_type = 'morning_routine'`.

### 3. New Component -- `RoutineChecklistSheet`

A new component at `src/components/calendar/RoutineChecklistSheet.tsx` that:

- Uses the existing `Sheet` component (bottom variant) from the UI library
- Fetches the user's checklist items for `morning_routine` ordered by `sort_order`
- Fetches today's completions and pre-ticks any already completed items
- Each item is a row with a checkbox (using the existing `Checkbox` component) and the item title
- Tapping a checkbox immediately inserts/deletes a completion record (auto-save, same pattern as block drag)
- Shows a progress indicator (e.g., "4/6 complete") at the top
- When all items are checked, shows a success animation and updates the `morning_routine` streak in the `streaks` table
- Includes an "Edit" mode toggle that lets users:
  - Add a new item (text input at the bottom)
  - Delete items (swipe or delete icon)
  - Reorder items (drag handle or up/down arrows)

### 4. Calendar Integration

Update `Calendar.tsx` to:

- Import and render the `RoutineChecklistSheet`
- When a `morning_routine` block is tapped, open the sheet instead of the basic detail modal
- The existing `selectedBlock` state will control sheet open/close
- Training blocks still navigate to the workout page; other blocks still show the detail modal

### 5. Streak Integration

Follow the same pattern as journaling streaks in `Journal.tsx`:

- When all checklist items are completed for today and no prior completion existed, increment `current_streak` and update `last_completed_date` in the `streaks` table for `streak_type = 'morning_routine'`
- If the streak row doesn't exist yet, create it

---

## Technical Details

### Database Migration SQL

```text
-- routine_checklist_items: user's personalised routine template
CREATE TABLE public.routine_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  routine_type TEXT NOT NULL DEFAULT 'morning_routine',
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routine_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checklist items"
  ON public.routine_checklist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checklist items"
  ON public.routine_checklist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklist items"
  ON public.routine_checklist_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklist items"
  ON public.routine_checklist_items FOR DELETE
  USING (auth.uid() = user_id);

-- routine_checklist_completions: daily completion records
CREATE TABLE public.routine_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  checklist_item_id UUID NOT NULL REFERENCES public.routine_checklist_items(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (checklist_item_id, completed_date)
);

ALTER TABLE public.routine_checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions"
  ON public.routine_checklist_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
  ON public.routine_checklist_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
  ON public.routine_checklist_completions FOR DELETE
  USING (auth.uid() = user_id);
```

### Files to Create

- `src/components/calendar/RoutineChecklistSheet.tsx` -- the bottom sheet with checklist UI, edit mode, and streak logic

### Files to Modify

- `src/pages/Calendar.tsx` -- open the checklist sheet when tapping a morning routine block
- `src/pages/Onboarding.tsx` -- seed default checklist items and morning_routine streak during `completeOnboarding`

### Component Flow

```text
User taps "Morning Routine" block on calendar
  --> Calendar opens RoutineChecklistSheet (bottom sheet)
    --> Sheet fetches checklist items + today's completions
    --> User ticks items (auto-saves each tick)
    --> All items ticked?
      --> Yes: Update morning_routine streak, show success
      --> No: Show progress (e.g., "4/6 complete")
    --> User taps "Edit" to add/remove/reorder items
```

### Streak Pattern

Follows the exact same approach used in `Journal.tsx` lines 120-131:
- On completing all items for the first time today, increment `current_streak` by 1
- Update `last_completed_date` to today
- Update `longest_streak` if the new current streak exceeds it

