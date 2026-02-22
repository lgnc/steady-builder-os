

# Colour-Coded Calendar Blocks

## What Changes

The current monochromatic warmth palette makes all blocks look the same shade of charcoal. Inspired by the reference screenshot, each activity type will get its own **distinct but soft** colour so you can instantly tell what's what at a glance -- without looking like highlighters.

## New Colour Palette

Soft, muted versions of recognisable colours -- solid backgrounds, no gradients or transparency:

| Block Type | Colour Inspiration | Background | Border | Text |
|---|---|---|---|---|
| Training | Soft teal/green | `hsl(160 30% 22%)` | `hsl(160 35% 30%)` | `hsl(160 20% 90%)` |
| Training (active) | Brighter teal | `hsl(170 35% 25%)` | `hsl(170 45% 35%)` | `hsl(170 25% 92%)` |
| Training (done) | Cyan reward | `hsl(194 35% 22%)` | `hsl(194 50% 35%)` | `hsl(194 40% 92%)` |
| Morning routine | Warm amber/gold | `hsl(40 30% 20%)` | `hsl(40 35% 28%)` | `hsl(40 25% 90%)` |
| Evening routine | Soft lavender | `hsl(260 20% 20%)` | `hsl(260 25% 28%)` | `hsl(260 15% 90%)` |
| Work | Muted blue-grey | `hsl(210 15% 18%)` | `hsl(210 18% 25%)` | `hsl(210 12% 88%)` |
| Reading | Soft warm brown | `hsl(30 18% 18%)` | `hsl(30 20% 25%)` | `hsl(30 15% 88%)` |
| Wake | Soft peach/sunrise | `hsl(25 25% 20%)` | `hsl(25 28% 27%)` | `hsl(25 18% 90%)` |
| Sleep | Deep navy/dark | `hsl(230 15% 12%)` | `hsl(230 18% 18%)` | `hsl(230 10% 75%)` |
| Commute | Muted slate | `hsl(200 12% 16%)` | `hsl(200 15% 22%)` | `hsl(200 10% 85%)` |
| Custom | Soft pink/rose | `hsl(330 18% 20%)` | `hsl(330 22% 27%)` | `hsl(330 14% 90%)` |
| Strategy | Soft olive/sage | `hsl(80 15% 18%)` | `hsl(80 18% 25%)` | `hsl(80 12% 88%)` |
| Default | Neutral charcoal | `hsl(25 6% 14%)` | `hsl(25 8% 20%)` | `hsl(40 10% 82%)` |

Key principles:
- Each type has a **unique hue** so activities are visually distinct
- Saturation kept at 15-35% (soft, not neon)
- Lightness at 12-25% (sits comfortably on the dark background)
- Text always high-contrast cream/white for legibility

## Files Changed

### 1. `src/index.css` (lines 210-276)
Replace all `.cal-block-*` CSS class values with the new colour-coded palette above. Structure stays identical -- just updated HSL values with distinct hues per block type.

### 2. No other files change
`getBlockColor` in Calendar.tsx and `DraggableBlock` component stay as-is.

