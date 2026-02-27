

# Fix: Shift Worker Calendar Shows Pre-filled Shifts

## Problem
When onboarding as a Shift Worker, the calendar immediately shows shift-adjusted blocks (work blocks, modified sleep, commutes) even though the user has never entered any shifts. This happens because:

1. **Missing cleanup**: The onboarding deduplication logic (line ~428-438 in `Onboarding.tsx`) clears `schedule_blocks`, `schedule_block_overrides`, `workout_sessions`, etc. — but **does not clear `shift_entries`**. Old shift entries from a previous onboarding persist and get picked up by the calendar.

2. **No fresh-start for shift workers**: When a shift worker completes onboarding, the calendar should show a clean baseline schedule (wake, routines, training, sleep) with no work blocks — and prompt the user to enter their shifts via the Shift Entry sheet.

## Changes

### File: `src/pages/Onboarding.tsx` (~line 430)
Add `shift_entries` to the list of tables cleared during re-onboarding:
```typescript
await supabase.from("shift_entries").delete().eq("user_id", user.id);
```
Insert this alongside the existing cleanup block (after `schedule_blocks` delete, before training schedule fetch).

### File: `src/pages/Calendar.tsx` (~line 261)
No code change needed here — the fetch logic already guards with `if (!user || !isShiftWorker) return;` and if no shift entries exist in the DB, the map will be empty and no rebuild occurs. The fix is purely ensuring stale data is cleared.

## Result
After this fix, a shift worker completing onboarding will see a clean baseline calendar with no work blocks. They'll use the Clock FAB to enter their actual shifts, which then triggers the day-rebuild logic.

