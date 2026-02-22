

## "Building Your Plan" Loading Screen

### Overview
After tapping "Install Structure" on the final onboarding step, a full-screen animated loading sequence will play while the backend work runs in parallel. The screen creates a premium "labor illusion" -- making the system feel like it's doing serious, personalised work.

### The User Experience
- User taps "Install Structure" on step 13
- Screen transitions to a dark, full-screen loading view
- 5 personalised stages animate in sequence, each lasting ~3 seconds (~15 seconds total)
- A smooth progress bar advances across the bottom
- Once both the animation AND backend work are complete, the user is taken to the dashboard

### The 5 Stages (personalised to user inputs)
1. "Analysing your schedule..." (references work hours if provided)
2. "Building your training blocks..." (references selected program)
3. "Placing sessions around your commitments..." (references training window)
4. "Calibrating your 8-week targets..." (references goal count)
5. "Finalising your operating system..."

Each line fades in with a subtle upward motion, holds, then fades out before the next appears. A pulsing icon (Loader2) gives a sense of active processing.

### Files Changed

**New file: `src/components/onboarding/BuildingPlanScreen.tsx`**
- Full-screen component using framer-motion for stage transitions
- Accepts `onComplete` callback and `data` prop (to personalise messages)
- Cycles through 5 stages on a 3-second timer
- Renders the existing `ProgressBar` component advancing smoothly
- Calls `onComplete` after all stages finish

**Modified file: `src/pages/Onboarding.tsx`**
- Add `showBuildingScreen` boolean state
- In `completeOnboarding()`: after saving onboarding data, set `showBuildingScreen = true` and kick off backend work (`generateSchedule`, `seedHabits`, etc.) in parallel, storing a `backendDone` ref when they finish
- In the render: when `showBuildingScreen` is true, render `BuildingPlanScreen` instead of the step UI
- The `onComplete` callback checks `backendDone` -- if backend is still running, it waits; otherwise navigates to `/dashboard`
- The toast ("Structure installed") fires on navigation, not during the loading screen

