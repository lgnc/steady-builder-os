

# Dynamic Primary Action Button

Add a single context-aware CTA button to the Dashboard, placed directly after the progress tiles section. It uses existing state (`anchorCompletions`, `todayBlocks`, `currentTime`) -- no new data fetching needed.

---

## Logic

A `useMemo` function evaluates priority rules against current state:

| Priority | Condition | Label | Action |
|---|---|---|---|
| A | Hour 4-11 AND morning_routine block exists AND not completed | Start Morning Primer | Open morning routine sheet |
| B | Training block exists AND not completed AND hour 12-17 | Start Workout | Open training sheet or navigate to /training |
| B2 | Training block exists AND not completed AND hour 18-3 | Finish Today's Training | Same action as B |
| C | Hour 18-3 AND evening_routine block exists AND not completed | Complete Evening Reflection | Open evening routine sheet |
| D | All done or nothing applies | Review Today | Scroll to anchors section |

When viewing a non-today date: same rules apply but time window is ignored (show first incomplete item, or default). Future dates show "View Today's Plan" only.

---

## UI

A single full-width button inserted between the progress tiles section (line ~402) and the Daily Habits section (line ~404). Uses the existing `hero` button variant for visual emphasis.

```text
[icon] Start Morning Primer    ->
```

- Icon changes per state (Sun, Dumbbell, Moon, or ChevronRight for default)
- Subtle entry animation consistent with existing motion
- Respects `editable` and `viewingFuture` guards (disabled/muted on future dates)

---

## Changes

| File | Action |
|---|---|
| `src/pages/Dashboard.tsx` | Add `getNextAction` useMemo + button JSX between progress tiles and habits |

No new files, no new components, no database changes. Pure logic + one button.

---

## Technical Detail

The `getNextAction` memo returns `{ label: string, icon: LucideIcon, action: () => void }` computed from `currentTime`, `todayBlocks`, `anchorCompletions`, `viewingFuture`, and `editable`. The action callback reuses the existing `handleAnchorClick` logic (opening sheets) or calls `navigate`. For the default "Review Today" case, it scrolls to the anchors section using a ref.

