

# Calendar Aesthetic: Monochromatic Warmth

## Design Philosophy

Replace the current transparent gradient-glass blocks with **solid, opaque surfaces** using warm charcoal/stone tonal shifts. No colour coding — block types are distinguished purely through subtle shade differences, border weight, and typography. Think high-end watch interface or premium dark-mode productivity app.

## The Palette

All blocks sit within a tight warm-charcoal range (HSL hue ~20-30, low saturation 8-14%), differentiated only by lightness:

| Block Type | Lightness Level | Feel |
|---|---|---|
| Training | Lightest (~18-20%) | Stands out as the "hero" block |
| Morning/Evening Routine | Medium-light (~14-16%) | Clearly visible, secondary importance |
| Strategy/Reading | Medium (~12-14%) | Intellectual/planning activities |
| Work | Medium-dark (~10-12%) | Recedes — it's the backdrop of the day |
| Commute/Custom | Medium (~11-13%) | Neutral utility |
| Sleep | Darkest (~7-9%) | Almost blends with background — restful |
| Wake | Medium-light (~15%) | Marks the start of the day |

Text colour stays consistently warm white (~85-94% lightness) for legibility. Left borders use a slightly brighter version of the block's own shade (no accent colours).

The **only colour** that appears is the existing cyan accent on **training blocks once completed** — this acts as the earned "reward" colour, making completion feel meaningful.

## Technical Changes

### 1. `src/index.css` — Replace all `.cal-block-*` classes (lines 211-289)

Replace every glass-gradient class with solid warm-charcoal backgrounds:

- Remove all `backdrop-filter: blur(8px)` (no more transparency)
- Replace `linear-gradient` with solid `background` colours using the warm-charcoal HSL values
- Set `border-color` to a slightly lighter version of the background (subtle, not glowing)
- Set `color` to warm white for all blocks
- Keep `.cal-block-training-done` as the only class with cyan colouring (the reward state)
- Keep `.cal-block-training-active` with a hint of cyan (in-progress feedback)

### 2. `src/components/calendar/DraggableBlock.tsx` — Minor hover refinement

- Adjust hover state from `brightness-110` to `brightness-105` for subtler, more premium hover feedback
- The existing shadow and scale transitions stay as-is

### 3. No changes to `Calendar.tsx`

The `getBlockColor` function and all block rendering logic stays identical — only the CSS classes it references change.

## Result

The calendar will feel like a solid, tactile surface — blocks look like they're carved from the same material at different depths rather than floating transparent panels. Training completion remains the only moment of colour, making progress feel earned and visually rewarding.

