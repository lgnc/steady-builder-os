
# Home / On-Site Mode Toggle for FIFO Workers

## The Problem
FIFO (fly-in fly-out) workers alternate between home periods and on-site periods with completely different schedules -- different shift lengths, sleep patterns, training options, and routines. Currently, the app only generates a single "home" schedule and has no way to switch to an on-site structure.

## Solution Overview
We'll build a **dual-schedule system** where FIFO users have two complete sets of schedule blocks stored in the database, and a toggle on the calendar to switch between them. The app will remember which mode is active per week.

---

## What Needs to Be Built

### 1. Database Changes

**New column on `schedule_blocks`:**
- `schedule_mode` (text, default `'home'`) -- values: `'home'` or `'on_site'`. This tags every block so we can filter by mode.

**New table: `user_schedule_mode`**
- `id` (uuid, primary key)
- `user_id` (uuid, not null)
- `week_start_date` (date, not null) -- which week this applies to
- `active_mode` (text, default `'home'`) -- `'home'` or `'on_site'`
- `created_at` (timestamptz, default now())
- Unique constraint on `(user_id, week_start_date)`
- RLS policies: users can only read/insert/update/delete their own rows

### 2. On-Site Schedule Generation (Onboarding)

During onboarding's `generateSchedule()` function, after building the home schedule (as it does now), generate a **second set of blocks** tagged with `schedule_mode: 'on_site'` using the FIFO-specific data:

- **Shift block**: 10 or 12 hours based on `fifoShiftLength`, placed according to `fifoShiftType` (day shift ~6am-6pm, night shift ~6pm-6am)
- **Sleep**: Adjusted for shift type -- day sleepers after night shift, normal sleep for day shift
- **Morning/evening routines**: Compressed versions (shorter, since time is limited)
- **Training**: Minimal or bodyweight-only session if time allows (many FIFO sites have a gym)
- **No commute blocks**: Workers are on-site, no driving

This only runs for users where `workType === 'fifo'`.

### 3. Calendar Toggle UI

Add a toggle component at the top of the Calendar page (visible only for FIFO users):
- Two-state toggle: **Home** | **On-Site**
- Persists the selection per week to the `user_schedule_mode` table
- When toggled, the calendar filters `schedule_blocks` by the active `schedule_mode`

### 4. Code Changes Summary

| File | Change |
|------|--------|
| **Migration SQL** | Add `schedule_mode` column to `schedule_blocks`; create `user_schedule_mode` table with RLS |
| **`src/pages/Onboarding.tsx`** | Tag all current blocks with `schedule_mode: 'home'`; add on-site block generation logic for FIFO users |
| **`src/pages/Calendar.tsx`** | Fetch active mode for current week; filter blocks by mode; add toggle UI for FIFO users |
| **`src/components/onboarding/FifoSiteStep.tsx`** | Optionally add fields for on-site gym availability and wake time preferences |

### 5. Technical Details

**Calendar block filtering:**
```text
Current flow:
  fetch schedule_blocks -> display all

New flow:
  fetch user's work_type from onboarding_data
  if FIFO:
    fetch active_mode from user_schedule_mode for current week (default: 'home')
    fetch schedule_blocks WHERE schedule_mode = active_mode
  else:
    fetch schedule_blocks (all are 'home' by default, backward compatible)
```

**On-site schedule builder logic (pseudocode):**
```text
For each day (Sun-Sat):
  if day shift:
    wake 05:00, shift 06:00-18:00, short routine, sleep 21:00
    training squeezed into 18:30-19:30 if gym available
  if night shift:
    wake 16:00, shift 18:00-06:00, sleep 07:00-15:00
    training in afternoon before shift if gym available
```

**Backward compatibility:**
- Existing blocks get `schedule_mode = 'home'` by default (via column default)
- Non-FIFO users never see the toggle
- No changes to how standard/shift workers experience the app
