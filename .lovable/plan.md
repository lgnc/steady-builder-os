

# Onboarding Flow Restructure: Work Type First

## The Problem

Currently the onboarding starts with Sleep & Recovery before asking what kind of worker someone is. This means sleep/schedule questions are asked without context — we don't yet know if they're a FIFO worker who alternates between home and site, a shift worker whose hours change weekly, or a standard 9-to-5.

## The Solution

Move **Work Type** to Step 1, then branch the remaining flow based on the answer. Each worker type gets a tailored path that collects only the information relevant to them.

## New Step Order

### Step 1 (all users): Work Type
Pick Standard / Shift Worker / FIFO — this drives the rest of the flow.

### Standard Worker Path (13 steps)
| Step | Screen |
|------|--------|
| 1 | Work Type |
| 2 | Sleep & Recovery |
| 3 | Work & Availability (standard fields: work hours, flexible toggle, training window, training days, rest days) |
| 4 | Planning Ritual |
| 5 | Your Commutes |
| 6 | Training Experience |
| 7 | Select Program |
| 8 | Your Goals |
| 9 | 8-Week Goals |
| 10 | Current State |
| 11 | Body & Nutrition |
| 12 | Habits |
| 13 | Review & Install |

This is essentially the current flow with steps 1 and 2 swapped.

### Shift Worker Path (13 steps)
| Step | Screen |
|------|--------|
| 1 | Work Type |
| 2 | Sleep & Recovery |
| 3 | Work & Availability (shift worker variant: no work hours fields, info about weekly shift input, training window, training days, rest days) |
| 4 | Planning Ritual |
| 5 | Your Commutes |
| 6 | Training Experience |
| 7 | Select Program |
| 8 | Your Goals |
| 9 | 8-Week Goals |
| 10 | Current State |
| 11 | Body & Nutrition |
| 12 | Habits |
| 13 | Review & Install |

Same step count but the Work & Availability step shows shift-worker-specific content (already handled by WorkStep). A note will reinforce that they'll be prompted each week to input their upcoming shifts.

### FIFO Worker Path (14 steps)
| Step | Screen |
|------|--------|
| 1 | Work Type |
| 2 | Sleep & Recovery (Home) |
| 3 | FIFO Site Details (shift length, shift type, on-site sleep/wake patterns) |
| 4 | Work & Availability — Home (training window, training days, rest days for home periods) |
| 5 | Planning Ritual |
| 6 | Your Commutes |
| 7 | Training Experience |
| 8 | Select Program |
| 9 | Your Goals |
| 10 | 8-Week Goals |
| 11 | Current State |
| 12 | Body & Nutrition |
| 13 | Habits |
| 14 | Review & Install |

FIFO gets an extra step dedicated to on-site configuration. The schedule builder will generate a **home routine** by default, and users can toggle to on-site mode from the calendar (already mentioned in the existing UI copy).

## Technical Changes

### 1. `src/pages/Onboarding.tsx`
- Change `TOTAL_STEPS` to be dynamic based on `data.workType` (13 for standard/shift, 14 for FIFO)
- Reorder step rendering: Step 1 renders `WorkTypeStep`, subsequent steps use a mapping function that returns the correct component based on work type
- Update `stepTitles` to be computed dynamically
- Update progress bar to use the dynamic total
- The `handleNext` logic and `completeOnboarding` remain the same — just the step-to-component mapping changes

### 2. `src/components/onboarding/WorkTypeStep.tsx`
- Minor copy update: change subtitle to emphasize this choice shapes the entire onboarding path

### 3. New: `src/components/onboarding/FifoSiteStep.tsx`
- A new step for FIFO workers to configure on-site details (shift length, shift type, on-site wake time, on-site sleep duration)
- Extracted from the current FIFO fields in `WorkStep.tsx`

### 4. `src/components/onboarding/WorkStep.tsx`
- Remove the FIFO-specific fields (shift length, shift type) — those move to `FifoSiteStep`
- The step already adapts its content based on `data.workType`, so it will continue showing the right fields for standard vs shift worker

### 5. `src/components/onboarding/SleepStep.tsx`
- For FIFO users, label the step as "Sleep & Recovery (Home)" to make it clear this is their home-period sleep schedule

### 6. `src/components/onboarding/BuildingPlanScreen.tsx`
- Update stage text to reference work type context (e.g., "Building your home routine..." for FIFO)

### 7. `src/components/onboarding/ReviewStep.tsx`
- Update to show FIFO-specific details (home vs site configuration) in the summary

