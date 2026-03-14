

# Betterment OS — Project Dossier

## 1. What It Is

Betterment OS is a mobile-first life-structuring web application for men, built on the mantra "Structure equals freedom." It auto-generates a time-blocked weekly schedule from onboarding inputs (sleep, work, training, commutes) and provides daily execution tools across training, nutrition, journaling, and habits. The app enforces an 8-week commitment model — no program hopping.

**Tech stack:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion + Lovable Cloud (Supabase backend). No SSR, no native wrapper — pure SPA served as a web app.

---

## 2. What Has Been Built

### Core Pages (10 routes)
| Page | Status | Description |
|------|--------|-------------|
| **Index** | Complete | Landing page with hero, feature cards, CTA |
| **Auth** | Complete | Email/password sign-up and sign-in with Zod validation, email confirmation flow |
| **Onboarding** | Complete | 13-14 step wizard (varies by work type). Collects sleep, work, training, nutrition, goals, habits, friction points. Generates full schedule on completion. |
| **Dashboard** | Complete | Daily view with anchor blocks (morning routine, training, reading, evening routine), daily completion %, weekly progress bars, nutrition macro tracker, 8-week goals card, daily weight tracker, bonus material section, 28-day review trigger |
| **Calendar** | Complete | Full 7-day week view with draggable/resizable time blocks. Supports FIFO mode toggle (home/on-site), shift entry for shift workers, block overrides per week, scheduled workout generation |
| **Training** | Complete | Program overview showing training days with completion status, links to workout page |
| **Workout** | Complete | Per-exercise set logging with weight/reps/duration inputs, PB detection, warm-up checklist, mobility block, form cues, workout summary modal. Session anchored to scheduled_workout_id for reliable data isolation |
| **Nutrition** | Complete | AI-generated weekly meal plans, daily/weekly views, meal completion tracking, meal swapping, favourite meals, shopping list, macro progress. Gated "Customise — Pro" feature |
| **Journal** | Complete | Morning primer and evening reflection with 3 prompts each, streak tracking |
| **Profile** | Complete | User stats, 8-week goals display (locks after 7 days), weekly performance card with AI coach review, 28-day review modal, sign-out |

### Backend Functions (5 edge functions)
| Function | Purpose |
|----------|---------|
| `coach-chat` | Streaming AI chat with personalized system prompt from onboarding data. Uses Lovable AI gateway (Gemini 3 Flash) |
| `daily-recap` | AI-generated daily recap |
| `generate-nutrition-plan` | AI-generated 7-day meal plan based on macros, dietary filters, allergies |
| `swap-meal` | Replaces a single meal slot in an existing plan |
| `weekly-review-summary` | AI-generated 3-paragraph weekly coaching review using performance metrics + onboarding context |

### Database (26 tables)
Full schema with RLS on every table. Key tables: `onboarding_data`, `schedule_blocks`, `schedule_block_overrides`, `shift_entries`, `user_schedule_mode`, `training_days`, `training_exercises`, `training_programs`, `user_training_schedule`, `workout_sessions`, `workout_sets`, `scheduled_workouts`, `habits`, `habit_completions`, `routine_checklist_items`, `routine_checklist_completions`, `journal_entries`, `streaks`, `reading_logs`, `daily_weights`, `nutrition_profiles`, `meal_plans`, `meal_completions`, `favourite_meals`, `user_eight_week_goals`, `day28_reviews`, `profiles`, `weekly_review_summaries`, `workout_logs`.

### Key Subsystems
- **Schedule generator** (~300 lines in Onboarding.tsx): Builds morning routine, commutes, work, training, evening routine, sleep, strategy ritual, and roster reminder blocks across all 7 days, respecting training window preference (morning/afternoon/evening) and work-gym-home commute logic.
- **Shift schedule builder** (~670 lines in `shiftScheduleBuilder.ts`): Rebuilds entire day around shift entries with transition awareness (day→night, night→off, etc.), pre-shift naps, recovery sleep, and training cluster placement.
- **Block drag & resize** (custom hooks): Touch and mouse support for rearranging calendar blocks.
- **Onboarding deduplication**: Full wipe of 12+ tables on re-onboarding to prevent stale data.

---

## 3. What Is Left to Build

### Not yet implemented
- **Push notifications / reminders** — No service worker, no notification API integration. Users have no way to receive time-based prompts outside the app.
- **Progressive Web App (PWA) shell** — No manifest.json, no offline support, no install prompt. Critical for the "daily OS" positioning.
- **Settings / profile editing** — Users cannot change sleep times, commute durations, or training window after onboarding without re-running the entire wizard.
- **Data export** — No way for users to export workout logs, journal entries, or progress data.
- **Social / accountability** — No shared goals, no partner features, no community layer.
- **Payment / subscription** — "Pro" and upgrade modals exist as UI shells but have no Stripe integration or gating logic.
- **Admin / content management** — Training programs and exercises are seed data with no admin interface for adding or modifying them.
- **Onboarding resume** — If a user abandons mid-onboarding and returns, the step is saved but the *data* from partially completed steps is not persisted until final submission.
- **Historical analytics / charts** — No weight trend charts, no training volume progression graphs, no habit streaks over time visualization.
- **Dark/light theme toggle** — CSS supports dark mode but there's no user-facing toggle (uses system preference only).

### Partially implemented
- **Weekly review** — AI summary generates but the underlying data aggregation (habit %, nutrition %) uses rough estimates rather than precise per-day calculations.
- **28-day review** — Modal and data model exist; results modal renders saved data. The trigger logic (`useDay28Review`) is implemented but the actual metric aggregation hasn't been verified for accuracy.
- **Reading log** — Sheet exists, data saves, but reading is "folded into evening routine" in the calendar and has no standalone tracking view.
- **Bonus material** — Component exists on dashboard but content source/structure is unclear.
- **Favourite meals** — Can save/unsave but no "use favourite instead" flow when generating new plans.

---

## 4. Key Areas of Concern

### A. Onboarding complexity and fragility
The `generateSchedule()` function in `Onboarding.tsx` is ~350 lines of imperative block-building logic with deeply nested conditionals for morning/afternoon/evening training windows, gym-to-work-direct paths, and work/no-work days. This is the single most fragile part of the codebase. Any new work type, commute variant, or schedule pattern requires touching multiple branches. It has already produced bugs (phantom shifts, suboptimal training distribution) that required multiple fix iterations.

**Risk:** Every new feature that touches scheduling (e.g., "add a second training session", "support split shifts") requires modifying this monolith. There is no test coverage.

### B. Stale data / re-onboarding integrity
The deduplication cleanup now covers 12+ tables, but the approach is brute-force: delete everything and regenerate. If any new table is added that references user schedule data and isn't included in the cleanup list, it will produce stale data bugs identical to the shift_entries issue.

### C. No test coverage
Zero automated tests (the only test file is `src/test/example.test.ts` which is a placeholder). For an app where schedule generation correctness is critical, the absence of unit tests for `generateSchedule()` and `rebuildDayAroundShift()` is a significant risk.

### D. Schedule generation runs client-side
All schedule block generation happens in the browser during onboarding. This means:
- The logic cannot be reused server-side (e.g., for a "regenerate my schedule" API).
- If the user closes the browser during the building screen, partial data may be written.
- The 350+ lines of scheduling logic inflates the client bundle.

### E. Type safety gaps
Multiple `as any` casts throughout the codebase (particularly in Supabase queries and the schedule builder), bypassing TypeScript's protection. The auto-generated `types.ts` doesn't cover `scheduled_workouts`, `workout_sets`, or `user_schedule_mode` properly, leading to widespread type assertions.

### F. Performance on Calendar page
The Calendar page (1070 lines) runs multiple cascading useEffects: fetch blocks → fetch overrides → fetch shift entries → compute effectiveBlocks → generate scheduled workouts. Each week navigation triggers the full cascade. No query caching via React Query (despite it being installed).

---

## 5. Architectural Ceiling — Where It Runs Out of Room

### Single-file page architecture
Most pages are 300-1000+ line single files mixing data fetching, state management, business logic, and rendering. As features grow (e.g., adding drag-to-reschedule on dashboard, inline editing of nutrition), these files will become unmanageable. The codebase would benefit from extracting:
- Data-fetching into React Query hooks
- Business logic into pure utility functions
- State into dedicated stores or context providers

### No abstraction over schedule generation
The schedule builder is hardcoded for 3 work types. Adding a 4th (e.g., "freelancer with variable hours") requires duplicating large blocks of conditional logic. A declarative schedule template system would scale better.

### Edge function architecture
All 5 edge functions are standalone with duplicated auth boilerplate (~20 lines each). A shared middleware pattern would reduce duplication and make adding new functions faster.

### No offline capability
As a "daily operating system," the app is unusable without internet. The architecture (direct Supabase queries from components) doesn't support offline-first patterns without significant refactoring to add a local cache layer.

### Database query patterns
Components make 5-15 individual Supabase queries per page load with no batching, no caching (React Query exists in deps but isn't used for data fetching), and no optimistic updates. This will degrade performance as data volume grows.

### No multi-week / historical view
The data model stores `week_start_date` on training schedules but there's no mechanism to view or compare across weeks. The 8-week structure is conceptual but not enforced in data — there's no "program start date" or "current week number" tracked anywhere.

---

## 6. Summary Stats

| Metric | Value |
|--------|-------|
| Pages | 10 |
| Components | ~45 |
| Edge functions | 5 |
| Database tables | 26+ |
| Migrations | 30 |
| Lines of code (pages) | ~6,000 |
| Lines of code (total src) | ~12,000 est. |
| Test coverage | 0% |
| Authentication | Email/password with email confirmation |
| AI integrations | 3 (coach chat, nutrition plan, weekly review) |
| Payment integration | None (UI shells only) |

