import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { SalesRep } from '../data/reps'
import type { RepColors, StatesGeoJSON, TerritoryAssignments } from '../types'
import {
  exportAssignmentsAsJSON,
  exportAssignmentsAsCSV,
  parseImportedJSON,
} from '../utils/exportUtils'
import { exportMapAsImage, type LegendData, type MapExportOptions } from '../utils/mapExporter'

type ExportStatus = 'idle' | 'exporting' | 'done'

function getExportButtonStyle(status: ExportStatus): string {
  switch (status) {
    case 'exporting':
      return 'bg-blue-100 text-blue-700'
    case 'done':
      return 'bg-green-100 text-green-700'
    default:
      return 'text-gray-700 bg-gray-50 hover:bg-gray-100'
  }
}

interface ExportButtonContentProps {
  status: ExportStatus
}

function ExportButtonContent({ status }: ExportButtonContentProps): ReactNode {
  if (status === 'exporting') {
    return (
      <>
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Exporting...
      </>
    )
  }

  if (status === 'done') {
    return (
      <>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Exported!
      </>
    )
  }

  return (
    <>
      Export
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </>
  )
}

interface ExportImportToolbarProps {
  assignments: TerritoryAssignments
  reps: SalesRep[]
  repColors: RepColors
  codeToName: Record<string, string>
  onImport: (data: TerritoryAssignments) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  lastSaved: Date | null
  isDirty: boolean
  mapRef: React.RefObject<L.Map | null>
  showLabels: boolean
  onToggleLabels: (show: boolean) => void
  showLegend: boolean
  onToggleLegend: (show: boolean) => void
  geoJsonData: StatesGeoJSON | null
}

function ExportImportToolbar({
  assignments,
  reps,
  repColors,
  codeToName,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  lastSaved,
  isDirty,
  mapRef,
  showLabels,
  onToggleLabels,
  showLegend,
  onToggleLegend,
  geoJsonData,
}: ExportImportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false)
      }
    }
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExportMenuOpen])

  const handleExportJSON = () => {
    exportAssignmentsAsJSON(assignments, reps)
    setIsExportMenuOpen(false)
  }

  const handleExportCSV = () => {
    exportAssignmentsAsCSV(assignments, codeToName, reps)
    setIsExportMenuOpen(false)
  }

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (!mapRef.current) return

    setIsExportMenuOpen(false)
    setExportStatus('exporting')

    // Small delay for menu to close
    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      // Get map bounds for label positioning
      const map = mapRef.current
      let mapBounds
      if (map) {
        const bounds = map.getBounds()
        mapBounds = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        }
      }

      // Get all visible state codes
      const visibleCodes = Object.keys(codeToName)

      // Prepare legend data for canvas drawing
      const legendData: LegendData = {
        reps: reps.map(r => ({ name: r.name, color: r.color })),
        assignments,
      }

      const options: MapExportOptions = {
        format,
        includeLegend: showLegend,
        includeLabels: showLabels,
        mapBounds,
        visibleCodes,
        legendData,
        geoJsonData: geoJsonData || undefined,
        repColors,
      }

      await exportMapAsImage(mapRef.current!, options)
      setExportStatus('done')
      // Reset after 2 seconds
      setTimeout(() => setExportStatus('idle'), 2000)
    } catch (error) {
      setExportStatus('idle')
      alert(error instanceof Error ? error.message : 'Export failed')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { assignments: imported, error } = await parseImportedJSON(file)

    if (error) {
      alert(`Import failed: ${error}`)
    } else {
      const count = Object.keys(imported).length
      if (count === 0) {
        alert('No valid assignments found in file')
      } else {
        onImport(imported)
      }
    }

    e.target.value = ''
  }

  const handleZoomIn = () => {
    mapRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    mapRef.current?.zoomOut()
  }

  const formatLastSaved = () => {
    if (!lastSaved) return ''
    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000)
    if (seconds < 5) return 'Saved'
    if (seconds < 60) return `Saved ${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `Saved ${minutes}m ago`
  }

  const assignmentCount = Object.keys(assignments).length

  return (
    <div className="fixed top-4 right-4 z-[750] flex items-center gap-1.5 bg-white rounded-lg shadow-lg p-1.5 border border-gray-200" data-export-exclude="true">
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Undo (Cmd+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Redo (Cmd+Shift+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Export Dropdown */}
      <div className="relative" ref={exportMenuRef}>
        <button
          onClick={() => exportStatus === 'idle' && setIsExportMenuOpen(!isExportMenuOpen)}
          disabled={assignmentCount === 0 || exportStatus !== 'idle'}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded disabled:opacity-40 disabled:cursor-not-allowed ${getExportButtonStyle(exportStatus)}`}
        >
          <ExportButtonContent status={exportStatus} />
        </button>
        {isExportMenuOpen && (
          <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-32 z-50">
            <button
              onClick={handleExportJSON}
              className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50"
            >
              JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50"
            >
              CSV
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => handleExportImage('png')}
              className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50"
            >
              PNG Image
            </button>
            <button
              onClick={() => handleExportImage('jpeg')}
              className="w-full px-3 py-1.5 text-xs text-left text-gray-700 hover:bg-gray-50"
            >
              JPEG Image
            </button>
          </div>
        )}
      </div>

      {/* Import */}
      <button
        onClick={handleImportClick}
        className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
        title="Import from JSON"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Labels Toggle */}
      <button
        onClick={() => onToggleLabels(!showLabels)}
        className={`px-2 py-1 text-xs font-medium rounded ${
          showLabels
            ? 'bg-blue-50 text-blue-700'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
        title="Toggle state labels"
      >
        Labels
      </button>

      {/* Legend Toggle */}
      <button
        onClick={() => onToggleLegend(!showLegend)}
        className={`px-2 py-1 text-xs font-medium rounded ${
          showLegend
            ? 'bg-blue-50 text-blue-700'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
        title="Toggle legend"
      >
        Legend
      </button>

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 pl-1.5 border-l border-gray-200">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
      </div>

      {/* Save status */}
      <div className="pl-1.5 border-l border-gray-200 flex items-center gap-1">
        {isDirty ? (
          <>
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Saving</span>
          </>
        ) : lastSaved ? (
          <>
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-500">{formatLastSaved()}</span>
          </>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </div>
    </div>
  )
}

export default ExportImportToolbar
