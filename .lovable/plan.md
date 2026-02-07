

# AI Coach Chat on the Today Tab

## Overview

Add a collapsible chat widget to the Dashboard (Today tab) that lets users ask their AI coach questions about training, nutrition, routines, and general self-improvement. The coach will have access to the user's personal data (goals, macro targets, training program, schedule) to give tailored advice.

## How It Will Work

1. A floating chat button (with a message icon) will sit at the bottom-right of the Today tab, above the navigation bar.
2. Tapping it opens a chat panel that slides up, taking roughly the bottom two-thirds of the screen.
3. Users type a question (e.g., "How many grams of carbs should I have before training?") and get a streaming response from the AI coach.
4. The coach persona is calm, supportive but firm -- a seasoned operator, not a motivational hype-man.
5. The chat is session-based (resets when you leave the page). No conversation history is persisted to the database.

## What the Coach Knows About You

The edge function will fetch the user's onboarding data to inject into the system prompt, giving the coach awareness of:
- Goals (primary and secondary)
- Weight, height, activity level
- Macro targets (protein, carbs, fat, calories)
- Training program and experience tier
- Sleep schedule (wake time, bedtime, duration)
- Work schedule and type
- Friction points and stress level

## Visual Design

- Floating action button: circular, uses the app's primary color, with a `MessageCircle` icon
- Chat panel: dark surface card style consistent with the app's design system, with a header bar ("Coach"), a scrollable message area, and a text input with send button
- Messages styled with subtle differentiation: user messages right-aligned, coach messages left-aligned
- Streaming text appears token-by-token for a natural feel
- A close/minimize button on the chat header to collapse it back to the floating button

---

## Technical Details

### 1. Backend Edge Function (`supabase/functions/coach-chat/index.ts`)

- Receives the user's messages array and their user ID (from auth token)
- Fetches the user's `onboarding_data` from the database to build a personalized system prompt
- Calls the Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with `google/gemini-3-flash-preview` model
- Streams the response back via SSE
- Handles 429 (rate limit) and 402 (payment required) errors gracefully

### 2. Chat Component (`src/components/dashboard/CoachChat.tsx`)

- Self-contained component with its own state for messages, loading, and open/closed
- Uses the streaming pattern: parses SSE line-by-line, renders tokens as they arrive
- Accepts the user's auth session to pass the authorization header
- Auto-scrolls to the latest message
- Input field with send button; disabled while the coach is responding

### 3. Dashboard Integration (`src/pages/Dashboard.tsx`)

- Import and render `CoachChat` inside the `MobileLayout`, positioned as a fixed overlay above the bottom nav
- Minimal changes to the existing Dashboard code

### 4. Config Update (`supabase/config.toml`)

- Register the new `coach-chat` edge function with `verify_jwt = true` (only authenticated users can use it)

### Files Changed / Created

| File | Action |
|------|--------|
| `supabase/functions/coach-chat/index.ts` | Create |
| `src/components/dashboard/CoachChat.tsx` | Create |
| `src/pages/Dashboard.tsx` | Modify (add CoachChat component) |
| `supabase/config.toml` | Modify (register edge function) |

