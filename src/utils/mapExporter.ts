import { toPng, toJpeg } from 'html-to-image'

export interface MapExportOptions {
  format: 'png' | 'jpeg'
  quality?: number // 0-1 for JPEG
  includeLegend: boolean
  filename?: string
}

/**
 * Export the map container as an image
 */
export async function exportMapAsImage(
  mapContainer: HTMLElement,
  legendElement: HTMLElement | null,
  options: MapExportOptions
): Promise<void> {
  const { format, quality = 0.95, includeLegend, filename } = options

  // Filter function to exclude unwanted elements
  const filter = (node: HTMLElement): boolean => {
    // Exclude these elements from capture
    const className = node.className?.toString() || ''
    if (className.includes('leaflet-control-zoom')) return false
    if (className.includes('leaflet-control-attribution')) return false
    if (node.getAttribute?.('data-export-exclude') === 'true') return false
    return true
  }

  try {
    // Capture map
    const toImageFn = format === 'jpeg' ? toJpeg : toPng
    const imageOptions = {
      cacheBust: true,
      filter,
      backgroundColor: '#ffffff',
      quality: format === 'jpeg' ? quality : undefined,
      pixelRatio: 2, // Higher resolution for better quality
    }

    let dataUrl = await toImageFn(mapContainer, imageOptions)

    // If including legend, composite it onto the image
    if (includeLegend && legendElement) {
      dataUrl = await compositeWithLegend(dataUrl, legendElement, format, quality)
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const defaultFilename = `territory-map-${timestamp}.${format}`
    const finalFilename = filename || defaultFilename

    // Download the image
    downloadDataUrl(dataUrl, finalFilename)
  } catch (error) {
    console.error('Failed to export map:', error)
    throw new Error('Failed to export map image. Please try again.')
  }
}

/**
 * Composite the legend onto the map image
 */
async function compositeWithLegend(
  mapDataUrl: string,
  legendElement: HTMLElement,
  format: 'png' | 'jpeg',
  quality: number
): Promise<string> {
  // Capture legend
  const legendDataUrl = await toPng(legendElement, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  })

  // Load both images
  const [mapImg, legendImg] = await Promise.all([
    loadImage(mapDataUrl),
    loadImage(legendDataUrl),
  ])

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = mapImg.width
  canvas.height = mapImg.height
  const ctx = canvas.getContext('2d')!

  // Draw map
  ctx.drawImage(mapImg, 0, 0)

  // Draw legend in bottom-right corner with padding
  const padding = 40 // Scaled for pixelRatio
  const legendX = canvas.width - legendImg.width - padding
  const legendY = canvas.height - legendImg.height - padding
  ctx.drawImage(legendImg, legendX, legendY)

  // Return as data URL
  return canvas.toDataURL(
    format === 'jpeg' ? 'image/jpeg' : 'image/png',
    quality
  )
}

/**
 * Load an image from a data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Download a data URL as a file
 */
function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Check if the browser supports image export
 */
export function supportsImageExport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext && canvas.getContext('2d'))
  } catch {
    return false
  }
}
