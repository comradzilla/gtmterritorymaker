import { useState } from 'react'
import type { SalesRep } from '../data/reps'
import type { StateLookupMaps } from '../hooks/useGeoJson'

interface SlideOutPanelProps {
  isOpen: boolean
  onToggle: () => void
  reps: SalesRep[]
  onUpdateRepName: (id: string, name: string) => void
  onBulkAssign: (stateCodes: string[], repName: string) => void
  lookupMaps: StateLookupMaps
}

function SlideOutPanel({
  isOpen,
  onToggle,
  reps,
  onUpdateRepName,
  onBulkAssign,
  lookupMaps,
}: SlideOutPanelProps) {
  const [statesInput, setStatesInput] = useState('')
  const [selectedRepId, setSelectedRepId] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [editingReps, setEditingReps] = useState<Record<string, string>>({})

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

    setStatesInput('')
  }

  const handleRepNameChange = (id: string, value: string) => {
    setEditingReps((prev) => ({ ...prev, [id]: value }))
  }

  const handleRepNameBlur = (id: string) => {
    const newName = editingReps[id]
    if (newName !== undefined && newName.trim()) {
      onUpdateRepName(id, newName)
    }
    setEditingReps((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const getRepDisplayName = (rep: SalesRep) => {
    return editingReps[rep.id] !== undefined ? editingReps[rep.id] : rep.name
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        data-export-exclude="true"
        className={`fixed top-20 z-[900] bg-white shadow-lg rounded-r-lg p-2 transition-all duration-300 hover:bg-gray-50 border border-l-0 border-gray-200 ${
          isOpen ? 'left-80' : 'left-0'
        }`}
        aria-label={isOpen ? 'Close panel' : 'Open panel'}
      >
        <svg
          className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Panel */}
      <div
        data-export-exclude="true"
        className={`fixed inset-y-0 left-0 w-80 bg-white shadow-xl z-[800] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
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
              <p className="text-xs text-gray-500 mb-3">Click to select for assignment, edit names inline</p>

              <div className="space-y-2">
                {reps.map((rep) => (
                  <div
                    key={rep.id}
                    onClick={() => {
                      setSelectedRepId(rep.id)
                      setFeedback(null)
                    }}
                    className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-all ${
                      selectedRepId === rep.id
                        ? 'bg-blue-50 ring-2 ring-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: rep.color }}
                    />
                    <input
                      type="text"
                      value={getRepDisplayName(rep)}
                      onChange={(e) => handleRepNameChange(rep.id, e.target.value)}
                      onBlur={() => handleRepNameBlur(rep.id)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRepNameBlur(rep.id)
                          e.currentTarget.blur()
                        }
                      }}
                      className="flex-1 px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SlideOutPanel
