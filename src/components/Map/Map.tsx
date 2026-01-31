import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import StateLayer from './StateLayer'
import StateLabels from './StateLabels'
import AssignmentModal from '../AssignmentModal'
import ImportModal from '../ImportModal'
import Legend from '../Legend'
import SlideOutPanel from '../SlideOutPanel'
import ResizeHandle from '../ResizeHandle'
import ExportImportToolbar from '../ExportImportToolbar'
import StateSearch, { type StateSearchHandle } from '../StateSearch'
import SaveMapDialog from '../SaveMapDialog'
import UnsavedChangesDialog from '../UnsavedChangesDialog'
import MapListModal from '../MapListModal'
import { useGeoJson } from '../../hooks/useGeoJson'
import { useReps } from '../../hooks/useReps'
import { useAssignments } from '../../hooks/useAssignments'
import { useSavedMaps } from '../../hooks/useSavedMaps'
import { useKeyboardShortcuts, createShortcuts } from '../../hooks/useKeyboardShortcuts'
import { usePanelResize } from '../../hooks/usePanelResize'
import { getCentroidsLookup } from '../../data/stateCentroids'
import type { SelectedState, TerritoryAssignments } from '../../types'
import type { StoredRepData } from '../../types/savedMaps'

const CARTO_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Component to handle map reference
interface MapControllerProps {
  onMapReady: (map: L.Map) => void
}

function MapController({ onMapReady }: MapControllerProps): null {
  const map = useMap()
  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])
  return null
}

function Map() {
  const { data, loading, error, lookupMaps } = useGeoJson()
  const { reps, repColors, updateRepName, updateRepColor, updateRepTerritory, importReps, resetToData, getStoredRepData, getRepOrder, addRep, removeRep, clearAllReps } = useReps()
  const {
    assignments,
    setAssignment,
    removeAssignment,
    syncRepAssignments,
    updateRepName: updateRepNameInAssignments,
    importAssignments,
    resetToData: resetAssignments,
    clearAll,
    undo,
    redo,
    canUndo,
    canRedo,
    lastSaved,
    isDirty,
    markClean,
  } = useAssignments()

  // Load map handler - resets both reps and assignments
  const handleLoadMap = useCallback(
    (newReps: StoredRepData, newAssignments: TerritoryAssignments, repOrder?: string[]) => {
      resetToData(newReps, repOrder)
      resetAssignments(newAssignments)
    },
    [resetToData, resetAssignments]
  )

  // Dynamic rep handlers
  const handleAddRep = useCallback(() => { addRep() }, [addRep])

  const handleRemoveRep = useCallback((repId: string, reassignToRepName: string | null) => {
    const rep = reps.find((r) => r.id === repId)
    if (!rep) return

    if (reassignToRepName) {
      // Transfer all states from removed rep to the target rep
      const stateCodes = Object.entries(assignments)
        .filter(([, a]) => a.repName === rep.name)
        .map(([code]) => code)
      // Get current states of target rep
      const targetCodes = Object.entries(assignments)
        .filter(([, a]) => a.repName === reassignToRepName)
        .map(([code]) => code)
      syncRepAssignments(reassignToRepName, [...targetCodes, ...stateCodes])
    }
    // Unassign all states from removed rep
    syncRepAssignments(rep.name, [])
    removeRep(repId)
  }, [reps, assignments, syncRepAssignments, removeRep])

  const handleClearAll = useCallback(() => {
    clearAll()
    clearAllReps()
  }, [clearAll, clearAllReps])

  // Saved maps hook
  const {
    savedMaps,
    activeMapId,
    activeMapName,
    hasUnsavedChanges,
    saveCurrentMap,
    saveAsNewMap,
    loadMap,
    createNewMap,
    deleteMap,
    renameMap,
  } = useSavedMaps({
    reps: getStoredRepData(),
    repOrder: getRepOrder(),
    assignments,
    isDirty,
    onLoadMap: handleLoadMap,
    onMarkClean: markClean,
  })

  // Saved maps dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showMapListModal, setShowMapListModal] = useState(false)
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ type: 'load' | 'new'; mapId?: string } | null>(null)

  const [selectedState, setSelectedState] = useState<SelectedState | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [showLabels, setShowLabels] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Panel resize hook
  const { width: panelWidth, isResizing, startResize } = usePanelResize()

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<StateSearchHandle>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Get centroids for search
  const centroids = useMemo(() => getCentroidsLookup(), [])

  // Invalidate map size when panel width changes or panel opens/closes
  useEffect(() => {
    if (mapRef.current && !isResizing) {
      // Small delay to let layout settle
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [panelWidth, isPanelOpen, isResizing])

  const handleStateClick = (code: string, name: string) => {
    setSelectedState({ code, name })
  }

  const handleAssign = (repName: string) => {
    if (!selectedState) return
    setAssignment(selectedState.code, repName)
    setSelectedState(null)
  }

  const handleUnassign = () => {
    if (!selectedState) return
    removeAssignment(selectedState.code)
    setSelectedState(null)
  }

  const handleCloseModal = () => {
    setSelectedState(null)
  }

  const handleSelectState = useCallback((code: string, lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 6, { duration: 0.5 })
    }
    // Optionally open the assignment modal
    const name = lookupMaps.codeToName[code] || code
    setSelectedState({ code, name })
  }, [lookupMaps.codeToName])

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  const handleCSVImport = useCallback((
    newAssignments: Record<string, { repName: string; assignedAt: string }>,
    repNames: string[],
    mode: 'replace' | 'merge'
  ) => {
    if (mode === 'replace') {
      // Clear and replace
      clearAll()
      importReps(repNames)
    }
    // Import assignments (merge mode just adds on top of existing)
    importAssignments(newAssignments)
  }, [clearAll, importReps, importAssignments])

  // Save handlers
  const handleSave = useCallback(() => {
    if (activeMapId) {
      saveCurrentMap()
    } else {
      setShowSaveDialog(true)
    }
  }, [activeMapId, saveCurrentMap])

  const handleSaveAs = useCallback(() => {
    setShowSaveDialog(true)
  }, [])

  const handleSaveDialogConfirm = useCallback((name: string) => {
    saveAsNewMap(name)
    setShowSaveDialog(false)
  }, [saveAsNewMap])

  // Load handlers with unsaved changes check
  const handleLoadMapWithCheck = useCallback((mapId: string) => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'load', mapId })
      setShowUnsavedChangesDialog(true)
    } else {
      loadMap(mapId)
    }
  }, [hasUnsavedChanges, loadMap])

  const handleNewMapWithCheck = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'new' })
      setShowUnsavedChangesDialog(true)
    } else {
      createNewMap()
    }
  }, [hasUnsavedChanges, createNewMap])

  const handleUnsavedSaveAndSwitch = useCallback(() => {
    if (activeMapId) {
      saveCurrentMap()
    }
    if (pendingAction?.type === 'load' && pendingAction.mapId) {
      loadMap(pendingAction.mapId)
    } else if (pendingAction?.type === 'new') {
      createNewMap()
    }
    setShowUnsavedChangesDialog(false)
    setPendingAction(null)
  }, [activeMapId, saveCurrentMap, loadMap, createNewMap, pendingAction])

  const handleUnsavedSwitchWithoutSaving = useCallback(() => {
    if (pendingAction?.type === 'load' && pendingAction.mapId) {
      loadMap(pendingAction.mapId)
    } else if (pendingAction?.type === 'new') {
      createNewMap()
    }
    setShowUnsavedChangesDialog(false)
    setPendingAction(null)
  }, [loadMap, createNewMap, pendingAction])

  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedChangesDialog(false)
    setPendingAction(null)
  }, [])

  // Keyboard shortcuts
  const shortcuts = useMemo(
    () =>
      createShortcuts({
        onUndo: canUndo ? undo : undefined,
        onRedo: canRedo ? redo : undefined,
        onEscape: () => {
          setSelectedState(null)
          setIsPanelOpen(false)
        },
        onSearch: () => {
          searchRef.current?.focus()
        },
        onSave: handleSave,
        onSaveAs: handleSaveAs,
        onOpenMaps: () => setShowMapListModal(true),
      }),
    [canUndo, canRedo, undo, redo, handleSave, handleSaveAs]
  )

  useKeyboardShortcuts(shortcuts)

  if (error) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-100">
        <div className="text-center p-8">
          <p className="text-red-600 font-medium mb-2">Failed to load map data</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      {/* Panel - conditionally rendered with dynamic width */}
      {isPanelOpen && (
        <>
          <div
            className="flex-shrink-0 bg-white shadow-xl h-full overflow-hidden"
            style={{ width: panelWidth }}
            data-export-exclude="true"
          >
            <SlideOutPanel
              reps={reps}
              assignments={assignments}
              onUpdateRepName={updateRepName}
              onUpdateRepColor={updateRepColor}
              onUpdateRepTerritory={updateRepTerritory}
              onUpdateRepNameInAssignments={updateRepNameInAssignments}
              onSyncRepAssignments={syncRepAssignments}
              lookupMaps={lookupMaps}
              activeMapName={activeMapName}
              activeMapId={activeMapId}
              hasUnsavedChanges={hasUnsavedChanges}
              savedMaps={savedMaps}
              onSave={handleSave}
              onSaveAs={handleSaveAs}
              onNewMap={handleNewMapWithCheck}
              onOpenMapList={() => setShowMapListModal(true)}
              onLoadMap={handleLoadMapWithCheck}
              onAddRep={handleAddRep}
              onRemoveRep={handleRemoveRep}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Resize Handle */}
          <ResizeHandle onMouseDown={startResize} isResizing={isResizing} />
        </>
      )}

      {/* Map Container - fills remaining space */}
      <div className="flex-1 relative h-full" ref={mapContainerRef}>
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-50">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading map data...</p>
            </div>
          </div>
        )}

        {/* Panel Toggle Button */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          data-export-exclude="true"
          className="absolute top-20 left-0 z-[900] bg-white shadow-lg rounded-r-lg p-2 hover:bg-gray-50 border border-l-0 border-gray-200 transition-colors"
          aria-label={isPanelOpen ? 'Close panel' : 'Open panel'}
        >
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${isPanelOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Export/Import Toolbar */}
        <ExportImportToolbar
          assignments={assignments}
          reps={reps}
          repColors={repColors}
          codeToName={lookupMaps.codeToName}
          onImport={importAssignments}
          onOpenImportCSV={() => setIsImportModalOpen(true)}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          lastSaved={lastSaved}
          isDirty={isDirty}
          mapRef={mapRef}
          showLabels={showLabels}
          onToggleLabels={setShowLabels}
          showLegend={showLegend}
          onToggleLegend={setShowLegend}
          geoJsonData={data}
        />

        {/* State Search */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[750]" data-export-exclude="true">
          <StateSearch
            ref={searchRef}
            lookupMaps={lookupMaps}
            onSelectState={handleSelectState}
            centroids={centroids}
          />
        </div>

        {/* Map */}
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4.5}
          minZoom={2}
          maxZoom={8}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
          maxBounds={[[10, -180], [85, -50]]}
        >
          <MapController onMapReady={handleMapReady} />
          <TileLayer
            attribution={CARTO_ATTRIBUTION}
            url={CARTO_TILES}
          />
          {data && (
            <>
              <StateLayer
                data={data}
                assignments={assignments}
                repColors={repColors}
                onStateClick={handleStateClick}
              />
              <StateLabels
                data={data}
                showLabels={showLabels}
              />
            </>
          )}
        </MapContainer>

        {/* Legend */}
        {showLegend && (
          <div ref={legendRef}>
            <Legend reps={reps} assignments={assignments} />
          </div>
        )}

        {/* Assignment Modal */}
        {selectedState && (
          <AssignmentModal
            selectedState={selectedState}
            reps={reps}
            currentAssignment={assignments[selectedState.code] || null}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
            onClose={handleCloseModal}
          />
        )}

        {/* Import Modal */}
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleCSVImport}
          lookupMaps={lookupMaps}
        />

        {/* Save Map Dialog */}
        <SaveMapDialog
          isOpen={showSaveDialog}
          title={activeMapId ? 'Save Map As' : 'Save Map'}
          initialName={activeMapName || ''}
          confirmLabel="Save"
          onConfirm={handleSaveDialogConfirm}
          onCancel={() => setShowSaveDialog(false)}
        />

        {/* Map List Modal */}
        <MapListModal
          isOpen={showMapListModal}
          savedMaps={savedMaps}
          activeMapId={activeMapId}
          onLoad={handleLoadMapWithCheck}
          onDelete={deleteMap}
          onRename={renameMap}
          onClose={() => setShowMapListModal(false)}
        />

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialog
          isOpen={showUnsavedChangesDialog}
          onSaveAndSwitch={handleUnsavedSaveAndSwitch}
          onSwitchWithoutSaving={handleUnsavedSwitchWithoutSaving}
          onCancel={handleUnsavedCancel}
        />
      </div>
    </div>
  )
}

export default Map
