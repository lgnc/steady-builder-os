

# Calendar Enhancements: Workout Rescheduling and Custom Events

## Overview

Two features for the calendar:

1. **Workout Rescheduling** -- A deliberate "Reschedule" action when tapping a training block, allowing users to move workouts to a different day via a day picker with a confirmation step. Adds friction to prevent casual changes.

2. **Custom Calendar Events** -- A `+` button on the calendar that opens a creation sheet where users can add personal events (social, meetings, extracurriculars) with a title, day, and time range. These appear as a new block type on the calendar for time-blocking visibility.

---

## Feature 1: Workout Rescheduling

### Current Behavior
Tapping a training block immediately navigates to `/workout/:trainingDayId`. There is no way to move a workout to a different day.

### New Behavior
Tapping a training block now opens a **detail sheet** (bottom sheet) instead of immediately navigating. This sheet shows:
- The workout name and time
- A prominent **"Start Workout"** button (navigates to the workout page, same as before)
- A **"Reschedule"** button below it (secondary action)

When "Reschedule" is tapped:
- The sheet transitions to show a **day-of-week picker** (7 day buttons: Mon-Sun)
- Days that already have a training session are shown but marked (so the user can see conflicts)
- A **"Confirm Reschedule"** button finalizes the move
- The training block (plus its linked commute blocks) moves to the new day
- Both `schedule_blocks.day_of_week` and `user_training_schedule.day_of_week` are updated in the database

This creates intentional friction: tap the block, see the sheet, choose "Reschedule", pick a day, confirm. Four deliberate steps.

### Files
| File | Action |
|------|--------|
| `src/components/calendar/TrainingBlockSheet.tsx` | Create -- bottom sheet with workout details, Start Workout button, and Reschedule flow |
| `src/pages/Calendar.tsx` | Modify -- replace direct navigation on training block tap with opening the new sheet |

---

## Feature 2: Custom Calendar Events

### Behavior
- A **`+` floating action button** appears at the bottom-right of the calendar view (above the bottom nav)
- Tapping it opens a **creation sheet** (bottom sheet) with:
  - **Title** text input (required)
  - **Day of week** picker (7 day buttons, defaults to today's day)
  - **Start time** and **End time** selectors (scrollable time pickers in 15-minute increments)
- On save, a new `schedule_block` is inserted with `block_type = "custom"`, `is_locked = false`
- The block appears on the calendar immediately with a distinct color
- Custom blocks can be **dragged** (time adjustment, same as other blocks) and **deleted**
- Tapping a custom block opens the existing block detail modal, which will now include a **"Delete"** button for custom blocks only

### Color
Custom blocks get a new color entry: a teal/cyan shade to differentiate from system blocks:
`bg-teal-500/20 border-teal-500/50 text-teal-300`

### Files
| File | Action |
|------|--------|
| `src/components/calendar/AddEventSheet.tsx` | Create -- bottom sheet with title, day picker, and time selectors |
| `src/pages/Calendar.tsx` | Modify -- add FAB button, add custom block color, add delete action to block detail modal, wire up the add event sheet |

---

## Technical Details

### Database
No schema changes needed. The existing `schedule_blocks` table already supports everything:
- `block_type` is a text field (will use `"custom"` for user-created events)
- `is_locked` defaults to `false`
- `training_day_id` will be `null` for custom events
- All existing RLS policies already cover CRUD operations for the user's own blocks

### Training Block Sheet (`TrainingBlockSheet.tsx`)
- Uses the existing `Sheet` component (bottom sheet pattern, same as `RoutineChecklistSheet`)
- Two views: "details" (default) and "reschedule" (day picker)
- The day picker shows 7 buttons (Sun-Sat) with the current day highlighted
- On confirm: updates all linked blocks (training + commute) to the new `day_of_week` via Supabase, and also updates the corresponding `user_training_schedule` row
- Overlap validation: checks if the new day has time conflicts before allowing the move

### Add Event Sheet (`AddEventSheet.tsx`)
- Uses the `Sheet` component for consistency
- Time selection uses simple hour/minute dropdowns or a scrollable list in 15-minute increments (5:00 AM to 11:00 PM range)
- Validates that end time is after start time and that there are no overlaps with existing blocks on the chosen day
- On save: inserts into `schedule_blocks` and updates local state

### Calendar Page Changes
- Training block click: opens `TrainingBlockSheet` instead of navigating
- Block detail modal (for non-training, non-routine blocks): adds a "Delete" button for `block_type === "custom"` blocks, which removes the block from the database and local state
- New FAB (`+` button) at bottom-right, fixed position above the bottom nav
- Legend updated to include "Custom" block color indicator
- Color map updated with `"custom"` entry

### Summary of All File Changes

| File | Action |
|------|--------|
| `src/components/calendar/TrainingBlockSheet.tsx` | Create |
| `src/components/calendar/AddEventSheet.tsx` | Create |
| `src/pages/Calendar.tsx` | Modify |

