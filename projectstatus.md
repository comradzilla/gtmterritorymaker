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

### Session 7
- Legend Toggle + Export Fix (Phase 7):
  - Added Legend toggle button to toolbar (show/hide legend)
  - Fixed image export error when labels are on (added skipFonts option to html-to-image)
  - Updated toolbar: `[Undo][Redo] | [Export▼] | [Import] | [Labels] | [Legend] | [+][-] | Save`

### Session 8
- Export Bug Fixes (Phase 8):
  - Fixed dialog appearing in exported screenshot (close dialog BEFORE capture with 100ms delay)
  - Added additional html-to-image options for label export: `includeQueryParams: false`, `skipAutoScale: true`
  - Simplified export dialog by removing loading spinner state (no longer needed since dialog closes before export)
  - Build verified clean with no TypeScript errors

### Session 9
- Export Cleanup (Phase 9):
  - Removed export dialog with checkboxes - PNG/JPEG now export directly from dropdown
  - Export uses current UI state: if legend toggle is on, include legend; if labels toggle is on, include labels
  - Added `data-export-exclude` attributes to SlideOutPanel (button and container) to hide from export
  - Added `leaflet-tooltip` filter in mapExporter.ts to exclude hover tooltips from screenshot
  - Build verified clean

### Session 10
- Labels Export Fix (Phase 10):
  - Added `state-label-marker` to filter in mapExporter.ts
  - `html-to-image` library cannot handle Leaflet DivIcon markers with `text-shadow` CSS
  - Trade-off: Labels visible on screen but excluded from PNG/JPEG export (export now works reliably)
  - Build verified clean

### Session 11
- Canvas Overlay for Labels (Phase 11):
  - html2canvas didn't work (failed with legend and labels)
  - Reverted to `html-to-image` (which works without labels)
  - Implemented canvas overlay approach: draw labels programmatically onto canvas after capture
  - Labels are drawn at centroid pixel coordinates using Canvas 2D API
  - White outline + dark text simulates the text-shadow effect
  - Leader lines drawn for small states (RI, DE, CT, etc.)
  - Export now passes map bounds and visible codes to exporter
  - Build verified clean

### Session 12
- Canvas Legend Drawing (Phase 12):
  - Fixed legend export failure by drawing legend directly on canvas (like labels)
  - Added `LegendData` interface and `drawLegendOnCanvas` function to mapExporter.ts
  - Legend now drawn with rounded rectangle background, shadow, title, rep colors/names/counts, separator, and "Unassigned" row
  - Removed dependency on html-to-image for legend capture
  - ExportImportToolbar now passes `legendData` (reps + assignments) to export function
  - Export now works reliably with both labels AND legend enabled
  - Build verified clean

### Session 13
- Switch to leaflet-image Library (Phase 13):
  - `html-to-image` was hanging indefinitely when capturing Leaflet maps (timeout after 30s)
  - Replaced with `leaflet-image` library specifically designed for Leaflet map capture
  - Rewrote `mapExporter.ts` to use leaflet-image callback API
  - Changed function signature: now takes `LeafletMap` instead of `HTMLElement`
  - Removed unused `mapContainerRef` and `legendRef` props from ExportImportToolbar
  - Added type declaration file for leaflet-image (`src/types/leaflet-image.d.ts`)
  - Export now works reliably - captures map in ~1 second
  - Labels and legend drawn programmatically on canvas after capture
  - Build verified clean

### Session 14
- Fix Export with Labels Enabled (Phase 14):
  - Root cause: `leaflet-image` crashes on DivIcon markers (used for state labels) because they don't have iconUrl
  - TypeError: Cannot read properties of undefined (reading 'match') in handleMarkerLayer
  - Fix: Temporarily remove DivIcon markers from map before capture, restore afterward
  - Process: Remove markers → capture map → draw labels on canvas → restore markers
  - Removed unused `leaflet-easyprint` type declarations (was interfering with Leaflet types)
  - Export now works reliably with both labels ON and OFF
  - Build verified clean

### Session 15
- Fix Territory Colors in Export (Phase 15):
  - Issue: `leaflet-image` doesn't capture styled GeoJSON layers (territory colors missing in export)
  - Solution: Draw territory polygons programmatically on canvas, similar to labels
  - Added `PolygonPosition` interface and `drawPolygonsOnCanvas()` function to mapExporter.ts
  - Pre-calculate polygon pixel positions using `map.latLngToContainerPoint()` (Mercator projection)
  - Handle both Polygon and MultiPolygon geometry types
  - Draw fills with 50% opacity (matching StateLayer) and borders with full opacity
  - Updated ExportImportToolbar to pass `geoJsonData` and `repColors` to export function
  - Updated Map.tsx to pass these additional props
  - Export now shows territory colors correctly
  - Build verified clean

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
