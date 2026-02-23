

# Fix: Restore Morning + Evening Routine Checklist Items

## Problem

When re-running onboarding (which happens when you revisit it), the deduplication logic at line 419 deletes ALL `routine_checklist_items`. The `seedDefaultChecklistItems` function then only re-creates **morning routine** and **strategy** items -- it never creates **evening routine** items.

The `DEFAULT_EVENING_ITEMS` list exists in `RoutineChecklistSheet.tsx` but was never wired into the onboarding seed function. So every user who completes onboarding gets an empty evening routine checklist.

## Fix

### File: `src/pages/Onboarding.tsx`

1. Add a `DEFAULT_EVENING_ITEMS` array at the bottom of the file (matching the one in `RoutineChecklistSheet.tsx`):
   - "Prepare tomorrow's clothes"
   - "Review tomorrow's schedule"
   - "10-min reading"
   - "Gratitude journal"
   - "Lights out"

2. Update `seedDefaultChecklistItems` to also insert evening routine items with `routine_type: "evening_routine"`.

That's it -- one array addition and a few lines in the seed function. No database changes needed since `routine_checklist_items` already supports any `routine_type` string value.
