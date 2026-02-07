

# Strategy Block: Weekly Planning Session

## Overview

Add a 45-minute "Strategy Block" to the app -- a weekly planning ritual where users put their phone on Do Not Disturb and map out the entire week ahead. This touches three areas: a new onboarding question, smart schedule placement, and an interactive checklist when tapped.

---

## 1. New Onboarding Step: "Which day for your Strategy Block?"

A new step is inserted as **step 4** (between "Work & Time" and "Gym Commute"), pushing all subsequent steps forward by one (total becomes 11 steps).

The step explains what a Strategy Block is and presents 7 day-of-week buttons (Sun-Sat), defaulting to Sunday. Single selection, same pill-button style as the rest day picker in WorkStep.

**Copy on the step:**
> **Strategy Block**
> Pick one day each week for a 45-minute planning session. You'll map out training, meals, meetings, energy management -- the entire week ahead. Phone on Do Not Disturb, full focus.

The chosen day is saved as `strategy_day` (integer, 0=Sunday through 6=Saturday) in the `onboarding_data` table.

---

## 2. Smart Time Placement (No Overlaps)

The strategy block is placed on the chosen day during schedule generation. The placement logic:

1. Start with the time right after the morning routine ends on that day
2. Collect all existing blocks on that day (training, commute, work, etc.) and sort them by start time
3. Walk through each gap -- if the gap between two blocks (or between morning routine end and the first block) is at least 45 minutes, place it there
4. If no gap exists before work/training, place it after the last block that ends before evening routine

This ensures it never overlaps with training sessions, commute blocks, or work blocks. It finds the earliest available 45-minute window.

**The block is draggable** (`is_locked: false` for time, but block_type `strategy` is treated as non-deletable). Users can long-press drag it to a different time if the default slot doesn't suit them, just like any other movable block. It should not be deletable by the user (it's a system block, not a custom event).

---

## 3. Strategy Checklist (Tapping the Block)

When tapped on the calendar, the strategy block opens the same `RoutineChecklistSheet` component used by morning and evening routines, but with `routineType = "strategy"`. The sheet already supports any routine type -- it just needs default items and a label for the strategy variant.

**Default checklist items:**
1. Review upcoming week's commitments
2. Schedule all training sessions
3. Plan meals and grocery shop
4. Block social events and meetings
5. Identify high-energy vs low-energy days
6. Set top 3 priorities for the week

These items are seeded during onboarding (same as morning routine items are seeded today). Users can add, remove, and reorder items using the edit mode that already exists in the checklist sheet.

Completing all items increments a `strategy` streak, tracked the same way as morning/evening routine streaks.

---

## 4. Review Step Update

The Review Step (final onboarding screen) gets a new "Strategy Block" card showing the chosen day (e.g., "Sunday"), using an amber/gold icon to match the calendar color.

---

## Technical Details

### Database Migration

Two changes:

1. **Add `strategy_day` column** to `onboarding_data`:
   - Type: `integer`, default `0` (Sunday), nullable
   
2. **Update `handle_new_user()` function** to add a `strategy` streak row for new users (alongside existing journaling, training, routine streaks)

### New File

| File | Description |
|------|-------------|
| `src/components/onboarding/StrategyStep.tsx` | Day picker component for choosing strategy block day. 7 pill buttons (Sun-Sat), explanation text, amber/gold icon theme. |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/Onboarding.tsx` | Add `strategyDay` to `OnboardingData` interface and defaults. Increment `TOTAL_STEPS` to 11. Insert StrategyStep at position 4 (shifting steps 4-10 to 5-11). Update `stepTitles`. Save `strategy_day` in `completeOnboarding()`. Add strategy block placement logic in `generateSchedule()` with gap-finding algorithm. Seed strategy checklist items in `seedDefaultChecklistItems()`. |
| `src/components/onboarding/ReviewStep.tsx` | Add a "Strategy Block" card showing the selected day name with amber icon. |
| `src/pages/Calendar.tsx` | Add `"strategy"` color entry (amber/gold: `bg-amber-500/20 border-amber-500/50 text-amber-300`). Handle strategy block tap to open `RoutineChecklistSheet` with `routineType = "strategy"`. Add strategy to legend. |
| `src/components/calendar/RoutineChecklistSheet.tsx` | Add `DEFAULT_STRATEGY_ITEMS` array with the 6 checklist items. Extend `seedDefaults` to handle `routine_type = "strategy"`. Update `routineLabel` to show "Strategy Block" when `routineType === "strategy"`. |

### Schedule Generation: Gap-Finding Algorithm

```text
function findStrategySlot(dayBlocks, morningRoutineEnd):
    sort dayBlocks by start_time
    
    candidateStart = morningRoutineEnd
    strategyDuration = 45 minutes
    
    for each block in dayBlocks:
        if block.start_time >= candidateStart + 45min:
            return candidateStart  // found a gap
        candidateStart = max(candidateStart, block.end_time)
    
    // After all blocks, place it in remaining time
    return candidateStart
```

This ensures the strategy block slots into the first available 45-minute window after the morning routine, skipping over any training, commute, or work blocks that might be in the way.

### Color and Visual Treatment

- Calendar color: `bg-amber-500/20 border-amber-500/50 text-amber-300` (warm amber/gold to signify "planning" activity)
- Block label: "Strategy Block"
- Legend entry: amber dot + "Strategy"

