

# Expanded Commute System

## Overview

Replace the single "Gym Commute" step with a comprehensive "Your Commutes" step that captures three distinct travel times, plus a routing preference for morning trainers. This data feeds into schedule generation to create accurate, gap-free commute blocks for every day of the week.

---

## What Changes for the User

### Onboarding Step 5: "Your Commutes" (replaces "Gym Commute")

The step presents three sliders and one conditional toggle:

**Slider 1 -- Home to Work** (0-60 min, step 5, default 30)
> How long does it take to get from home to work?

**Slider 2 -- Home to Gym** (0-60 min, step 5, default 15)
> How long does it take to get from home to the gym?

**Slider 3 -- Work to Gym** (0-60 min, step 5, default 15)
> How long does it take to get from work to the gym?

**Toggle (only shown if preferred training window is "morning" AND the user has selected standard work type):**
> After morning training, do you head straight to work or go home first?
> - "Go home first" (default)
> - "Go straight to work"

Below the sliders, a **visual preview** shows what a typical training day looks like based on the user's preferred training window, with all the commute blocks in sequence. This gives immediate feedback on total time commitments.

### On the Calendar

New commute blocks appear with descriptive labels:
- "Drive to Work" / "Drive Home from Work" -- for work commute
- "Drive to Gym" / "Drive Home from Gym" -- for home-to-gym legs
- "Drive to Gym from Work" -- for work-to-gym legs
- "Gym to Work" -- when going direct from gym to work (morning trainers)

All commute blocks use the existing orange color scheme (`bg-orange-500/15 border-orange-500/40 text-orange-300`).

### Review Step

The commute card expands to show all three values and the routing preference (if applicable).

---

## Schedule Generation Logic

The core improvement: every transition between locations gets an explicit commute block, so the calendar has zero unaccounted-for gaps.

### Morning Training (weekday with standard work)

**If "go home first" after gym:**
```text
Morning Routine
  Home -> Gym          (gym_commute_minutes)
  Training
  Gym -> Home          (gym_commute_minutes)
  Home -> Work         (commute_minutes)
  Work
  Work -> Home         (commute_minutes)
Reading / Evening Routine / Sleep
```

**If "go straight to work" after gym:**
```text
Morning Routine
  Home -> Gym          (gym_commute_minutes)
  Training
  Gym -> Work          (work_to_gym_minutes)
  Work
  Work -> Home         (commute_minutes)
Reading / Evening Routine / Sleep
```

### Evening Training (weekday with standard work)

```text
Morning Routine
  Home -> Work         (commute_minutes)
  Work
  Work -> Gym          (work_to_gym_minutes)
  Training
  Gym -> Home          (gym_commute_minutes)
Reading / Evening Routine / Sleep
```

### Afternoon/Midday Training

```text
Morning Routine
  Home -> Work         (commute_minutes)
  Work (continues around training)
  Work -> Gym          (work_to_gym_minutes)
  Training
  Gym -> Work          (work_to_gym_minutes)
  Work -> Home         (commute_minutes)
Reading / Evening Routine / Sleep
```

### Rest Day (weekday)

```text
Morning Routine
  Home -> Work         (commute_minutes)
  Work
  Work -> Home         (commute_minutes)
Reading / Evening Routine / Sleep
```

### Weekend / Non-Work Day with Training

```text
Morning Routine
  Home -> Gym          (gym_commute_minutes)
  Training
  Gym -> Home          (gym_commute_minutes)
Reading / Evening Routine / Sleep
```

### Weekend / Non-Work Day, No Training

No commute blocks.

---

## Technical Details

### Database Migration

Add two new columns to `onboarding_data`:

- `work_to_gym_minutes` -- integer, default 15
- `gym_to_work_direct` -- boolean, default false

The existing `commute_minutes` (home-to-work, default 30) and `gym_commute_minutes` (home-to-gym, default 15) columns are already in place.

### Files Changed

| File | Change |
|------|--------|
| `src/components/onboarding/GymCommuteStep.tsx` | Major rewrite -- rename to "Your Commutes", add three sliders (Home-Work, Home-Gym, Work-Gym), conditional toggle for morning gym-to-work routing, and a visual day preview |
| `src/pages/Onboarding.tsx` | Add `workToGymMinutes` and `gymToWorkDirect` to `OnboardingData` interface and defaults. Update `completeOnboarding()` to save new fields. Rewrite `generateSchedule()` to add work commute blocks and use correct commute values per scenario |
| `src/components/onboarding/ReviewStep.tsx` | Expand commute card to show all three values and routing preference |

### OnboardingData Interface Changes

```text
// New fields
workToGymMinutes: number;      // default 15
gymToWorkDirect: boolean;      // default false
```

The existing `commuteMinutes` field (already in the interface) will now actually be collected and used for home-to-work commute.

### Schedule Generation Rewrite

The `generateSchedule()` function in Onboarding.tsx gets a significant update to its commute logic. Key changes:

1. **Work commute blocks added** -- "Drive to Work" before work start, "Drive Home" after work end, on all weekdays (standard work type)
2. **Training window routing** -- Morning training uses `gymCommuteMinutes` for home-to-gym and either `gymCommuteMinutes` (go home) or `workToGymMinutes` (go direct to work) for the return leg
3. **Evening training** uses `workToGymMinutes` for the work-to-gym leg (replacing the current incorrect use of `gymCommuteMinutes`)
4. **Afternoon training** uses `workToGymMinutes` for both legs (work-gym-work)
5. **Smart label selection** -- commute block titles reflect the actual route (e.g., "Drive to Gym from Work" vs "Drive to Gym")
6. **Zero-minute commutes are skipped** -- if any commute value is 0, no block is generated for that leg

### Visual Preview in Commute Step

The preview section dynamically renders a sample day based on:
- The user's preferred training window (from step 3)
- All three commute values
- The gym-to-work toggle state

This shows blocks like: Morning Routine -> Drive to Gym (15 min) -> Training (60 min) -> Drive to Work (10 min) -> Work -> Drive Home (30 min) -- so the user immediately sees total time commitment.

### Step Title Update

Step 5 title changes from "Gym Commute" to "Your Commutes" in the `stepTitles` array.

