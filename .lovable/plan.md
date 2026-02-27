

# Fix: Work Hours Applied to Non-Standard Workers

## Problem
The onboarding defaults include `workStart: "09:00"`, `workEnd: "17:00"`, and `workDays: ["monday"..."friday"]`. These values persist even when you select Shift Work or FIFO, because the Work Step UI only shows the hours input for Standard workers but never clears the defaults. The schedule generator then uses those phantom values to create Work blocks and commutes for all users.

## Changes

### File: `src/pages/Onboarding.tsx`

1. **Clear work hours when work type changes to non-standard**: In the `WorkTypeStep` update handler (or via an effect watching `data.workType`), when the user selects `shift_work` or `fifo`, set `workStart: ""`, `workEnd: ""`, and `workDays: []`. When they select `standard`, restore the defaults.

2. **Guard the schedule generator**: At line ~466, change the `hasWork` condition to also require `data.workType === "standard"`:
   ```
   const hasWork = data.workType === "standard" 
     && data.workDays.includes(dayName) 
     && hasWorkHours;
   ```
   This single-line change ensures shift and FIFO workers never get phantom Work blocks from default values.

### File: `src/components/onboarding/WorkStep.tsx` (no changes needed)
The UI already correctly hides work hour inputs for non-standard workers. The fix is entirely in the data layer.

