
# Roster Reminder for Shift Workers

## What This Does

Adds a "What day does your roster come out?" question during onboarding for shift workers. A recurring, non-deletable reminder block is then placed on that day in their calendar every week, prompting them to update their shifts.

## Changes

### 1. Database: Add `roster_day` column to `onboarding_data`

- Add a nullable `integer` column `roster_day` (0=Sunday through 6=Saturday, matching existing `day_of_week` convention)
- Only relevant for `shift_work` and `fifo` work types

### 2. Onboarding Data Model (`src/pages/Onboarding.tsx`)

- Add `rosterDay: number | null` to the `OnboardingData` interface
- Default to `null`
- Save to `onboarding_data.roster_day` during the final submit

### 3. Work & Availability Step (`src/components/onboarding/WorkStep.tsx`)

- For shift workers and FIFO users, add a new section: "What day does your roster usually come out?"
- Display a day-of-week picker (same style as existing rest days / training days pickers)
- Only visible when `workType` is `shift_work` or `fifo`

### 4. Schedule Block Generation (`src/pages/Onboarding.tsx`)

- During the schedule building phase, if `rosterDay` is set, insert an additional `schedule_block` with:
  - `block_type: "roster_reminder"`
  - `title: "Update Weekly Shifts"`
  - `is_locked: true` (non-deletable)
  - `schedule_mode: "home"` (shows on home calendar)
  - Positioned in the morning after the morning routine (similar to how strategy block finds a gap)
  - 15-minute block (it's just a reminder/prompt)

### 5. Calendar Rendering (`src/pages/Calendar.tsx`)

- Add `"roster_reminder"` to the block type color/styling map so it renders distinctly (e.g., amber/orange theme to stand out as an action item)
- When tapped, it could open a toast or the shift config sheet (stretch goal -- for now just render it as a visible reminder block)

## Technical Details

### Migration SQL
```sql
ALTER TABLE public.onboarding_data 
ADD COLUMN roster_day integer;
```

### Files Modified
- `src/pages/Onboarding.tsx` -- add `rosterDay` to interface, defaults, save logic, and block generation
- `src/components/onboarding/WorkStep.tsx` -- add roster day picker for shift/FIFO users
- `src/pages/Calendar.tsx` -- add styling for `roster_reminder` block type
