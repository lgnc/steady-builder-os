

# Add "Enter Shifts" Button for Shift/FIFO Workers

## Overview
Add a secondary floating action button (FAB) specifically for entering shifts, visible only to shift workers and FIFO workers. This replaces the current approach of tapping a `roster_reminder` block in the calendar grid (which can get lost or buried).

## What Changes

### Calendar FAB Area (lines ~848-855 in `Calendar.tsx`)
- Add a second FAB above the existing "+" button, styled with a clock icon, labeled for shift entry.
- This button is **only visible** when `isShiftWorker` or `isFifoUser` is true.
- The existing "+" button for adding events remains unchanged below it.
- The shift FAB opens the `ShiftEntrySheet` (same as before).

### Layout
- Shift FAB: positioned at `bottom-40` (above the Add Event FAB at `bottom-24`), slightly smaller or same size, with a distinct color accent (e.g. secondary/outline style or amber tint) so it's visually distinct from the main "+" button.
- Icon: `Clock` icon (already imported) to clearly indicate "shifts".

### Cleanup
- The `roster_reminder` block tap handler (line ~749-750) can remain as a secondary way to open it, but the FAB ensures it's always accessible.

## Technical Details

**File: `src/pages/Calendar.tsx`**
- After the existing FAB (line ~855), add a conditional second FAB:
  - Condition: `(isShiftWorker || isFifoUser)`
  - onClick: `setShiftEntryOpen(true)`
  - Icon: `Clock` from lucide-react (already imported on line 4 -- needs adding)
  - Position: `fixed bottom-40 right-4` to stack above the existing FAB
- No other files need changes.

