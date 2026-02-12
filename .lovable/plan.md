

# Fix: Rename remaining "Strategy Block" references to "Sunday Planning Ritual"

Two spots were missed in the previous rename pass.

---

## Changes

### 1. `src/pages/Calendar.tsx` (line ~347)

The block detail modal displays `selectedBlock.block_type.replace("_", " ")` which renders as "strategy" for strategy blocks. Add a conditional to show "Planning Ritual" instead.

Change:
```
{selectedBlock.block_type.replace("_", " ")}
```
To:
```
{selectedBlock.block_type === "strategy" ? "Planning Ritual" : selectedBlock.block_type.replace("_", " ")}
```

### 2. `src/components/onboarding/ReviewStep.tsx` (line 175 and 181)

Update the comment and heading from "Strategy Block" to "Sunday Planning Ritual".

- Line 175 comment: `{/* Sunday Planning Ritual */}`
- Line 181 heading: `<h3 className="font-medium">Sunday Planning Ritual</h3>`

---

No other files need changes. The calendar grid block itself already shows the correct title from the database, the legend already says "Planning", and the checklist sheet already says "Sunday Planning Ritual".

