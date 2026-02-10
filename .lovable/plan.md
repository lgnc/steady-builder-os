

# 365 Daily Stoic Quotes -- Moved to Header

## What Changes

1. **New data file**: Create `src/data/dailyQuotes.ts` containing an array of 365 quotes covering stoicism, discipline, motivation, introspection, confidence, masculinity, personal responsibility, and direction in life. Each entry has `text` and `author`. Sources include Marcus Aurelius, Seneca, Epictetus, Jocko Willink, David Goggins, Jordan Peterson, Theodore Roosevelt, Miyamoto Musashi, Ryan Holiday, and others.

2. **Quote selection logic**: Use the day-of-year (1--365) as the array index so every calendar day shows a unique quote, and it resets annually. Deterministic -- no randomness, same quote on the same date for every user.

3. **Move quote into the header**: The current bottom-of-page quote section gets removed. Instead, the greeting header area becomes a two-column layout:
   - **Left**: "Good morning" / "Good evening" + date (unchanged)
   - **Right**: The daily quote in small italic text with the author beneath it, right-aligned

4. **No database needed**: The quotes live as a static TypeScript array. No API calls, no tables.

---

## Technical Detail

### New file: `src/data/dailyQuotes.ts`

A single exported array of 365 objects: `{ text: string; author: string }`. The quotes will be hand-curated across themes: stoicism, discipline, adversity, self-mastery, purpose, masculinity, responsibility, introspection, confidence.

Helper function:

```typescript
export function getTodayQuote(): { text: string; author: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}
```

### Modified file: `src/pages/Dashboard.tsx`

- Import `getTodayQuote` from the data file
- Restructure the header `<motion.header>` into a flex row with the greeting on the left and the quote on the right
- Remove the "Daily Quote" `<motion.section>` at the bottom of the page

The header will look roughly like:

```
Good evening                    "He who has a why to live
Tuesday, February 10             can bear almost any how."
                                           -- Nietzsche
```

### Quote Themes (spread across 365 entries)

- Stoic philosophy (Marcus Aurelius, Seneca, Epictetus) -- ~80 quotes
- Discipline and self-mastery (Jocko Willink, David Goggins, Musashi) -- ~60 quotes
- Personal responsibility and direction (Jordan Peterson, Viktor Frankl) -- ~50 quotes
- Masculinity and strength (Theodore Roosevelt, Hemingway) -- ~40 quotes
- Introspection and self-knowledge (Socrates, Lao Tzu, Emerson) -- ~50 quotes
- Motivation and adversity (Churchill, Mandela, Aurelius) -- ~45 quotes
- Confidence and action (Napoleon, Caesar, Patton) -- ~40 quotes

