

# Simplify Home Screen -- Daily Execution Surface

## Summary

Replace the full "Today's Schedule" section with a focused "Today's Anchors" section showing only 5 actionable block types. Add a new ReadingLogSheet component. Update Quick Actions with time-based toggle to open routine sheets. Add completion indicators to anchors.

---

## Section-by-Section Changes

### 1. Greeting & Date
No changes.

### 2. Streaks
No changes. Shows journaling, training, routine, strategy streaks as-is.

### 3. Quick Actions (updated)
Keep the time-based toggle:
- **Morning (before noon)**: "Morning Journal" -- opens the Morning Routine checklist sheet (not /journal navigation)
- **Afternoon/Evening (noon+)**: "Evening Reflection" -- opens the Evening Routine checklist sheet
- **Today's Training**: stays the same

### 4. Daily Habits
No changes.

### 5. Today's Anchors (replaces "Today's Schedule")

Filter `todayBlocks` to only these 5 types:

| Anchor | Icon | Tap Action | Completion Source |
|---|---|---|---|
| Morning Routine | Sun | Opens RoutineChecklistSheet (morning_routine) | All checklist items completed |
| Strategy | CalendarClock | Opens RoutineChecklistSheet (strategy) | All checklist items completed (only shown on strategy day) |
| Today's Training | Dumbbell | Opens TrainingBlockSheet | Training workout completed for today |
| Reading | BookOpen | Opens new ReadingLogSheet | Pages or minutes logged today |
| Evening Routine | Moon | Opens RoutineChecklistSheet (evening_routine) | All checklist items completed |

**Removed from view**: commute, work, sleep, wake, custom blocks.

**No times shown** -- just anchor name, icon, completion indicator, and chevron.

**Completion indicator**: A subtle checkmark icon (text-primary) on the right side when the anchor's action is done for today. Checked by querying completion data.

**Empty state**: "Rest day. Recovery is part of the process."

**No "View all" link** -- calendar tab handles full schedule.

### 6. Daily Quote
No changes.

---

## New Component: ReadingLogSheet

A lightweight bottom sheet for logging daily reading. No streak updates -- reading is tracked purely as a habit via Daily Habits.

- **Props**: `open`, `onOpenChange`, `userId`
- **On open**: Fetches today's `reading_logs` entry (upsert pattern)
- **Inputs**: "Pages read" (number) and "Minutes spent" (number)
- **Save button**: Upserts into `reading_logs` table
- **Shows today's totals** if already logged

---

## Database Migration

New table: `reading_logs`

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, default gen_random_uuid() |
| user_id | uuid | Not null |
| log_date | date | Not null, default CURRENT_DATE |
| pages_read | integer | Default 0 |
| minutes_read | integer | Default 0 |
| created_at | timestamptz | Default now() |

- Unique constraint on `(user_id, log_date)`
- RLS enabled: users can only read/insert/update/delete their own rows

---

## Anchor Completion Detection

To show the checkmark on each anchor, the Dashboard will fetch completion data on load:

- **Morning/Evening/Strategy routines**: Query `routine_checklist_items` count vs `routine_checklist_completions` count for today. If equal, mark complete.
- **Training**: Query `user_training_schedule` for today's day_of_week where `completed = true`.
- **Reading**: Query `reading_logs` for today's date. If a row exists with pages_read > 0 or minutes_read > 0, mark complete.

This is done in a single `useEffect` fetch alongside the existing blocks/streaks fetch.

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/pages/Dashboard.tsx` | Replace schedule section with anchors. Update Quick Actions to open routine sheets. Add ReadingLogSheet state. Add completion state and fetch logic. Remove `getBlockClass`, `formatTime`, `visibleBlocks` filter. |

### Files Created

| File | Purpose |
|---|---|
| `src/components/dashboard/ReadingLogSheet.tsx` | Bottom sheet with pages/minutes inputs for daily reading log |

### Key Changes in Dashboard.tsx

1. **Quick Actions left button**: Instead of `navigate("/journal")`, opens `RoutineChecklistSheet` with type based on time of day (morning_routine before noon, evening_routine after).

2. **Anchors section**: Define a static anchor config array. For each anchor type, find the matching block from `todayBlocks`. If found, render the anchor row. Each row shows: icon, label, completion checkmark (if done), and chevron.

3. **Completion state**: New state `anchorCompletions: Record<string, boolean>` fetched on mount. Queried from routine_checklist_completions, user_training_schedule, and reading_logs.

4. **Reading anchor click**: Opens `ReadingLogSheet` instead of navigating to /journal.

5. **Removed helpers**: `getBlockClass`, `formatTime` (no longer needed since anchors don't show times).

### ReadingLogSheet Component

```text
Props: open, onOpenChange, userId
State: pagesRead, minutesRead, saving

On open:
  Fetch reading_logs where user_id = userId and log_date = today
  Pre-fill inputs if row exists

On save:
  Upsert into reading_logs (user_id, log_date, pages_read, minutes_read)
  Close sheet
```

Styled as a bottom sheet matching existing patterns (rounded-t-2xl, drag handle bar).

