

## Make Habits Step Edit-Ability More Obvious

A subtle but effective approach: replace the current generic blurb with a short, action-oriented subtitle that directly tells users they can add and remove habits. Additionally, add placeholder/empty-state hint text in each section when no habits exist yet.

### Changes to `src/components/onboarding/HabitsStep.tsx`

1. **Update the subtitle text** to something direct like:
   > "Add habits you want to build and ones you want to break. You can always edit these later from your dashboard."

2. **Add empty-state micro-copy** inside each habits list (when the list is empty) -- a small muted line like "Tap + to add your first habit" so the interactive nature is immediately clear without any extra UI weight.

These two small text changes make the editability self-evident without adding buttons, modals, or extra sections.

