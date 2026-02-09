

# Onboarding Flow Overhaul (11 steps to 12 steps)

## Summary

Update the existing onboarding to add weekday/weekend wake times, FIFO shift details, preferred training days, expanded nutrition inputs, and a new dedicated Habits step (Step 11). The Review step moves to Step 12.

---

## Step-by-Step Changes

### Step 1 -- Sleep & Recovery (SleepStep.tsx)
- Replace single `wakeTime` with `weekdayWakeTime` and `weekendWakeTime` inputs
- Auto-calculate separate weekday and weekend bedtimes
- Add call-out card: "Aim to keep weekend wake times within 2 hours of weekdays to protect sleep quality and circadian rhythm."
- Add dynamic helper text based on the weekday wake time entered

### Step 2 -- Work Type (no changes)

### Step 3 -- Work & Availability (WorkStep.tsx)
- Add FIFO on-site fields when `workType === "fifo"`:
  - Shift length selector: 10h or 12h
  - Shift type selector: Days or Nights
- Add "Preferred training days" -- a day-of-week multi-select (similar to rest days) so users explicitly pick which days they want to train
- Keep existing: work hours (standard), flexible toggle, training window, rest days
- Add validation: prevent selecting the same day as both a training day and rest day

### Step 5 -- Commutes (GymCommuteStep.tsx)
- The "gym to work direct" toggle already exists for morning trainers -- no change needed (matches the spec)

### Step 6 -- Training Experience (TrainingStep.tsx)
- Add reassurance copy at the bottom: "You can upgrade or downgrade your training level at any time based on recovery, fatigue, and stimulus."

### Step 7 -- Program Selection (ProgramStep.tsx)
- Add "Duration: 8 weeks" badge to each program card (currently only shows days/week and type)

### Step 10 -- Body & Nutrition (NutritionStep.tsx)
- Add gender selector (Male / Female) at the top of the stats section
- Add dietary preferences section below activity level:
  - Dietary choices: multi-select pills (Omnivore, Vegetarian, Vegan, Pescatarian, Keto, Paleo)
  - Allergies: text input for free-form entry
  - Sensitivities: text input for free-form entry

### Step 11 -- Habits (NEW: HabitsStep.tsx)
- New step inserted between Nutrition and Review
- Two sections:
  - **Habits to Introduce** (build type): pre-populated with Reading, No screens before bed, No coffee for 1 hour after waking, No social media within 1 hour of waking. Users can edit, delete, or add custom items.
  - **Habits to Break** (break type): pre-populated with Porn, Doom scrolling, Vaping, Screens before bed. Users can edit, delete, or add custom items.
- On "Install Structure", these are seeded into the `habits` table (same table used by the Dashboard habit tracker) instead of the current lazy-load defaults

### Step 12 -- Review & Install (ReviewStep.tsx)
- Add Habits summary card showing selected build and break habits
- Update sleep card to show weekday and weekend wake times separately
- Add FIFO shift details to the work card when applicable

---

## Database Migration

New columns on `onboarding_data`:

| Column | Type | Default | Notes |
|---|---|---|---|
| weekend_wake_time | time | '07:00' | Weekend wake time |
| weekend_bedtime | time | null | Auto-calculated |
| preferred_training_days | text[] | '{}' | Days user wants to train |
| fifo_shift_length | integer | null | 10 or 12 (hours), FIFO only |
| fifo_shift_type | text | null | 'days' or 'nights', FIFO only |
| gender | text | null | 'male' or 'female' |
| dietary_choices | text[] | '{}' | Selected dietary preferences |
| allergies | text | null | Free-form text |
| sensitivities | text | null | Free-form text |
| onboarding_habits_build | text[] | '{}' | Build habits from onboarding |
| onboarding_habits_break | text[] | '{}' | Break habits from onboarding |

No new tables needed -- habits from Step 11 seed into the existing `habits` table on completion.

---

## Files Changed

| File | Action |
|---|---|
| `src/pages/Onboarding.tsx` | Update `OnboardingData` interface with new fields, update `defaultData`, change `TOTAL_STEPS` to 12, add Step 11 rendering, update `completeOnboarding` to save new fields and seed habits, update bedtime calculation for weekday/weekend, rename `wakeTime` to `weekdayWakeTime` |
| `src/components/onboarding/SleepStep.tsx` | Weekday + weekend wake time inputs, dual bedtime display, circadian warning callout |
| `src/components/onboarding/WorkStep.tsx` | Add FIFO shift length/type selectors, add preferred training days multi-select, validation against rest days |
| `src/components/onboarding/TrainingStep.tsx` | Add reassurance copy at bottom |
| `src/components/onboarding/ProgramStep.tsx` | Add "8 weeks" duration badge to each card |
| `src/components/onboarding/NutritionStep.tsx` | Add gender selector, dietary choices pills, allergies/sensitivities text inputs |
| `src/components/onboarding/HabitsStep.tsx` | **New file** -- build/break habit lists with add/edit/delete |
| `src/components/onboarding/ReviewStep.tsx` | Add habits card, update sleep card for dual times, add FIFO details |

### Schedule Generation Impact

- The `generateSchedule` function in `Onboarding.tsx` will use `weekdayWakeTime` for weekday schedules. Weekend blocks will use `weekendWakeTime` and `weekendBedtime`.
- `preferredTrainingDays` will replace the current auto-assignment logic (which uses available non-rest days). Training days from the selected program will map to the user's explicitly chosen training days.
- FIFO shift details are stored for future use but do not change the MVP schedule generation (FIFO users build their home schedule first, as currently designed).

### Habit Seeding on Completion

Instead of lazy-loading default habits on first Dashboard visit, the `completeOnboarding` function will:
1. Insert all build habits from Step 11 into `habits` with `habit_type = 'build'`
2. Insert all break habits from Step 11 into `habits` with `habit_type = 'break'`
3. The Dashboard `DailyHabits` component will skip default seeding if habits already exist (which they will after onboarding)

