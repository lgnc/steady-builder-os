

# Fix Duplicate Checklist Items

## Problem

The Morning Routine checklist shows every item twice. The database confirms 12 rows for morning_routine when there should only be 6.

This happened because two separate code paths both seed default checklist items:
1. **Onboarding completion** (`seedDefaultChecklistItems` in `Onboarding.tsx`) inserts morning routine and strategy items when the user finishes onboarding
2. **RoutineChecklistSheet** (`seedDefaults`) inserts the same defaults when it opens and finds zero items

Both ran, creating duplicates.

## Fix

Two changes:

### 1. Remove the auto-seed from RoutineChecklistSheet

The `seedDefaults` function in `RoutineChecklistSheet.tsx` is a legacy fallback for users who existed before checklist items were introduced. Now that onboarding handles seeding, the sheet should not auto-seed. Remove the `seedDefaults` callback and the "auto-seed if zero items" logic in `fetchData`.

If a user has no items, it simply shows the empty state ("No checklist items yet. Tap the pencil icon to add some.").

### 2. Clean up existing duplicate data

Run a database migration that deletes duplicate rows, keeping only the first-inserted copy (by `id` or `created_at`) for each `(user_id, routine_type, title)` combination.

```
DELETE FROM routine_checklist_items
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, routine_type, title) id
  FROM routine_checklist_items
  ORDER BY user_id, routine_type, title, created_at ASC
);
```

### Files Changed

| File | Change |
|---|---|
| `src/components/calendar/RoutineChecklistSheet.tsx` | Remove `seedDefaults` callback and the auto-seed block in `fetchData` |
| Database migration | Delete duplicate rows, keeping earliest copy per (user_id, routine_type, title) |

