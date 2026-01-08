import { useState } from 'react'
import { exportMapAsImage, type MapExportOptions } from '../utils/mapExporter'

interface MapExportButtonProps {
  mapContainerRef: React.RefObject<HTMLDivElement | null>
  legendRef: React.RefObject<HTMLDivElement | null>
  showLabels: boolean
  onToggleLabels: (show: boolean) => void
}

function MapExportButton({
  mapContainerRef,
  legendRef,
  showLabels,
  onToggleLabels,
}: MapExportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [includeLegend, setIncludeLegend] = useState(true)
  const [includeLabels, setIncludeLabels] = useState(true)

  const handleExport = async () => {
    if (!mapContainerRef.current) return

    setIsExporting(true)

    // Temporarily show labels if needed for export
    const wasLabelsHidden = !showLabels && includeLabels
    if (wasLabelsHidden) {
      onToggleLabels(true)
      // Wait for labels to render
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    try {
      const options: MapExportOptions = {
        format,
        includeLegend,
      }

      await exportMapAsImage(
        mapContainerRef.current,
        includeLegend ? legendRef.current : null,
        options
      )

      setIsDialogOpen(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Export failed')
    } finally {
      // Restore labels state if we changed it
      if (wasLabelsHidden) {
        onToggleLabels(false)
      }
      setIsExporting(false)
    }
  }

  return (
    <>
      {/* Export Image Button */}
      <button
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50"
        title="Export map as image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Export Image
      </button>

      {/* Export Options Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !isExporting && setIsDialogOpen(false)}
          />

          <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Export Map Image
              </h3>

              <div className="space-y-4">
                {/* Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="format"
                        value="png"
                        checked={format === 'png'}
                        onChange={() => setFormat('png')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">PNG</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="format"
                        value="jpeg"
                        checked={format === 'jpeg'}
                        onChange={() => setFormat('jpeg')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">JPEG</span>
                    </label>
                  </div>
                </div>

                {/* Include Legend */}
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeLegend}
                    onChange={(e) => setIncludeLegend(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include legend</span>
                </label>

                {/* Include Labels */}
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={includeLabels}
                    onChange={(e) => setIncludeLabels(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Include state labels</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsDialogOpen(false)}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  'Download'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MapExportButton
