

# Softer Solid Calendar Blocks

## What Changes

The current monochromatic warmth palette is close but the blocks still feel a bit harsh. This update softens all block colours to be gentler on the eye -- think muted, earthy tones that sit quietly on the dark background without drawing too much attention.

## Updated Colour Values

All blocks remain solid (no gradients, no transparency, no blur). The key change is slightly lower saturation and gentler lightness values across the board:

| Block Type | Background | Border | Text |
|---|---|---|---|
| Training (planned) | `hsl(25 8% 17%)` | `hsl(25 8% 23%)` | `hsl(40 15% 88%)` |
| Training (active) | `hsl(194 20% 16%)` | `hsl(194 35% 28%)` | `hsl(194 30% 86%)` |
| Training (done) | `hsl(194 25% 14%)` | `hsl(194 50% 35%)` | `hsl(194 40% 90%)` |
| Morning routine | `hsl(28 7% 14%)` | `hsl(28 7% 20%)` | `hsl(40 12% 85%)` |
| Evening routine | `hsl(25 7% 13%)` | `hsl(25 7% 19%)` | `hsl(40 12% 85%)` |
| Work | `hsl(26 6% 10%)` | `hsl(26 6% 15%)` | `hsl(40 10% 78%)` |
| Reading | `hsl(24 7% 12%)` | `hsl(24 7% 17%)` | `hsl(40 10% 80%)` |
| Wake | `hsl(28 7% 14%)` | `hsl(28 7% 20%)` | `hsl(40 12% 85%)` |
| Sleep | `hsl(24 6% 7%)` | `hsl(24 6% 11%)` | `hsl(40 8% 70%)` |
| Commute | `hsl(26 6% 11%)` | `hsl(26 6% 16%)` | `hsl(40 10% 78%)` |
| Custom | `hsl(25 6% 11%)` | `hsl(25 6% 16%)` | `hsl(40 10% 79%)` |
| Strategy | `hsl(27 7% 12%)` | `hsl(27 7% 17%)` | `hsl(40 10% 82%)` |
| Default | `hsl(25 6% 10%)` | `hsl(25 6% 15%)` | `hsl(40 10% 76%)` |

Key differences from current values:
- Saturation dropped from 9-12% to 6-8% (softer, less warm)
- Text lightness pulled back slightly (less bright white, more muted cream)
- Training active/done cyan toned down (saturation 20-25% instead of 30-35%)
- Glow shadow on active training reduced

## Files Changed

### 1. `src/index.css` (lines 210-276)
Replace all `.cal-block-*` class values with the softer palette above. No structural changes -- just updated HSL values.

### 2. No other files change
The `getBlockColor` function and `DraggableBlock` component remain untouched.

