import { useEffect, useRef, useState } from 'react'

import type { SalesRep } from '../data/reps'

interface RemoveRepDialogProps {
  isOpen: boolean
  rep: SalesRep
  stateCount: number
  otherReps: SalesRep[]
  onConfirm: (reassignToRepName: string | null) => void
  onCancel: () => void
}

function RemoveRepDialog({ isOpen, rep, stateCount, otherReps, onConfirm, onCancel }: RemoveRepDialogProps) {
  const [selected, setSelected] = useState<string | null>(null) // null = unassign
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSelected(null)
      confirmRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 rounded-full bg-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Remove {rep.name || 'this rep'}?</h3>
              <p className="mt-2 text-sm text-gray-600">
                This rep has <strong>{stateCount}</strong> assigned state{stateCount !== 1 ? 's' : ''}.
                Choose what to do with them:
              </p>

              <div className="mt-4 space-y-2">
                {/* Unassign option */}
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reassign"
                    checked={selected === null}
                    onChange={() => setSelected(null)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Unassign all states</span>
                </label>

                {/* Reassign options */}
                {otherReps.map((other) => (
                  <label key={other.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                    <input
                      type="radio"
                      name="reassign"
                      checked={selected === other.name}
                      onChange={() => setSelected(other.name)}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: other.color }}
                    />
                    <span className="text-sm text-gray-700">{other.name || other.id}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={() => onConfirm(selected)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Remove Rep
          </button>
        </div>
      </div>
    </div>
  )
}

export default RemoveRepDialog
