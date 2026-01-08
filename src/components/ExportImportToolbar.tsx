import { useRef } from 'react'
import type { TerritoryAssignments } from '../types'
import type { SalesRep } from '../data/reps'
import {
  exportAssignmentsAsJSON,
  exportAssignmentsAsCSV,
  parseImportedJSON,
} from '../utils/exportUtils'

interface ExportImportToolbarProps {
  assignments: TerritoryAssignments
  reps: SalesRep[]
  codeToName: Record<string, string>
  onImport: (data: TerritoryAssignments) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  lastSaved: Date | null
  isDirty: boolean
}

function ExportImportToolbar({
  assignments,
  reps,
  codeToName,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  lastSaved,
  isDirty,
}: ExportImportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportJSON = () => {
    exportAssignmentsAsJSON(assignments, reps)
  }

  const handleExportCSV = () => {
    exportAssignmentsAsCSV(assignments, codeToName)
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

    // Reset input so same file can be selected again
    e.target.value = ''
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
    <div className="fixed top-4 right-4 z-[750] flex items-center gap-2 bg-white rounded-lg shadow-lg p-2 border border-gray-200">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
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

      {/* Export/Import */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleExportJSON}
          disabled={assignmentCount === 0}
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Export as JSON"
        >
          JSON
        </button>
        <button
          onClick={handleExportCSV}
          disabled={assignmentCount === 0}
          className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Export as CSV"
        >
          CSV
        </button>
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
      </div>

      {/* Save status */}
      <div className="pl-2 border-l border-gray-200 flex items-center gap-1.5">
        {isDirty ? (
          <>
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Saving...</span>
          </>
        ) : lastSaved ? (
          <>
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-500">{formatLastSaved()}</span>
          </>
        ) : (
          <span className="text-xs text-gray-400">No changes</span>
        )}
      </div>
    </div>
  )
}

export default ExportImportToolbar
