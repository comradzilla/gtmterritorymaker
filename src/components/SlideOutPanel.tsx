import { useEffect, useMemo, useState } from 'react'

import type { SalesRep } from '../data/reps'
import type { StateLookupMaps } from '../hooks/useGeoJson'
import type { TerritoryAssignments } from '../types'
import ConfirmationDialog from './ConfirmationDialog'

const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
]

type FeedbackType = 'success' | 'error'

interface Feedback {
  type: FeedbackType
  message: string
}

function getFeedbackStyle(type: FeedbackType): string {
  return type === 'success'
    ? 'bg-green-50 text-green-700'
    : 'bg-red-50 text-red-700'
}

interface SlideOutPanelProps {
  reps: SalesRep[]
  assignments: TerritoryAssignments
  onUpdateRepName: (id: string, name: string) => void
  onUpdateRepColor: (id: string, color: string) => void
  onUpdateRepTerritory: (id: string, territoryName: string | undefined) => void
  onUpdateRepNameInAssignments: (oldName: string, newName: string) => void
  onSyncRepAssignments: (repName: string, newCodes: string[]) => void
  lookupMaps: StateLookupMaps
}

interface ConflictInfo {
  code: string
  currentOwner: string
}

function SlideOutPanel({
  reps,
  assignments,
  onUpdateRepName,
  onUpdateRepColor,
  onUpdateRepTerritory,
  onUpdateRepNameInAssignments,
  onSyncRepAssignments,
  lookupMaps,
}: SlideOutPanelProps) {
  const [statesInput, setStatesInput] = useState('')
  const [selectedRepId, setSelectedRepId] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [colorPickerRepId, setColorPickerRepId] = useState<string | null>(null)
  const [editingRepId, setEditingRepId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'name' | 'territory' | null>(null)
  const [editingValue, setEditingValue] = useState('')

  // Confirmation dialog state
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [pendingSync, setPendingSync] = useState<{ repName: string; codes: string[]; conflicts: ConflictInfo[] } | null>(null)

  // Custom color picker state
  const [pendingCustomColor, setPendingCustomColor] = useState<string | null>(null)

  // Calculate state counts per rep
  const repCounts = useMemo(() => {
    const counts = new Map<string, number>()
    Object.values(assignments).forEach((a) => {
      counts.set(a.repName, (counts.get(a.repName) || 0) + 1)
    })
    return counts
  }, [assignments])

  // Compute states assigned to the selected rep
  const selectedRepStates = useMemo(() => {
    if (!selectedRepId) return ''
    const rep = reps.find((r) => r.id === selectedRepId)
    if (!rep) return ''
    return Object.entries(assignments)
      .filter(([, a]) => a.repName === rep.name)
      .map(([code]) => code)
      .sort()
      .join(', ')
  }, [selectedRepId, assignments, reps])

  // Update states input when selected rep changes
  useEffect(() => {
    setStatesInput(selectedRepStates)
  }, [selectedRepStates])

  // Parse input and resolve to state codes
  const parseStatesInput = (input: string): { codes: string[]; invalid: string[] } => {
    const codes: string[] = []
    const invalid: string[] = []

    const items = input.split(',').map((s) => s.trim()).filter(Boolean)

    items.forEach((item) => {
      const upperItem = item.toUpperCase()

      // Check if it's a valid state code directly
      if (lookupMaps.allCodes.has(upperItem)) {
        codes.push(upperItem)
        return
      }

      // Check if it's a state name (case-insensitive)
      const codeFromName = lookupMaps.nameToCode[item.toLowerCase()]
      if (codeFromName) {
        codes.push(codeFromName)
        return
      }

      // Invalid entry
      invalid.push(item)
    })

    return { codes: [...new Set(codes)], invalid } // Remove duplicates
  }

  const handleApply = () => {
    if (!selectedRepId) {
      setFeedback({ type: 'error', message: 'Please select a sales rep' })
      return
    }

    const rep = reps.find((r) => r.id === selectedRepId)
    if (!rep) return

    // Handle empty input - clear all assignments for this rep
    if (!statesInput.trim()) {
      onSyncRepAssignments(rep.name, [])
      setFeedback({ type: 'success', message: `Cleared all states from ${rep.name}` })
      return
    }

    const { codes, invalid } = parseStatesInput(statesInput)

    if (codes.length === 0 && invalid.length > 0) {
      setFeedback({ type: 'error', message: `No valid states found. Invalid entries: ${invalid.join(', ')}` })
      return
    }

    // Check for conflicts - states assigned to OTHER reps
    const conflicts: ConflictInfo[] = []
    codes.forEach((code) => {
      const currentAssignment = assignments[code]
      if (currentAssignment && currentAssignment.repName !== rep.name) {
        conflicts.push({ code, currentOwner: currentAssignment.repName })
      }
    })

    if (conflicts.length > 0) {
      // Show confirmation dialog
      setPendingSync({ repName: rep.name, codes, conflicts })
      setShowConflictDialog(true)
      return
    }

    // No conflicts - proceed with sync
    onSyncRepAssignments(rep.name, codes)

    if (invalid.length > 0) {
      setFeedback({
        type: 'success',
        message: `Updated ${codes.length} state(s). Unrecognized: ${invalid.join(', ')}`,
      })
    } else {
      setFeedback({ type: 'success', message: `Updated ${rep.name}'s territories` })
    }
  }

  const handleConfirmReassign = () => {
    if (!pendingSync) return
    // User chose to reassign - proceed with all codes including conflicts
    onSyncRepAssignments(pendingSync.repName, pendingSync.codes)
    setFeedback({ type: 'success', message: `Reassigned ${pendingSync.conflicts.length} state(s) to ${pendingSync.repName}` })
    setShowConflictDialog(false)
    setPendingSync(null)
  }

  const handleCancelReassign = () => {
    if (!pendingSync) return
    // User chose to leave as is - sync without the conflicting codes
    const conflictCodes = new Set(pendingSync.conflicts.map((c) => c.code))
    const nonConflictCodes = pendingSync.codes.filter((code) => !conflictCodes.has(code))
    onSyncRepAssignments(pendingSync.repName, nonConflictCodes)
    setFeedback({ type: 'success', message: `Updated territories (kept ${pendingSync.conflicts.length} state(s) with original owners)` })
    setShowConflictDialog(false)
    setPendingSync(null)
  }

  const handleSelectRep = (repId: string) => {
    setSelectedRepId(repId)
    setFeedback(null)
    setColorPickerRepId(null)
    // Cancel any editing when selecting a different rep
    if (editingRepId !== repId) {
      setEditingRepId(null)
      setEditingField(null)
    }
  }

  const startEditingName = (e: React.MouseEvent, rep: SalesRep) => {
    e.stopPropagation()
    setEditingRepId(rep.id)
    setEditingField('name')
    setEditingValue(rep.name)
    setColorPickerRepId(null)
  }

  const startEditingTerritory = (e: React.MouseEvent, rep: SalesRep) => {
    e.stopPropagation()
    setEditingRepId(rep.id)
    setEditingField('territory')
    setEditingValue(rep.territoryName || '')
    setColorPickerRepId(null)
  }

  const clearEditingState = () => {
    setEditingRepId(null)
    setEditingField(null)
    setEditingValue('')
  }

  const saveEditing = () => {
    if (!editingRepId || !editingField) return

    if (editingField === 'name' && editingValue.trim()) {
      const oldName = reps.find((r) => r.id === editingRepId)?.name
      const newName = editingValue.trim()
      // Update assignments first if name changed
      if (oldName && oldName !== newName) {
        onUpdateRepNameInAssignments(oldName, newName)
      }
      onUpdateRepName(editingRepId, newName)
    } else if (editingField === 'territory') {
      onUpdateRepTerritory(editingRepId, editingValue.trim() || undefined)
    }

    clearEditingState()
  }

  const toggleColorPicker = (e: React.MouseEvent, repId: string) => {
    e.stopPropagation()
    setColorPickerRepId(colorPickerRepId === repId ? null : repId)
    setPendingCustomColor(null)
    clearEditingState()
  }

  const selectColor = (repId: string, color: string) => {
    onUpdateRepColor(repId, color)
    setColorPickerRepId(null)
    setPendingCustomColor(null)
  }

  const applyCustomColor = (repId: string) => {
    if (pendingCustomColor) {
      onUpdateRepColor(repId, pendingCustomColor)
    }
    setColorPickerRepId(null)
    setPendingCustomColor(null)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Territory Manager</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Quick Assign Section */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Assign</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                States (comma-separated codes or names) — select rep below
              </label>
              <textarea
                value={statesInput}
                onChange={(e) => {
                  setStatesInput(e.target.value)
                  setFeedback(null)
                }}
                placeholder="CA, TX, New York, FL..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <button
              onClick={handleApply}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Apply
            </button>

            {feedback && (
              <div className={`p-2 text-xs rounded-md ${getFeedbackStyle(feedback.type)}`}>
                {feedback.message}
              </div>
            )}
          </div>
        </div>

        {/* Manage Reps Section */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Manage Reps</h3>
          <p className="text-xs text-gray-500 mb-2">Click row to select, pencil to edit name</p>

          {/* Column headers */}
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400 border-b border-gray-100 mb-1">
            <span className="w-4"></span>
            <span className="flex-1">Name</span>
            <span className="w-3.5"></span>
            <span className="w-6 text-center">#</span>
            <span className="mx-1"></span>
            <span className="w-28">Territory</span>
          </div>

          <div className="space-y-1">
            {reps.map((rep) => (
              <div key={rep.id}>
                {/* Main row */}
                <div
                  onClick={() => handleSelectRep(rep.id)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-all ${
                    selectedRepId === rep.id
                      ? 'bg-blue-50 ring-2 ring-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Color dot button */}
                  <button
                    onClick={(e) => toggleColorPicker(e, rep.id)}
                    className="w-4 h-4 rounded-full flex-shrink-0 hover:ring-2 hover:ring-gray-300 hover:ring-offset-1 transition-all"
                    style={{ backgroundColor: rep.color }}
                    title="Change color"
                  />

                  {/* Name column */}
                  {editingRepId === rep.id && editingField === 'name' ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing()
                        if (e.key === 'Escape') clearEditingState()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="flex-1 px-2 py-0.5 text-sm border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="flex-1 text-sm text-gray-900 truncate">{rep.name}</span>
                  )}

                  {/* Pencil icon for name edit */}
                  {editingRepId !== rep.id && (
                    <button
                      onClick={(e) => startEditingName(e, rep)}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                      title="Edit name"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}

                  {/* State count */}
                  <span className="w-6 text-center text-xs text-gray-500">
                    {repCounts.get(rep.name) || 0}
                  </span>

                  {/* Divider */}
                  <span className="text-gray-300 mx-1">│</span>

                  {/* Territory column */}
                  {editingRepId === rep.id && editingField === 'territory' ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing()
                        if (e.key === 'Escape') clearEditingState()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      placeholder="Territory name"
                      className="w-28 px-2 py-0.5 text-xs border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span
                      onClick={(e) => startEditingTerritory(e, rep)}
                      className="w-28 text-xs text-gray-400 truncate cursor-pointer hover:text-gray-600"
                      title={rep.territoryName ? `Territory: ${rep.territoryName}` : 'Click to add territory'}
                    >
                      {rep.territoryName || '—'}
                    </span>
                  )}
                </div>

                {/* Color toolbar - shown below row when picker is open */}
                {colorPickerRepId === rep.id && (
                  <div className="flex items-center gap-1.5 px-6 py-2 bg-gray-50 rounded-b-md border-t border-gray-100">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation()
                          selectColor(rep.id, color)
                        }}
                        className={`w-5 h-5 rounded-full hover:scale-110 transition-transform ${
                          rep.color === color ? 'ring-2 ring-gray-500 ring-offset-1' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    {/* Custom color picker */}
                    <label
                      className="relative w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform overflow-hidden border border-gray-300"
                      title="Custom color"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="color"
                        value={pendingCustomColor || rep.color}
                        onChange={(e) => {
                          e.stopPropagation()
                          setPendingCustomColor(e.target.value)
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {pendingCustomColor ? (
                        <span
                          className="absolute inset-0"
                          style={{ backgroundColor: pendingCustomColor }}
                        />
                      ) : (
                        <span className="absolute inset-0 bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
                      )}
                    </label>
                    {/* Apply button - shows when custom color is being picked */}
                    {pendingCustomColor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          applyCustomColor(rep.id)
                        }}
                        className="ml-1 px-2 py-0.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for reassigning states */}
      <ConfirmationDialog
        isOpen={showConflictDialog}
        title="Reassign States?"
        message={
          pendingSync
            ? `${pendingSync.conflicts.map((c) => c.code).join(', ')} ${pendingSync.conflicts.length === 1 ? 'is' : 'are'} already assigned to ${pendingSync.conflicts[0]?.currentOwner}. Would you like to reassign ${pendingSync.conflicts.length === 1 ? 'it' : 'them'} to ${pendingSync.repName}?`
            : ''
        }
        confirmLabel="Reassign"
        cancelLabel="Leave as is"
        variant="warning"
        onConfirm={handleConfirmReassign}
        onCancel={handleCancelReassign}
      />
    </div>
  )
}

export default SlideOutPanel
