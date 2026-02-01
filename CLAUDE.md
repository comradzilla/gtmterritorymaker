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
- **Working state keys:**
  - `territory-map-reps` - Rep names, colors, territory names
  - `territory-map-assignments` - State-to-rep mappings
- **Saved maps keys:**
  - `territory-map-saved-list` - Array of saved map metadata
  - `territory-map-saved-{id}` - Full saved map data for each map
  - `territory-map-active-id` - Currently active map ID
- **Hooks own their domain:**
  - `useAssignments` - Assignment CRUD + undo/redo history
  - `useReps` - Rep data management
  - `useGeoJson` - Map data fetching + lookup tables
  - `useSavedMaps` - Save/load/delete maps, tracks unsaved changes

### Component Hierarchy
```
Map.tsx (orchestrator)
├── MapContainer (react-leaflet)
│   ├── StateLayer (GeoJSON polygons)
│   └── StateLabels (DivIcon markers)
├── SlideOutPanel (left side)
│   ├── SavedMapsDropdown
│   └── RemoveRepDialog (modal, on delete rep with states)
├── ExportImportToolbar (top right)
├── Legend (bottom right, draggable)
├── AssignmentModal (centered overlay)
├── StateSearch (top center)
├── SaveMapDialog
├── MapListModal
└── UnsavedChangesDialog
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

### 6. Dynamic Reps with Storage Migration
**Decision:** Reps are stored in V2 format `{ version: 2, reps: SalesRep[] }` as an ordered array. Old V1 format (keyed object `rep1`–`rep6`) is auto-migrated on load.

**Why:** The original fixed 6-rep system used a keyed object. Dynamic add/remove requires an ordered array to support arbitrary rep counts and preserve ordering. V2 format stores the full array directly.

**Impact:** Rep IDs are generated via a localStorage counter (`territory-map-rep-id-counter`) starting at 7 to avoid collisions with legacy `rep1`–`rep6` IDs. Saved maps now include an optional `repOrder: string[]` field for ordering preservation; older saved maps without it fall back to `Object.keys(reps)`.

**Files:** `src/data/reps.ts` (palette, MAX_REPS, ID gen), `src/hooks/useReps.ts` (V2 storage, add/remove/clear), `src/components/RemoveRepDialog.tsx`

### 7. Remove Rep with Reassignment
**Decision:** When removing a rep that has assigned states, a `RemoveRepDialog` appears with options to unassign all states or reassign them to another rep.

**Why:** Prevents accidental data loss. Users need explicit control over what happens to assigned states when a rep is deleted.

**Files:** `src/components/RemoveRepDialog.tsx`, `src/components/Map/Map.tsx` (`handleRemoveRep`)

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

### 7. Rep ID Counter in localStorage
`generateRepId()` uses `territory-map-rep-id-counter` (starts at 7) to create unique IDs. This counter only increments, never resets, so IDs are never reused even after deleting reps. If the counter key is missing it re-initializes at 7.

## Current Gaps

### Not Implemented
- **Mobile responsive** - Panel doesn't collapse properly on small screens
- **Multi-select states** - Can only assign one state at a time via modal (bulk via text input works)
- **Drag-and-drop rep reordering** - Rep order is fixed (add order only)
- **Territory sharing** - One territory per rep only

### Known Bugs
- FlyTo animation from search may not complete before modal opens
- State tooltips use default Leaflet styling (not customized)

## Quick Reference

### localStorage Keys
| Key | Contents |
|-----|----------|
| `territory-map-reps` | V2: `{ version: 2, reps: SalesRep[] }` (auto-migrates V1 keyed object) |
| `territory-map-assignments` | `{ [stateCode]: { repName, assignedAt } }` |
| `territory-map-panel-width` | Panel width in pixels |
| `territory-map-rep-id-counter` | Auto-incrementing integer for generating unique rep IDs (starts at 7) |
| `territory-map-saved-list` | `SavedMapMeta[]` - list of saved maps (id, name, dates, stateCount) |
| `territory-map-saved-{id}` | Full `SavedMap` data for each map (now includes optional `repOrder`) |
| `territory-map-active-id` | Currently active map ID (or null for untitled) |

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
| `Cmd+S` | Save map |
| `Cmd+Shift+S` | Save map as |
| `Cmd+O` | Open map list |
| `/` | Focus search |
| `Escape` | Close modals |

### Color Palette (20 extended colors)
First 6 are the original core colors. Defined in `EXTENDED_COLOR_PALETTE` in `src/data/reps.ts`.
```
#3B82F6 Blue       #10B981 Green      #F59E0B Amber      #EF4444 Red
#8B5CF6 Purple     #EC4899 Pink       #14B8A6 Teal       #F97316 Orange
#6366F1 Indigo     #84CC16 Lime       #06B6D4 Cyan       #E11D48 Rose
#A855F7 Violet     #0EA5E9 Sky        #D946EF Fuchsia    #22C55E Emerald
#FACC15 Yellow     #78716C Stone      #64748B Slate      #F43F5E Coral
```

### Rep Limits
- **Soft cap:** 20 reps (`MAX_REPS` in `src/data/reps.ts`)
- **Default:** 6 named reps (Alice, Bob, Carol, David, Eva, Frank)
- **"Clear All"** resets to the 6 defaults with no assignments

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

### After Modifying Saved Maps
1. Create new map, assign states, save with name
2. Create second map for different client
3. Switch between maps, verify data loads correctly
4. Test unsaved changes warning dialog
5. Refresh browser, verify active map persists
6. Delete a map, verify removed from list
7. Test keyboard shortcuts (Cmd+S, Cmd+Shift+S, Cmd+O)

### After Modifying Dynamic Reps
1. Click "+ Add Rep" multiple times — verify new rows appear with blank names and unique colors, cap at 20
2. Click trash on unassigned rep — should disappear immediately
3. Assign states to a rep, click trash — dialog should appear with reassign options. Test both "unassign" and "reassign to X"
4. Click "Clear All" — should reset to 6 default reps with no assignments
5. Save a map with 10+ reps, load it — verify all reps load with correct colors, names, and assignments
6. Refresh browser — verify dynamically added reps persist (V2 storage)
7. Clear localStorage `territory-map-reps`, refresh — verify V1 migration or fresh defaults load correctly
8. Import CSV with more than 6 rep names — verify dynamic rep creation
