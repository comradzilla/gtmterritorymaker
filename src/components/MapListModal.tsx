import { useEffect, useMemo, useState } from 'react'

import type { SavedMapMeta } from '../types/savedMaps'
import ConfirmationDialog from './ConfirmationDialog'
import SaveMapDialog from './SaveMapDialog'

interface MapListModalProps {
  isOpen: boolean
  savedMaps: SavedMapMeta[]
  activeMapId: string | null
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, newName: string) => void
  onClose: () => void
}

type SortKey = 'name' | 'modifiedAt' | 'stateCount'
type SortDir = 'asc' | 'desc'

function MapListModal({
  isOpen,
  savedMaps,
  activeMapId,
  onLoad,
  onDelete,
  onRename,
  onClose,
}: MapListModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('modifiedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deleteTarget, setDeleteTarget] = useState<SavedMapMeta | null>(null)
  const [renameTarget, setRenameTarget] = useState<SavedMapMeta | null>(null)

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleteTarget && !renameTarget) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, deleteTarget, renameTarget, onClose])

  // Filter and sort maps
  const filteredMaps = useMemo(() => {
    let maps = savedMaps

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      maps = maps.filter((m) => m.name.toLowerCase().includes(q))
    }

    // Sort
    maps = [...maps].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortKey === 'modifiedAt') {
        cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
      } else if (sortKey === 'stateCount') {
        cmp = a.stateCount - b.stateCount
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return maps
  }, [savedMaps, searchQuery, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const formatDate = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
    <svg
      className={`w-4 h-4 ml-1 inline-block ${active ? 'text-blue-600' : 'text-gray-400'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={dir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
      />
    </svg>
  )

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Saved Maps</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="mt-4 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search maps..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {filteredMaps.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {savedMaps.length === 0 ? 'No saved maps yet' : 'No maps match your search'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th
                      onClick={() => handleSort('name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Name
                      <SortIcon active={sortKey === 'name'} dir={sortKey === 'name' ? sortDir : 'asc'} />
                    </th>
                    <th
                      onClick={() => handleSort('stateCount')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      States
                      <SortIcon active={sortKey === 'stateCount'} dir={sortKey === 'stateCount' ? sortDir : 'desc'} />
                    </th>
                    <th
                      onClick={() => handleSort('modifiedAt')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Modified
                      <SortIcon active={sortKey === 'modifiedAt'} dir={sortKey === 'modifiedAt' ? sortDir : 'desc'} />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMaps.map((map) => (
                    <tr
                      key={map.id}
                      className={`hover:bg-gray-50 ${map.id === activeMapId ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900">{map.name}</span>
                          {map.id === activeMapId && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {map.stateCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(map.modifiedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              onLoad(map.id)
                              onClose()
                            }}
                            disabled={map.id === activeMapId}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => setRenameTarget(map)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => setDeleteTarget(map)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete Map?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id)
            setDeleteTarget(null)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Rename dialog */}
      <SaveMapDialog
        isOpen={!!renameTarget}
        title="Rename Map"
        initialName={renameTarget?.name || ''}
        confirmLabel="Rename"
        onConfirm={(name) => {
          if (renameTarget) {
            onRename(renameTarget.id, name)
            setRenameTarget(null)
          }
        }}
        onCancel={() => setRenameTarget(null)}
      />
    </>
  )
}

export default MapListModal
