# GTM Territory Maker - Project Status

## Project Overview
A React-based territory mapping application for sales team management. Allows assigning US states and Canadian provinces to sales representatives with visual color coding.

---

## Current Tech Stack
- **Framework:** React 19 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS v4
- **Mapping:** Leaflet + react-leaflet
- **State:** React hooks + localStorage
- **Export:** html-to-image, @turf/centroid

---

## Completed Features

### Core Map Functionality
- Interactive map of US states + Canadian provinces
- Click state to open assignment modal
- Hover effects with state name tooltips
- State colors reflect assigned rep
- Map centered on continental US [39.5, -98.35] with zoom 4.5

### Slide-Out Panel
- Left-side collapsible panel (open by default)
- **Quick Assign:** Bulk assign multiple states (comma-separated codes or names)
- **Manage Reps:** Click rep to select for assignment, edit names inline
- Rep names persist to localStorage

### Legend
- Draggable, compact legend in bottom-right
- Territory count by rep, updates dynamically
- Smaller text and dots for cleaner appearance

### Assignment Modal
- Shows current assignment
- One-click assign/reassign to any rep
- Remove assignment option

### Data Persistence + Export (NEW)
- [x] Save assignments to localStorage (auto-save with debounce)
- [x] Export assignments as JSON
- [x] Export assignments as CSV
- [x] Import assignments from JSON

### UX Enhancements (NEW)
- [x] Undo/redo functionality (Cmd+Z / Cmd+Shift+Z)
- [x] State search with autocomplete (press `/` to focus)
- [x] Keyboard shortcuts (Escape to close modals)
- [x] Save indicator in toolbar ("Saved X ago")

### State Labels (NEW)
- [x] Display state abbreviations on map
- [x] Leader lines (dashed) for small states (RI, DE, CT, NJ, NH, VT, MA, MD, DC)
- [x] Toggle labels on/off button

### Map Image Export (NEW)
- [x] Export map as PNG/JPEG
- [x] Include legend in export
- [x] Include state labels in export

---

## File Structure

```
src/
├── components/
│   ├── Map/
│   │   ├── Map.tsx              # Main container
│   │   ├── StateLayer.tsx       # GeoJSON polygon rendering
│   │   └── StateLabels.tsx      # State abbreviations with leader lines
│   ├── AssignmentModal.tsx      # Single state assignment
│   ├── Legend.tsx               # Territory summary
│   ├── SlideOutPanel.tsx        # Bulk assign + rep management
│   ├── ExportImportToolbar.tsx  # Unified toolbar (undo/redo, export, import, labels, zoom)
│   ├── StateSearch.tsx          # Search autocomplete with flyTo
│   └── ConfirmationDialog.tsx   # Reusable confirmation modal
├── hooks/
│   ├── useGeoJson.ts            # Fetches map data + lookup maps
│   ├── useReps.ts               # Rep management + localStorage
│   ├── useAssignments.ts        # Assignment state + persistence + history
│   └── useKeyboardShortcuts.ts  # Global keyboard shortcuts
├── utils/
│   ├── exportUtils.ts           # JSON/CSV export utilities
│   └── mapExporter.ts           # Image export with html-to-image
├── data/
│   ├── reps.ts                  # Sales rep definitions
│   └── stateCentroids.ts        # State centroids + small state offsets
└── types/
    └── index.ts                 # TypeScript interfaces
```

---

## Key Technical Decisions

1. **State Codes:** Using 2-letter codes (CA, TX, NY) as primary identifiers
2. **Small States:** RI, DE, DC, CT, NJ, NH, VT, MA, MD get external labels with leader lines over the Atlantic
3. **Map Export:** Using `html-to-image` library for DOM capture with canvas compositing for legend
4. **Centroid Data:** Pre-calculated centroids stored in `stateCentroids.ts`
5. **History:** Stack-based undo/redo with 50-entry limit, debounced auto-save (300ms)
6. **Keyboard Shortcuts:** Escape closes modals, Cmd+Z/Cmd+Shift+Z for undo/redo, `/` focuses search

---

## Sales Reps

| ID | Default Name | Color |
|----|--------------|-------|
| rep1 | Alice Johnson | #3B82F6 (Blue) |
| rep2 | Bob Smith | #10B981 (Green) |
| rep3 | Carol Davis | #F59E0B (Amber) |
| rep4 | David Wilson | #EF4444 (Red) |
| rep5 | Eva Martinez | #8B5CF6 (Purple) |
| rep6 | Frank Brown | #EC4899 (Pink) |

---

## Session Notes

### Session 1 (Initial)
- Set up project with Vite + React + Tailwind
- Integrated Leaflet for mapping
- Fetched GeoJSON from public sources

### Session 2
- Added click-to-assign functionality
- Created Legend and AssignmentModal components
- Fixed z-index issues with Leaflet layers

### Session 3
- Added slide-out panel with bulk assignment
- Implemented rep name editing with localStorage
- Centered map on North America

### Session 4
- Implemented Phase 2 improvements:
  - Data persistence (localStorage for assignments)
  - JSON/CSV export and JSON import
  - Undo/redo with keyboard shortcuts
  - State search with autocomplete and flyTo
  - State labels with leader lines for small states
  - Map image export (PNG/JPEG with legend)

### Session 5
- UI Refinements (Phase 5):
  - Panel open by default
  - Removed "Assign to" dropdown, use Manage Reps for rep selection
  - Legend is now draggable (click and drag to reposition)
  - Legend styling more compact (smaller text, dots, padding)
  - Map default view centered on continental US (zoom 4.5)

### Session 6
- Toolbar Consolidation (Phase 6):
  - Moved zoom controls from top-left to top-right toolbar
  - Consolidated all exports into single "Export" dropdown (JSON, CSV, PNG, JPEG)
  - Moved Labels toggle into toolbar
  - Removed separate MapExportButton component (merged into toolbar)
  - Cleaner unified toolbar: `[Undo][Redo] | [Export▼] | [Import] | [Labels] | [+][-] | Save`

---

## Known Issues
- FlyTo animation may not complete before modal opens on search select
- No mobile-responsive design yet
- State tooltips use default Leaflet styling

---

## Future Considerations
- Add/remove sales reps dynamically
- Custom color picker for reps
- Territory sharing between reps
- Integration with CRM systems
- Mobile responsive layout
- Confirmation dialogs for destructive actions
