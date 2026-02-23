

# Show Times on Blocks and Ensure All Commute Types for All Workers

## Overview
Two changes that apply universally across all work types (Standard, Shift, FIFO):

1. **Display start/end times on every calendar block** so you can see exactly when things are scheduled
2. **Ensure all three commute types are always generated** -- home-to-work, home-to-gym, and work-to-gym (where applicable) -- for every worker type, not just shift workers

## What Changes

### 1. Times displayed on blocks
Every block on the calendar will show its time range (e.g., "7:30a - 8:00a") below the title. For very short blocks where there isn't enough vertical space, only the title will show.

### 2. All commute types for all workers
Currently, onboarding creates commute blocks based on which training window you picked (morning vs evening), and the shift schedule builder only uses commutes that already exist. If a commute block wasn't created during onboarding, it silently gets skipped.

The fix: when the schedule builder needs a commute block but can't find one in your saved blocks, it will create a "synthetic" one on the fly using your onboarding commute durations. This applies to:
- **Home to Work / Home from Work** -- using your home-to-work commute time
- **Home to Gym / Home from Gym** -- using your home-to-gym commute time  
- **Work to Gym / Gym to Work** -- using your work-to-gym commute time

This works the same way regardless of whether you're a standard 9-5 worker, shift worker, or FIFO worker.

---

## Technical Details

### File: `src/components/calendar/DraggableBlock.tsx`
- Add a time formatting helper that converts "HH:MM" to a compact display like "7:30a" or "9p"
- Below the block title, render a second line showing "startTime - endTime" in muted, smaller text
- Only show the time line when `finalHeight >= 30` (enough vertical room for two lines); the title-only threshold stays at `finalHeight >= 18`

### File: `src/lib/shiftScheduleBuilder.ts`
- Add a `createSyntheticCommute` helper function that generates a commute block with correct title and block_type when no matching commute exists in the user's saved blocks:
  - `to_work` -> "Drive to Work"
  - `from_work` -> "Drive Home from Work"  
  - `to_gym` -> "Drive to Gym"
  - `from_gym` -> "Drive Home from Gym"
  - `gym_to_work` -> "Gym to Work"
- Update `buildDayShift`, `buildNightShift`, and `rebuildOffDay` so that when `commutesByRole.get("to_work")` (or any role) returns undefined but the duration is non-zero, a synthetic commute is created and placed
- Update `placeTrainingCluster` to accept `durations` parameter and create synthetic gym commutes when `commutesByRole` doesn't have them but `gymCommuteMinutes` or `workToGymMinutes` is non-zero
