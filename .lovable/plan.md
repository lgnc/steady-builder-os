

# Fix: Shift Worker Calendar — Stale Data, Training Distribution, and Window Preference

## What's happening

Three separate issues are causing the calendar to misbehave for your shift worker profile:

### Issue 1: Stale shift entries survived re-onboarding
The cleanup code we added (`shift_entries` delete) was deployed, but your existing shift entries were created on Feb 23 — before the fix. They're still sitting in the database and the calendar's shift-rebuild logic picks them up immediately, creating night-shift blocks, pre-shift naps, and modified sleep schedules even though you never entered shifts in this onboarding session.

**Fix:** Two parts:
- **Immediate data cleanup**: Delete the stale `shift_entries` and `user_schedule_mode` rows for your user (they will be handled by the existing cleanup code for any future re-onboarding).
- **Calendar guard**: Only run the shift-rebuild logic if the shift entries were created *after* the user's most recent onboarding completion. This prevents old entries from a previous session from contaminating a fresh onboard. Practically: compare `shift_entries.created_at` against `onboarding_data.updated_at` and discard entries that predate it.

### Issue 2: Training days packed consecutively instead of spread out
You selected a 4-day program with Mon–Fri available. The current code maps training days to the *first N available days* in order: Mon, Tue, Wed, Thu — four in a row with no rest day between them.

**Fix:** In `src/pages/Onboarding.tsx`, replace the sequential assignment with an even-distribution algorithm. For 4 training days across 5 available days (Mon–Fri), it should produce Mon, Tue, Thu, Fri — inserting a rest day on Wednesday.

The algorithm: calculate the ideal spacing (`availableDays.length / programDays`), then pick indices at evenly-spaced intervals using `Math.round(i * spacing)`.

### Issue 3: Training window override — already correctly adaptive
You confirmed training should be adaptive around actual shifts, which is how it currently works. The shift-rebuild logic in `shiftScheduleBuilder.ts` moves training to fit around the shift. This is correct behaviour *once real shifts are entered*. The problem you saw was caused entirely by Issue 1 (stale shifts being applied when none should exist).

## Changes

### File: `src/pages/Onboarding.tsx` (~line 454-461)
Replace the sequential training day mapping with even distribution:

```typescript
const trainingDayMap: Record<number, string> = {};
if (trainingDaysData) {
  const programDays = trainingDaysData.length;
  const totalAvailable = availableDays.length;
  
  if (programDays >= totalAvailable) {
    // Use all available days
    trainingDaysData.forEach((td, idx) => {
      if (idx < totalAvailable) {
        trainingDayMap[availableDays[idx]] = td.id;
      }
    });
  } else {
    // Evenly distribute: e.g. 4 sessions across 5 days → Mon, Tue, Thu, Fri
    const spacing = totalAvailable / programDays;
    trainingDaysData.forEach((td, idx) => {
      const slotIdx = Math.round(idx * spacing);
      const clampedIdx = Math.min(slotIdx, totalAvailable - 1);
      trainingDayMap[availableDays[clampedIdx]] = td.id;
    });
  }
}
```

### File: `src/pages/Calendar.tsx` (~line 384-421)
Add a guard so shift entries are only applied if they were created after the last onboarding completion. This requires:
1. Fetching `onboarding_data.updated_at` alongside the existing work-type query (line ~117).
2. Storing it in state (e.g. `onboardingCompletedAt`).
3. In the shift entries fetch (line ~260), filtering out entries where `created_at < onboardingCompletedAt`.

### File: `src/pages/Calendar.tsx` — shift entries fetch (~line 260-278)
Add `.gte("created_at", onboardingCompletedAt)` to the query so stale entries from previous sessions are ignored.

### Database: Clean up stale data for current user
Delete the 28 stale shift_entries and 1 stale user_schedule_mode record that predate the latest onboarding.

