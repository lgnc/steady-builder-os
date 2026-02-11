

# Fix: Evening Routine Completion Counter Bug

## Problem

When opening the Evening Routine, the "X/5 complete" counter shows inflated numbers (e.g., "4/5" with nothing ticked) because it's counting completions from OTHER routines (like morning routine items already checked off earlier in the day).

## Root Cause

In `RoutineChecklistSheet.tsx`, the completions query (line 119-124) fetches all `routine_checklist_completions` for today without filtering by routine type. The `completedIds` Set then contains IDs from morning, evening, and strategy routines. The counter uses `completedIds.size` (line 73), which counts everything -- not just items belonging to the current routine.

The checkboxes themselves look correct because they match against item IDs that ARE in the filtered `items` array, but the counter is wrong.

## Fix

One line change in `RoutineChecklistSheet.tsx`:

**Line 73** -- Change `completedCount` to only count IDs that exist in the current routine's items:

```typescript
// Before:
const completedCount = completedIds.size;

// After:
const completedCount = items.filter(item => completedIds.has(item.id)).length;
```

This ensures the counter only reflects items belonging to the currently displayed routine, ignoring completion records from other routine types.

## Files Modified

| File | Change |
|---|---|
| `src/components/calendar/RoutineChecklistSheet.tsx` | Fix `completedCount` calculation to filter by current routine items (line 73) |

No database changes needed. No other files affected.

