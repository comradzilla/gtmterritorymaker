import { useCallback, useEffect, useRef, useState } from 'react'

import type { StateLookupMaps } from '../hooks/useGeoJson'
import type { TerritoryAssignments } from '../types'
import { parseImportData, toAssignments, type ImportData, type ParsedRow } from '../utils/importParser'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (assignments: TerritoryAssignments, repNames: string[], mode: 'replace' | 'merge') => void
  lookupMaps: StateLookupMaps
}

type TabType = 'paste' | 'upload'

function ImportModal({ isOpen, onClose, onImport, lookupMaps }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('paste')
  const [pasteText, setPasteText] = useState('')
  const [importData, setImportData] = useState<ImportData | null>(null)
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace')
  const [showConfirm, setShowConfirm] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'paste') {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen, activeTab])

  // Parse data when paste text changes
  useEffect(() => {
    if (pasteText.trim()) {
      const data = parseImportData(pasteText, lookupMaps)
      setImportData(data)
    } else {
      setImportData(null)
    }
  }, [pasteText, lookupMaps])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirm) {
          setShowConfirm(false)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, showConfirm])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        setPasteText(text)
        setActiveTab('paste') // Switch to paste tab to show preview
      } catch (err) {
        console.error('Failed to read file:', err)
      }

      e.target.value = ''
    },
    []
  )

  const handleImportClick = () => {
    if (importMode === 'replace') {
      setShowConfirm(true)
    } else {
      executeImport()
    }
  }

  const executeImport = () => {
    if (!importData) return

    const assignments = toAssignments(importData.rows)
    onImport(assignments, importData.repNames, importMode)
    handleClose()
  }

  const handleClose = () => {
    setPasteText('')
    setImportData(null)
    setShowConfirm(false)
    setImportMode('replace')
    onClose()
  }

  const validRowCount = importData?.rows.filter((r) => r.isValid).length || 0
  const hasErrors = (importData?.errors.length || 0) > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import Territory Data</h2>
          <p className="text-sm text-gray-500 mt-1">
            Paste data from a spreadsheet or upload a CSV file
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'paste'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Paste Data
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload CSV
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste your data (State, Rep Name)
                </label>
                <textarea
                  ref={textareaRef}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`CA, John Smith\nTX, John Smith\nNY, Sarah Jones\nFL, Sarah Jones`}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepts state codes (CA, TX) or names (California, Texas)
                </p>
              </div>

              {/* Preview */}
              {importData && importData.rows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Preview</span>
                    <span className="text-xs text-gray-500">
                      {validRowCount} valid assignment{validRowCount !== 1 ? 's' : ''} | {importData.repNames.length} rep{importData.repNames.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            State
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Rep
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importData.rows.slice(0, 20).map((row, i) => (
                          <PreviewRow key={i} row={row} />
                        ))}
                        {importData.rows.length > 20 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-center text-xs text-gray-500">
                              ... and {importData.rows.length - 20} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Errors */}
                  {hasErrors && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-600 font-medium mb-1">Warnings:</p>
                      <ul className="text-xs text-red-600 space-y-0.5">
                        {importData.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importData.errors.length > 5 && (
                          <li>... and {importData.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Upload a file
                  </button>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">CSV, TSV, or TXT</p>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Expected format:</p>
                <pre className="bg-gray-50 p-3 rounded-md text-xs font-mono">
                  State,Rep{'\n'}CA,John Smith{'\n'}TX,John Smith{'\n'}NY,Sarah Jones
                </pre>
              </div>
            </div>
          )}

          {/* Import Mode */}
          {importData && validRowCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Import Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Replace all</span>
                  <span className="text-xs text-gray-500">(clear existing data)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Merge</span>
                  <span className="text-xs text-gray-500">(keep existing, add new)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImportClick}
            disabled={!importData || validRowCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Import {validRowCount > 0 ? `(${validRowCount})` : ''}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Replace All Data?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will clear all existing assignments and rep names. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={executeImport}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PreviewRow({ row }: { row: ParsedRow }) {
  return (
    <tr className={row.isValid ? '' : 'bg-red-50'}>
      <td className="px-3 py-2 text-gray-900">
        {row.stateName}
        {row.stateCode !== row.stateName && (
          <span className="text-gray-400 ml-1">({row.stateCode})</span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-900">{row.repName}</td>
      <td className="px-3 py-2">
        {row.isValid ? (
          <span className="text-green-600 text-xs">Valid</span>
        ) : (
          <span className="text-red-600 text-xs" title={row.error}>
            Invalid
          </span>
        )}
      </td>
    </tr>
  )
}

export default ImportModal
