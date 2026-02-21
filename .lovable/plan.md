

# AI Coaching Summary in Weekly Review Modal

## What You'll See

When you open the Weekly Review modal on the Profile tab, below the existing stats a coaching summary will auto-load. It streams in with a subtle loading state, then displays 3+ paragraphs of personalised feedback in the firm-but-fair Coach tone -- calling out what's going well, what needs work, and what to focus on next week.

The summary is cached for the entire week, so opening the modal again shows the same text instantly without burning AI credits.

## Architecture

```text
Modal opens
  --> Check cache table for this user + this week
      --> Hit? Show cached text immediately
      --> Miss? Call edge function --> stream AI response --> save to cache --> display
```

## Changes

### 1. New database table: `weekly_review_summaries`

Stores one cached summary per user per week.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | NOT NULL |
| week_start | date | NOT NULL (Sunday of that week) |
| summary_text | text | The generated coaching summary |
| created_at | timestamptz | Default now() |

- Unique constraint on (user_id, week_start) so only one summary per week
- RLS: users can SELECT, INSERT, UPDATE their own rows

### 2. New edge function: `weekly-review-summary`

- Receives the weekly performance data (training, habits, nutrition, weight, streak) plus user context from onboarding
- Builds a system prompt in the Coach persona with instructions to write a detailed, 3-paragraph review
- Calls Lovable AI (google/gemini-3-flash-preview) non-streaming (since we cache the full result)
- Returns the summary text
- Handles 429/402 errors gracefully

### 3. Update `WeeklyReviewModal.tsx`

- On open: check `weekly_review_summaries` for this user + current week
  - If found: display cached summary immediately
  - If not found: call the edge function with the weekly data, show a loading skeleton, then display and cache the result
- Summary appears below the existing stats section in a styled text block
- Subtle separator between stats and coaching text

### 4. Update `supabase/config.toml`

- Add the new `weekly-review-summary` function entry with `verify_jwt = false` (auth handled in code)

## Technical Details

### Edge Function Prompt Strategy

The prompt will include:
- All 5 metrics (training sessions, habit %, nutrition %, weight delta, streak)
- User's goals and friction points from onboarding data
- Instructions: 3 paragraphs, firm but fair, no fluff, reference specific numbers, end with one clear focus for next week

### Caching Logic

- Week start is calculated as Sunday (matching nutrition week)
- On first open each week, generates and saves
- Subsequent opens that week read from cache instantly
- No refresh button (per user preference for "cache for the week")

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Create `weekly_review_summaries` table with RLS |
| `supabase/functions/weekly-review-summary/index.ts` | New edge function for AI coaching summary |
| `supabase/config.toml` | Add function entry |
| `src/components/profile/WeeklyReviewModal.tsx` | Add cached AI summary section below stats |

