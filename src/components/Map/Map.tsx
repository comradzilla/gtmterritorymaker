import { useState, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import StateLayer from './StateLayer'
import StateLabels from './StateLabels'
import AssignmentModal from '../AssignmentModal'
import Legend from '../Legend'
import SlideOutPanel from '../SlideOutPanel'
import ExportImportToolbar from '../ExportImportToolbar'
import StateSearch, { type StateSearchHandle } from '../StateSearch'
import { useGeoJson } from '../../hooks/useGeoJson'
import { useReps } from '../../hooks/useReps'
import { useAssignments } from '../../hooks/useAssignments'
import { useKeyboardShortcuts, createShortcuts } from '../../hooks/useKeyboardShortcuts'
import { getCentroidsLookup } from '../../data/stateCentroids'
import type { SelectedState } from '../../types'

const CARTO_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// Component to handle map reference and flyTo
interface MapControllerProps {
  onMapReady: (map: L.Map) => void
}

function MapController({ onMapReady }: MapControllerProps) {
  const map = useMap()
  useMemo(() => {
    onMapReady(map)
  }, [map, onMapReady])
  return null
}

function Map() {
  const { data, loading, error, lookupMaps } = useGeoJson()
  const { reps, repColors, updateRepName } = useReps()
  const {
    assignments,
    setAssignment,
    removeAssignment,
    bulkAssign,
    importAssignments,
    undo,
    redo,
    canUndo,
    canRedo,
    lastSaved,
    isDirty,
  } = useAssignments()

  const [selectedState, setSelectedState] = useState<SelectedState | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [showLabels, setShowLabels] = useState(false)

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<StateSearchHandle>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Get centroids for search
  const centroids = useMemo(() => getCentroidsLookup(), [])

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

  const handleBulkAssign = (stateCodes: string[], repName: string) => {
    bulkAssign(stateCodes, repName)
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
      }),
    [canUndo, canRedo, undo, redo]
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
    <div className="relative w-screen h-screen" ref={mapContainerRef}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Loading map data...</p>
          </div>
        </div>
      )}

      {/* Export/Import Toolbar */}
      <ExportImportToolbar
        assignments={assignments}
        reps={reps}
        codeToName={lookupMaps.codeToName}
        onImport={importAssignments}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        lastSaved={lastSaved}
        isDirty={isDirty}
        mapRef={mapRef}
        mapContainerRef={mapContainerRef}
        legendRef={legendRef}
        showLabels={showLabels}
        onToggleLabels={setShowLabels}
      />

      {/* State Search */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[750]" data-export-exclude="true">
        <StateSearch
          ref={searchRef}
          lookupMaps={lookupMaps}
          onSelectState={handleSelectState}
          centroids={centroids}
        />
      </div>

      {/* Slide-out Panel */}
      <SlideOutPanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
        reps={reps}
        onUpdateRepName={updateRepName}
        onBulkAssign={handleBulkAssign}
        lookupMaps={lookupMaps}
      />

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
      <div ref={legendRef}>
        <Legend reps={reps} assignments={assignments} />
      </div>

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
    </div>
  )
}

export default Map
