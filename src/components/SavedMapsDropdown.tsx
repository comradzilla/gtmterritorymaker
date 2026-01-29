import { useEffect, useRef, useState } from 'react'

import type { SavedMapMeta } from '../types/savedMaps'

interface SavedMapsDropdownProps {
  activeMapName: string | null
  activeMapId: string | null
  hasUnsavedChanges: boolean
  savedMaps: SavedMapMeta[]
  onSave: () => void
  onSaveAs: () => void
  onNew: () => void
  onOpenList: () => void
  onLoadMap: (id: string) => void
}

function SavedMapsDropdown({
  activeMapName,
  activeMapId,
  hasUnsavedChanges,
  savedMaps,
  onSave,
  onSaveAs,
  onNew,
  onOpenList,
  onLoadMap,
}: SavedMapsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const displayName = activeMapName || 'Untitled Map'
  const recentMaps = savedMaps
    .filter((m) => m.id !== activeMapId)
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
    .slice(0, 5)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-medium text-gray-700 max-w-[150px] truncate">{displayName}</span>
        {hasUnsavedChanges && (
          <span className="text-gray-400" title="Unsaved changes">*</span>
        )}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[1000]">
          {/* Actions */}
          <div className="border-b border-gray-100 pb-1 mb-1">
            <button
              onClick={() => {
                onSave()
                setIsOpen(false)
              }}
              disabled={!activeMapId && !hasUnsavedChanges}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span>Save</span>
              <span className="text-xs text-gray-400">Cmd+S</span>
            </button>
            <button
              onClick={() => {
                onSaveAs()
                setIsOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
            >
              <span>Save As...</span>
              <span className="text-xs text-gray-400">Cmd+Shift+S</span>
            </button>
            <button
              onClick={() => {
                onNew()
                setIsOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              New Map
            </button>
            <button
              onClick={() => {
                onOpenList()
                setIsOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
            >
              <span>Open Map...</span>
              <span className="text-xs text-gray-400">Cmd+O</span>
            </button>
          </div>

          {/* Recent maps */}
          {recentMaps.length > 0 && (
            <div>
              <div className="px-4 py-1 text-xs text-gray-500 uppercase tracking-wider">
                Recent Maps
              </div>
              {recentMaps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => {
                    onLoadMap(map.id)
                    setIsOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                >
                  <span className="truncate">{map.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{map.stateCount} states</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SavedMapsDropdown
