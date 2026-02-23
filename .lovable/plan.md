

# Fix: Full Calendar Auto-Adjustment Around Shift Entries

## Problem

When shift entries are saved, only 4 block types are repositioned: `work`, `morning_routine`, `evening_routine`, and `training`. All other blocks — `commute` (drive to gym, drive home from work, etc.), `sleep`, and others — remain at their original template times, causing overlaps and nonsensical scheduling.

## Solution

Rewrite the shift auto-adjust logic in `src/pages/Calendar.tsx` (the `effectiveBlocks` useMemo, lines ~364-436) to rebuild the entire day's schedule around the shift, not just patch individual block types.

### How it will work

**For each day with a shift entry:**

1. **Collect all template blocks for that day** and read the user's onboarding data (commute durations, sleep duration, bedtime preferences) once.

2. **Day Shift** (e.g. 06:00-18:00):
   - **Sleep**: ends at wake time (calculated as shift start minus morning routine minus commute-to-work duration). Sleep block runs from previous night's bedtime to wake time.
   - **Morning Routine** (30 min): starts at wake time, ends before any commute.
   - **Commute to Work**: placed immediately before shift start (duration from onboarding `commute_minutes`).
   - **Shift/Work**: actual shift times from `shift_entries`.
   - **Commute Home from Work**: immediately after shift end.
   - **Training + Gym Commutes**: slotted into the largest free gap after shift (smart gap-finding). Commute-to-gym placed before training, commute-home-from-gym placed after.
   - **Evening Routine** (45 min): placed before bedtime.
   - **Sleep**: starts at bedtime.

3. **Night Shift** (e.g. 18:00-06:00):
   - **Sleep**: after shift ends (e.g. 06:00-14:00 for ~8 hours).
   - **Morning/Afternoon Routine**: after waking.
   - **Training + Gym Commutes**: placed in the afternoon gap before shift start.
   - **Commute to Work**: before shift start.
   - **Shift/Work**: actual shift times.
   - **Evening Routine**: skipped (no meaningful evening before a night shift, or placed in the small window before shift).

4. **Off Day**: keep the home template as-is (current behaviour, already working).

### Key details

- Each block's original duration is preserved — only its start/end times change.
- Commute blocks are repositioned relative to training and work, maintaining their role (e.g. "Drive to Gym" stays adjacent to training).
- Blocks that cannot fit (e.g. training when there's no gap) are omitted for that day.
- The `roster_reminder` block type is removed/hidden on days that already have shift data entered.

## Technical Changes

### File: `src/pages/Calendar.tsx`

- **Fetch onboarding data** (commute_minutes, gym_commute_minutes, sleep_duration, work_to_gym_minutes) in an existing or new useEffect, stored in state.
- **Replace the shift adjustment block** (lines ~364-436) with a comprehensive `rebuildDayAroundShift()` function that:
  1. Takes all template blocks for a given day + the shift entry
  2. Categorises them by type
  3. Places them sequentially using the logic above
  4. Returns the repositioned blocks
- The function handles both day and night shift patterns.
- Commute blocks are identified by their `title` (e.g. "Drive to Gym", "Drive Home from Work") to determine their role and place them correctly relative to their anchor (work or gym).

### No database changes required

All adjustments are client-side view transformations in the `effectiveBlocks` useMemo — no schema changes needed.

