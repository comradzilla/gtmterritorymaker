import { useState, useMemo, useEffect } from 'react'
import type { SalesRep } from '../data/reps'
import type { StateLookupMaps } from '../hooks/useGeoJson'
import type { TerritoryAssignments } from '../types'

const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
]

interface SlideOutPanelProps {
  reps: SalesRep[]
  assignments: TerritoryAssignments
  onUpdateRepName: (id: string, name: string) => void
  onUpdateRepColor: (id: string, color: string) => void
  onUpdateRepTerritory: (id: string, territoryName: string | undefined) => void
  onBulkAssign: (stateCodes: string[], repName: string) => void
  lookupMaps: StateLookupMaps
}

function SlideOutPanel({
  reps,
  assignments,
  onUpdateRepName,
  onUpdateRepColor,
  onUpdateRepTerritory,
  onBulkAssign,
  lookupMaps,
}: SlideOutPanelProps) {
  const [statesInput, setStatesInput] = useState('')
  const [selectedRepId, setSelectedRepId] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [colorPickerRepId, setColorPickerRepId] = useState<string | null>(null)
  const [editingRepId, setEditingRepId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<'name' | 'territory' | null>(null)
  const [editingValue, setEditingValue] = useState('')

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

    if (!statesInput.trim()) {
      setFeedback({ type: 'error', message: 'Please enter state codes or names' })
      return
    }

    const rep = reps.find((r) => r.id === selectedRepId)
    if (!rep) return

    const { codes, invalid } = parseStatesInput(statesInput)

    if (codes.length === 0) {
      setFeedback({ type: 'error', message: `No valid states found. Invalid entries: ${invalid.join(', ')}` })
      return
    }

    onBulkAssign(codes, rep.name)

    if (invalid.length > 0) {
      setFeedback({
        type: 'success',
        message: `Assigned ${codes.length} state(s). Unrecognized: ${invalid.join(', ')}`,
      })
    } else {
      setFeedback({ type: 'success', message: `Assigned ${codes.length} state(s) to ${rep.name}` })
    }
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

  const saveEditing = () => {
    if (!editingRepId || !editingField) return

    if (editingField === 'name') {
      if (editingValue.trim()) {
        onUpdateRepName(editingRepId, editingValue.trim())
      }
    } else if (editingField === 'territory') {
      onUpdateRepTerritory(editingRepId, editingValue.trim() || undefined)
    }

    setEditingRepId(null)
    setEditingField(null)
    setEditingValue('')
  }

  const cancelEditing = () => {
    setEditingRepId(null)
    setEditingField(null)
    setEditingValue('')
  }

  const toggleColorPicker = (e: React.MouseEvent, repId: string) => {
    e.stopPropagation()
    setColorPickerRepId(colorPickerRepId === repId ? null : repId)
    // Cancel editing when opening color picker
    setEditingRepId(null)
    setEditingField(null)
  }

  const selectColor = (repId: string, color: string) => {
    onUpdateRepColor(repId, color)
    setColorPickerRepId(null)
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
              <div
                className={`p-2 text-xs rounded-md ${
                  feedback.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
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
                        if (e.key === 'Escape') cancelEditing()
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
                        if (e.key === 'Escape') cancelEditing()
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SlideOutPanel
