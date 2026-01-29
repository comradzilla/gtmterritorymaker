import { useEffect, useRef, useState } from 'react'

interface SaveMapDialogProps {
  isOpen: boolean
  title: string
  initialName?: string
  confirmLabel?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

function SaveMapDialog({
  isOpen,
  title,
  initialName = '',
  confirmLabel = 'Save',
  onConfirm,
  onCancel,
}: SaveMapDialogProps) {
  const [name, setName] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset name when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      // Focus input after a small delay to ensure it's rendered
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialName])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onConfirm(name.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div>
              <label htmlFor="map-name" className="block text-sm font-medium text-gray-700 mb-1">
                Map Name
              </label>
              <input
                ref={inputRef}
                id="map-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corp, Q1 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SaveMapDialog
