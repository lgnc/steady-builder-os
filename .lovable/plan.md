

## Add "Bonus Material" Resources Section to Dashboard

### What it does
Adds a curated resources section below the Anchors on the dashboard. It's a low-key, visually distinct card area that links out to longer-form content -- the Peak Performance Protocol program, community links, guides, and other resources you want to surface to users.

### Placement
After "Today's Anchors" and before the CoachChat FAB, sitting as the final content section on the dashboard scroll.

### Design
- A subtle section header: "Resources" or "Go Deeper"
- 3-4 resource cards in a vertical list, each with:
  - An icon (e.g. BookOpen, Users, ExternalLink, Sparkles)
  - Title (e.g. "Peak Performance Protocol")
  - One-line description
  - Taps open an external link or internal route
- Uses the existing `card-stat` styling to stay visually consistent but clearly secondary to the action-oriented content above
- Slightly lower opacity/muted treatment so it doesn't compete with execution items

### Technical Details

**New file: `src/components/dashboard/BonusMaterial.tsx`**
- A simple component rendering a list of resource links
- Each resource defined as a static array of objects: `{ icon, title, description, url }`
- Links open in a new tab (`target="_blank"`) for external URLs
- Uses `motion.div` for consistent fade-in animation matching the rest of the dashboard
- Easy to update -- just edit the array to add/remove/reorder links

**Modified file: `src/pages/Dashboard.tsx`**
- Import and render `<BonusMaterial />` after the Anchors section (after line 613, before the closing `</div>`)
- Wrapped in a `motion.section` with a slightly later delay to animate in after anchors

### Example Resource Items (editable later)
1. "Peak Performance Protocol" -- link to program overview
2. "Join the Community" -- link to Discord/community
3. "Training Guides" -- link to resource library
4. "Weekly Newsletter" -- link to subscribe or archive

