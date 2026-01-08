import type { SalesRep } from '../data/reps'
import type { SelectedState, Assignment } from '../types'

interface AssignmentModalProps {
  selectedState: SelectedState
  reps: SalesRep[]
  currentAssignment: Assignment | null
  onAssign: (repName: string) => void
  onUnassign: () => void
  onClose: () => void
}

function AssignmentModal({
  selectedState,
  reps,
  currentAssignment,
  onAssign,
  onUnassign,
  onClose,
}: AssignmentModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[1000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-80 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedState.name}
          </h2>
          <p className="text-sm text-gray-500">{selectedState.code}</p>
        </div>

        {/* Current assignment */}
        {currentAssignment && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">Currently assigned to:</p>
            <div className="flex items-center justify-between mt-1">
              <span className="font-medium text-gray-900">
                {currentAssignment.repName}
              </span>
              <button
                onClick={onUnassign}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Rep list */}
        <div className="max-h-64 overflow-y-auto">
          <p className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
            {currentAssignment ? 'Reassign to:' : 'Assign to:'}
          </p>
          {reps.map((rep) => (
            <button
              key={rep.id}
              onClick={() => onAssign(rep.name)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 transition-colors text-left"
            >
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: rep.color }}
              />
              <span className="text-gray-900">{rep.name}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssignmentModal
