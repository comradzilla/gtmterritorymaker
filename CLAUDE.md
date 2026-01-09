# CLAUDE.md - GTM Territory Maker

This file contains architectural context, pitfalls, and decisions to help when working on this codebase.

## Architecture Overview

### Data Flow
```
GeoJSON (external) → useGeoJson hook → Map components
                                    ↓
User clicks state → AssignmentModal → useAssignments hook → localStorage
                                                         ↓
                            SlideOutPanel ← useReps hook ← localStorage
                                    ↓
                               Legend (read-only view)
```

### State Management Pattern
- **No Redux/Zustand** - All state managed via React hooks + localStorage
- **Two separate storage keys:**
  - `territory-map-reps` - Rep names, colors, territory names
  - `territory-map-assignments` - State-to-rep mappings
- **Hooks own their domain:**
  - `useAssignments` - Assignment CRUD + undo/redo history
  - `useReps` - Rep data management
  - `useGeoJson` - Map data fetching + lookup tables

### Component Hierarchy
```
Map.tsx (orchestrator)
├── MapContainer (react-leaflet)
│   ├── StateLayer (GeoJSON polygons)
│   └── StateLabels (DivIcon markers)
├── SlideOutPanel (left side)
├── ExportImportToolbar (top right)
├── Legend (bottom right, draggable)
├── AssignmentModal (centered overlay)
└── StateSearch (top center)
```

## Key Architectural Decisions

### 1. Territory is Per-Rep, Not Per-State
**Decision:** `SalesRep.territoryName` instead of `Assignment.territoryName`

**Why:** Simpler mental model - a rep owns one territory, all their states belong to it. Avoids inconsistency where same rep could have different territory names on different states.

**Impact:** If you need multiple territories per rep, this would need to change.

### 2. Assignments Use Rep Name as Key (Not ID)
**Decision:** `assignments[stateCode].repName` stores the rep's display name

**Why:** Simpler lookups, human-readable exports. Rep names are expected to be unique.

**Pitfall:** If you rename a rep, assignments still reference the old name. The `useReps` hook handles this by updating all assignments when a rep name changes.

### 3. Map Export Uses Canvas Compositing
**Decision:** `leaflet-image` captures base map → Canvas 2D draws polygons/labels/legend on top

**Why:** Multiple failed approaches:
- `html-to-image` hangs on Leaflet maps
- `leaflet-image` doesn't capture styled GeoJSON or DivIcon markers
- Canvas compositing gives full control

**Files:** `src/utils/mapExporter.ts` - see `drawPolygonsOnCanvas`, `drawLabelsOnCanvas`, `drawLegendOnCanvas`

### 4. Small States Have External Labels
**Decision:** RI, DE, DC, CT, NJ, NH, VT, MA, MD get labels positioned over the Atlantic with leader lines

**Why:** These states are too small to fit labels inside their boundaries

**Files:** `src/data/stateCentroids.ts` - `SMALL_STATE_OFFSETS` defines the offset positions

### 5. Color Picker Uses Pending State for Custom Colors
**Decision:** Custom color selection requires clicking "Apply" button

**Why:** Native color picker popup causes toolbar to close (registers as click outside). Two-step flow keeps toolbar open.

**Files:** `SlideOutPanel.tsx` - `pendingCustomColor` state

## Potential Pitfalls

### 1. Leaflet z-index Conflicts
Leaflet has its own z-index system. If modals or overlays appear behind the map:
- Map container: `z-index` not set (Leaflet manages internally)
- Modals/dialogs: Use `z-[1000]` or higher
- Legend: `z-[700]`
- Toolbar: `z-[750]`

### 2. Map Size Invalidation
When the panel resizes or opens/closes, the map doesn't know its container size changed. Must call:
```typescript
mapRef.current?.invalidateSize()
```
This is handled in `Map.tsx` via useEffect watching `panelWidth` and `isPanelOpen`.

### 3. GeoJSON Coordinate Order
GeoJSON uses `[longitude, latitude]` (backwards from typical `[lat, lng]`). Leaflet handles this, but if you're doing manual coordinate work, be careful.

### 4. Export Markers Must Be Removed
`leaflet-image` crashes on DivIcon markers. Before export:
```typescript
// Remove markers
labelsLayerRef.current?.clearLayers()
// Capture map
// Restore markers
labelsLayerRef.current?.addTo(map)
```

### 5. State Codes Are Case-Sensitive Internally
User input is normalized to uppercase, but internally always use uppercase codes (CA, not ca).

### 6. Undo/Redo Only Tracks Assignments
The history stack in `useAssignments` only tracks assignment changes. Rep name/color changes are NOT undoable.

## Current Gaps

### Not Implemented
- **Add/remove reps dynamically** - Currently fixed 6 reps defined in `src/data/reps.ts`
- **Mobile responsive** - Panel doesn't collapse properly on small screens
- **Multi-select states** - Can only assign one state at a time via modal (bulk via text input works)
- **Drag-and-drop rep reordering** - Rep order is fixed
- **Territory sharing** - One territory per rep only

### Known Bugs
- FlyTo animation from search may not complete before modal opens
- State tooltips use default Leaflet styling (not customized)

## Quick Reference

### localStorage Keys
| Key | Contents |
|-----|----------|
| `territory-map-reps` | `{ [repId]: { name, color?, territoryName? } }` |
| `territory-map-assignments` | `{ [stateCode]: { repName, assignedAt } }` |
| `territory-map-panel-width` | Panel width in pixels |

### Export Versions
| Version | Changes |
|---------|---------|
| 1.0 | Initial format |
| 1.1 | Added territorySummary to metadata |
| 2.0 | Territory moved from Assignment to Rep |

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `/` | Focus search |
| `Escape` | Close modals |

### Color Palette (6 core colors)
```
#3B82F6 Blue
#10B981 Green
#F59E0B Amber
#EF4444 Red
#8B5CF6 Purple
#EC4899 Pink
```

## Testing Changes

### After Modifying Assignments Logic
1. Assign some states to different reps
2. Use Quick Assign to bulk update
3. Remove states from text box, verify they unassign
4. Test undo/redo (Cmd+Z / Cmd+Shift+Z)
5. Refresh page - assignments should persist

### After Modifying Export
1. Assign states with different colors
2. Enable labels and legend toggles
3. Export as PNG
4. Verify: polygons have correct colors, labels visible, legend present

### After Modifying Panel/Layout
1. Resize panel via drag handle
2. Refresh - width should persist
3. Toggle panel open/close
4. Verify map fills available space correctly
