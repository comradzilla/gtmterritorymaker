import { useEffect, useRef } from 'react'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onSaveAndSwitch: () => void
  onSwitchWithoutSaving: () => void
  onCancel: () => void
}

function UnsavedChangesDialog({
  isOpen,
  onSaveAndSwitch,
  onSwitchWithoutSaving,
  onCancel,
}: UnsavedChangesDialogProps) {
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  // Focus save button when dialog opens
  useEffect(() => {
    if (isOpen) {
      saveButtonRef.current?.focus()
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 rounded-full bg-yellow-100">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
              <p className="mt-2 text-sm text-gray-600">
                You have unsaved changes. Would you like to save before switching maps?
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onSwitchWithoutSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Don't Save
          </button>
          <button
            ref={saveButtonRef}
            onClick={onSaveAndSwitch}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save & Switch
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnsavedChangesDialog
