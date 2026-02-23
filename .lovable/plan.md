

# Fix Off-Day Commutes and Remove Reading Blocks

## Changes

### 1. Remove "reading" blocks from the entire calendar
All blocks with `block_type === "reading"` will be filtered out globally in the `effectiveBlocks` logic in `src/pages/Calendar.tsx`. Reading is being folded into the evening routine, so these blocks are no longer needed on the calendar.

### 2. Remove work commutes on off days
In `src/lib/shiftScheduleBuilder.ts`, the off-day filter (line 64-67) currently only removes `work` and `roster_reminder` blocks. It will be updated to also remove commute blocks that are work-related (identified by title containing "to work", "from work", "to site", "from site", etc.) so that only gym commutes and other non-work blocks remain on off days.

## Technical Details

### File: `src/pages/Calendar.tsx`
- Add a global filter in the `effectiveBlocks` useMemo to exclude blocks where `block_type === "reading"`, applied before any shift logic runs.

### File: `src/lib/shiftScheduleBuilder.ts`
- Update the off-day branch (lines 64-67) to also filter out commute blocks whose title indicates a work commute (using the existing `classifyCommute` helper -- roles `"to_work"` and `"from_work"`).

Updated off-day logic:
```typescript
if (shift.isOff) {
  return dayBlocks.filter((b) => {
    if (b.block_type === "work" || b.block_type === "roster_reminder") return false;
    if (b.block_type === "commute") {
      const role = classifyCommute(b.title);
      if (role === "to_work" || role === "from_work") return false;
    }
    return true;
  });
}
```

