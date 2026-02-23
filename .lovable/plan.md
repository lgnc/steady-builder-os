

# Replace Coach Chat with Daily Recap

## Overview
Remove the interactive AI coach chat and replace it with a "Daily Recap" feature -- a single-tap button that generates an AI coaching summary of your day and week so far. The summary covers what you've done, what's left, and gives encouragement in the Coach persona. It will be delivered as both text and an audio voice note.

## What You'll See

A floating button (replacing the chat bubble) that says something like "Get My Recap." Tapping it opens a bottom sheet that:

1. Gathers your current day's completion data (habits, training, nutrition, routines) and weekly stats
2. Sends it to a backend function that generates a personalised coaching recap
3. Displays the text summary with a play button to hear it as a voice note
4. Caches the result so re-opening doesn't regenerate (until data changes)

Example output: "Alright Michael, you're sitting at 60% for the day -- habits are ticked off, nice work getting those done early. No training today, it's a rest day, so your body's doing the work for you. Nutrition-wise, you've logged 2 of 3 meals. Get that last one in and you'll close out a clean day. For the week, you're tracking at 72% overall -- solid, but there's room to push. Keep the momentum."

## Technical Details

### 1. New Edge Function: `supabase/functions/daily-recap/index.ts`
- Accepts the user's auth token
- Fetches all today's data server-side: habits completed/total, training status, nutrition meals completed/total, routine completions, weekly aggregates
- Builds a prompt with the Coach persona (firm but fair, direct, no fluff)
- Calls Lovable AI (google/gemini-3-flash-preview) with `stream: false` to get a text recap
- Returns `{ recap: string }`

### 2. New Edge Function: `supabase/functions/recap-audio/index.ts`
- Accepts the recap text
- Calls ElevenLabs TTS API to generate audio (requires ElevenLabs connector)
- Returns the audio as binary MP3
- Falls back gracefully if ElevenLabs is not connected (text-only mode)

### 3. New Component: `src/components/dashboard/DailyRecap.tsx`
- Replaces `CoachChat` in the Dashboard
- Floating button at bottom-right (same position as old chat FAB)
- On tap, opens a bottom sheet (using the existing Sheet component)
- Shows loading skeleton while generating
- Displays the recap text
- Play/pause button for audio playback (if available)
- "Refresh" button to regenerate if user wants updated data

### 4. Update `src/pages/Dashboard.tsx`
- Remove `CoachChat` import and usage
- Add `DailyRecap` component in its place
- Pass current completion data (completionPct, weeklyCompletion, habitCounts, nutritionCounts, anchorCompletions, isTrainingDay) as props so the recap function has context

### 5. Update `supabase/config.toml`
- Add `daily-recap` function entry with `verify_jwt = false`
- Add `recap-audio` function entry with `verify_jwt = false`

### 6. ElevenLabs Integration (for voice)
- Use the ElevenLabs connector to set up TTS
- Voice: a calm, authoritative male voice (e.g., "Brian" or "Daniel")
- If the user hasn't connected ElevenLabs, the feature works text-only with a note saying "Voice coming soon" or prompting connector setup

### Files to Create
- `supabase/functions/daily-recap/index.ts`
- `supabase/functions/recap-audio/index.ts`
- `src/components/dashboard/DailyRecap.tsx`

### Files to Modify
- `src/pages/Dashboard.tsx` (swap CoachChat for DailyRecap)

