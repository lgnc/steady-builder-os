

# Clickable Schedule Blocks on the Dashboard

## Overview

Make the "Today's Schedule" blocks on the Dashboard interactive, matching the same tap behavior as the Calendar page. Tapping a block will either open a checklist popup, navigate to a workout, or navigate to the relevant screen.

---

## What Changes for the User

### Tapping a Schedule Block

Each block in the "Today's Schedule" section becomes tappable with a visual press state. The behavior depends on the block type:

| Block Type | Tap Action |
|---|---|
| Morning Routine | Opens the Morning Routine checklist sheet (same popup as Calendar) |
| Evening Routine | Opens the Evening Routine checklist sheet |
| Strategy | Opens the Strategy checklist sheet |
| Training | Opens the Training detail sheet with "Start Workout" and "Reschedule" buttons |
| Reading | Navigates to /journal (closest relevant screen) |
| Commute | Shows a brief info toast -- no action needed |
| Work | No action -- work blocks are informational |
| Custom | Shows a brief info toast with the block details |

### Visual Feedback

Each tappable block gets a subtle press/hover state: a slight scale-down on tap and a chevron-right icon on the right side to indicate it is interactive. Non-actionable blocks (work, commute) do not get the chevron.

---

## Technical Details

### File Modified: `src/pages/Dashboard.tsx`

Changes:

1. **Import the existing sheet components** -- `RoutineChecklistSheet` and `TrainingBlockSheet` (already used in Calendar.tsx)

2. **Add state variables** for the sheets:
   - `routineSheetOpen` (boolean)
   - `routineSheetType` (string: "morning_routine" | "evening_routine" | "strategy")
   - `trainingSheetOpen` (boolean)
   - `trainingBlock` (ScheduleBlock | null)

3. **Add a `handleBlockClick` function** that mirrors the Calendar's onClick logic:
   - If `block_type` is "morning_routine", "evening_routine", or "strategy": set `routineSheetType` and open `routineSheetOpen`
   - If `block_type` is "training" and `training_day_id` exists: set `trainingBlock` and open `trainingSheetOpen`
   - If `block_type` is "reading": navigate to `/journal`
   - Otherwise: no-op (work, commute, custom are informational)

4. **Update the schedule block rendering** (the `visibleBlocks.map` section):
   - Wrap each `motion.div` with an `onClick` handler calling `handleBlockClick(block)`
   - Add `cursor-pointer` and `active:scale-[0.98] transition-transform` classes to tappable blocks
   - Add a `ChevronRight` icon on the right side for actionable blocks (routine, training, reading)

5. **Render the sheet components** at the bottom of the JSX (before `</MobileLayout>`):
   - `RoutineChecklistSheet` with `open={routineSheetOpen}`, `onOpenChange`, `userId`, and `routineType={routineSheetType}`
   - `TrainingBlockSheet` with `open={trainingSheetOpen}`, `onOpenChange`, `block={trainingBlock}`, `blocks={todayBlocks}`, `userId`, and `onRescheduleComplete` (which updates `todayBlocks` state)

### Block Type to Action Mapping (in handleBlockClick)

```text
function handleBlockClick(block):
    switch block.block_type:
        case "morning_routine":
        case "evening_routine":
        case "strategy":
            set routineSheetType = block.block_type
            set routineSheetOpen = true

        case "training":
            if block.training_day_id:
                set trainingBlock = block
                set trainingSheetOpen = true
            else:
                navigate("/training")

        case "reading":
            navigate("/journal")

        default:
            // work, commute, custom -- no action
            return
```

### Visual Changes to Block Rows

Actionable blocks (routine, training, reading) get:
- `cursor-pointer` class
- `active:scale-[0.98] transition-transform` for tap feedback
- A `ChevronRight` icon (h-4 w-4, text-muted-foreground) appended to the right side of the row

Non-actionable blocks (work, commute, custom) remain as they are, with no cursor or chevron changes.

### No New Files Required

All changes are contained within `src/pages/Dashboard.tsx`. The existing `RoutineChecklistSheet` and `TrainingBlockSheet` components are reused without modification.

### Imports Added to Dashboard.tsx

- `RoutineChecklistSheet` from `@/components/calendar/RoutineChecklistSheet`
- `TrainingBlockSheet` from `@/components/calendar/TrainingBlockSheet`
- The `ChevronRight` icon is already imported

