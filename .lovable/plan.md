

# Fix On-Site Calendar: Shift Selection + Training Schedule

## Problems Identified

1. **Shift config sheet not triggering**: The onboarding generates on-site blocks immediately with defaults (and alternates day/night when "both" is selected). When the user later toggles to "On-Site" on the calendar, the `weekHasShiftConfig` check looks for `shift_type` AND `shift_start` in `user_schedule_mode` — but the onboarding never writes to that table. So if a `user_schedule_mode` row exists without shift config (or doesn't exist at all), the sheet may not appear, or old onboarding-generated blocks are shown instead.

2. **Training on every day**: The onboarding `generateOnSiteBlocks` function puts training on ALL 7 days. The calendar's `generateOnSiteBlocksFromConfig` was fixed to check against home training days, but only runs when the shift config sheet is confirmed. If the user never gets the sheet (issue 1), they see the old onboarding blocks with training every day.

## Solution

### 1. Always show the Shift Config Sheet on first toggle to On-Site each week

**File: `src/pages/Calendar.tsx`**

- Fix `toggleScheduleMode`: When switching to `on_site`, ALWAYS open the shift config sheet if no shift config exists for this week. The current logic is correct in intent but the `weekHasShiftConfig` state may not be set properly.
- Fix the `fetchMode` useEffect: Ensure `weekHasShiftConfig` is only true when `shift_start` is explicitly set (not just when `shift_type` has its default value of `'days'`).

### 2. Delete old onboarding-generated on-site blocks and regenerate correctly

**File: `src/pages/Calendar.tsx`** (in `handleShiftConfigConfirm`)

- The existing flow already deletes all `on_site` blocks and regenerates them — this is correct. The fix is making sure the sheet actually opens (issue 1 above).

### 3. Fix onboarding to not generate on-site blocks at all

**File: `src/pages/Onboarding.tsx`**

- Remove or skip the call to `generateOnSiteBlocks` during onboarding. On-site blocks should only be generated when the user first toggles to "On-Site" on the calendar and configures their shift via the sheet. This prevents stale/incorrect blocks from existing in the database.
- The `generateOnSiteBlocks` function can remain but won't be called.

### 4. Fix block filtering when toggling to On-Site with no blocks yet

**File: `src/pages/Calendar.tsx`**

- After `handleShiftConfigConfirm` re-fetches blocks, filter correctly for `on_site` mode (current code already does this).
- Ensure the re-fetch also updates `scheduledWorkouts` if needed.

## Technical Details

### Changes to `src/pages/Onboarding.tsx`
- Comment out / remove lines ~732-737 that call `generateOnSiteBlocks` and insert on-site blocks during onboarding.

### Changes to `src/pages/Calendar.tsx`
- In the `fetchMode` useEffect (~line 120): tighten the `weekHasShiftConfig` check to require `shift_start` to be a non-null, non-empty value.
- In `toggleScheduleMode` (~line 129): the existing logic already gates on `weekHasShiftConfig` — once issue 1 is fixed, this will work correctly.
- In the block filter after re-fetch (~line 202): ensure it filters to `schedule_mode === 'on_site'` only (not falling back to blocks without a mode).

