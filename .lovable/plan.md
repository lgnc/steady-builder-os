

# Smart Sleep Scheduling Across Shift Transitions

## Problem
The current scheduler treats each day in isolation. When a worker transitions from day shifts (Mon-Thu 8am-6pm) to a night shift (Fri 9pm-4am), it doesn't adapt intelligently. It places sleep before the night shift starts as if it were a normal day, instead of recognizing the transition and suggesting optimal sleep patterns.

## Solution
Rewrite the scheduling logic to be **context-aware across adjacent days**, so it can detect shift transitions (day-to-night, night-to-day, night-to-off, etc.) and place sleep blocks intelligently based on health professional guidelines.

### Shift Transition Types and Sleep Strategy

| Transition | Sleep Strategy |
|---|---|
| **Day shift → Night shift** | Normal sleep after day shift (e.g. 10pm-6am). Wake normally. Free time / workout in the day. Optional 90-min pre-shift nap in afternoon. Evening routine before commute to work. |
| **Night shift → Night shift** | Post-shift sleep in morning (e.g. 5am-1pm). Wake, routine, activities. Evening routine before next commute to work. |
| **Night shift → Day shift** | Short post-shift sleep (e.g. 5am-11am). Early bedtime that evening to reset circadian rhythm. |
| **Night shift → Off day** | Post-shift recovery sleep in morning. Then free afternoon/evening. Normal bedtime that night. |
| **Day shift → Off day** | Normal sleep schedule using onboarding bedtime. |
| **Off day → Night shift** | Normal wake. Free day for workout/activities. Optional 90-min nap mid-afternoon. Evening routine before commute. |

### Technical Changes

#### File: `src/lib/shiftScheduleBuilder.ts`

1. **Update function signature** to accept previous and next day shift context:
   ```
   rebuildDayAroundShift(
     dayBlocks, shift, durations,
     prevDayShift?: ShiftEntry | null,
     nextDayShift?: ShiftEntry | null
   )
   ```

2. **Add transition detection helper**:
   - Determine if previous day was a night shift, day shift, or off
   - Determine what tomorrow is (night, day, off)

3. **Rewrite sleep placement logic**:
   - **Day shift days**: Sleep placed at onboarding bedtime (evening), anchored backward from wake time needed for shift
   - **Night shift days**: No evening sleep. Instead, place a "Pre-shift nap" block (90 min) in the afternoon if transitioning from a day schedule. Place post-shift sleep on the NEXT day's morning
   - **Day after night shift**: Place post-shift recovery sleep starting after commute home (e.g. 5am arrival -> 5am-1pm sleep)
   - **Off day after night shift**: Recovery sleep in morning, normal bedtime that evening

4. **Add optional "Pre-shift nap" block**:
   - 90 minutes, placed mid-afternoon on days transitioning into a night shift
   - Uses `block_type: "sleep"` with a modified title like "Pre-shift nap"

5. **Evening routine on night shift days**: 
   - Currently skipped entirely. Instead, place it 1 hour before the commute-to-work time (before the night shift), since the worker still benefits from a wind-down before heading to work

#### File: `src/pages/Calendar.tsx`

1. **Pass adjacent shift context** in the loop (lines 397-412):
   - Look up the previous day's shift entry and next day's shift entry
   - Pass them to `rebuildDayAroundShift` so it can make transition-aware decisions

2. **Handle cross-day sleep blocks**:
   - When a night shift worker's post-shift sleep falls on the next calendar day, ensure the sleep block appears on the correct day (the day they arrive home, not the shift day)

### Ordering of blocks on a night-shift transition day (e.g., Friday)

```text
Normal wake (from Thursday night sleep)
Morning routine
Free time / Training + gym commutes
Pre-shift nap (90 min, ~2pm-3:30pm)
Evening routine (1 hour before commute)
Commute to work
Night shift (9pm - 4am)
```

### Ordering of blocks the morning after a night shift

```text
Commute home from work
Recovery sleep (e.g. 4:30am - 12:30pm)
Morning routine
Free time / Training
Evening routine (1hr before bed)
Normal sleep (if next day is a day shift or off)
```

