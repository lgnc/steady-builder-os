

# Sliding Scale Goals in Onboarding Step 9

## Overview

Replace the static preset buttons for Weight Loss, Bench Press, Squat, Deadlift, and Pull-ups with slider controls so users can dial in their exact target. Consistency, Habits, and Nutrition stay as preset button selections (80% / 90%).

## Changes

### File: `src/components/onboarding/EightWeekGoalsStep.tsx`

**1. Update the data model for goal categories**

Split categories into two types:
- **Slider categories** (weight_loss, bench_press, squat, deadlift, pull_ups) -- each gets a `min`, `max`, `step`, and `unit` instead of `presets`
- **Preset categories** (consistency, habits, nutrition) -- keep the existing button-based selection

```text
Slider configs:
- Weight Loss:   1kg - 20kg,   step 0.5,  label "Lose {value}kg"
- Bench Press:   60kg - 300kg, step 5,    label "Bench {value}kg"
- Squat:         60kg - 300kg, step 5,    label "Squat {value}kg"
- Deadlift:      60kg - 300kg, step 5,    label "Deadlift {value}kg"
- Pull-ups:      1 - 20,      step 1,    label "{value} pull-ups"
```

**2. Update the UI for slider categories**

When a user taps a slider category to add it:
- Show the category row with a Radix `Slider` component
- Display the current value prominently next to the slider
- An "Add" button confirms the selection and adds it to goals
- Uses the existing `src/components/ui/slider.tsx` component

**3. Preset categories remain unchanged**

Consistency, Habits, and Nutrition keep their current button-based UI with 80%/90% options.

**4. Selected goals display**

No changes to the selected goals section at the top -- it already shows the label and an X to remove.

## Technical Details

- Import `Slider` from `@/components/ui/slider`
- Add a `useState` for tracking which slider category is currently being configured and its draft value
- Generate the `goal_label` dynamically from the slider value (e.g., slider at 75 for bench = "Bench 75kg")
- No database or other file changes needed -- the goal data shape (`goal_type`, `goal_label`, `target_value`) stays the same
