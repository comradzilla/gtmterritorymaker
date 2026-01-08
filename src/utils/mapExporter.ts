import leafletImage from 'leaflet-image'
import type { Map as LeafletMap, Layer, Marker } from 'leaflet'
import { ALL_CENTROIDS, SMALL_STATE_LABEL_OFFSETS, needsLeaderLine } from '../data/stateCentroids'

export interface LegendData {
  reps: { name: string; color: string }[]
  assignments: Record<string, { repName: string }>
}

export interface MapExportOptions {
  format: 'png' | 'jpeg'
  quality?: number // 0-1 for JPEG
  includeLegend: boolean
  includeLabels?: boolean
  filename?: string
  mapBounds?: {
    north: number
    south: number
    east: number
    west: number
  }
  visibleCodes?: string[]
  legendData?: LegendData
}

/**
 * Wait for all map tiles to be loaded
 */
async function waitForTilesToLoad(map: LeafletMap, maxWait = 5000): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false

    const checkTiles = () => {
      // Check if any tile layers are still loading
      let loading = false
      map.eachLayer((layer: any) => {
        if (layer._loading) {
          loading = true
        }
      })

      if (!loading && !resolved) {
        resolved = true
        resolve()
      }
    }

    // Check immediately
    checkTiles()

    // Also check on load events
    map.once('load', () => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    })

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        console.log('Tile load wait timed out, proceeding anyway')
        resolve()
      }
    }, maxWait)

    // Also check periodically
    const interval = setInterval(() => {
      if (resolved) {
        clearInterval(interval)
        return
      }
      checkTiles()
    }, 200)
  })
}

/**
 * Export the Leaflet map as an image using leaflet-image with timeout
 */
export async function exportMapAsImage(
  map: LeafletMap,
  options: MapExportOptions
): Promise<void> {
  const { format, quality = 0.95, includeLegend, includeLabels = false, filename, mapBounds, visibleCodes, legendData } = options

  const TIMEOUT_MS = 15000 // 15 seconds

  // Remove DivIcon markers before capture - leaflet-image can't handle them
  // It crashes when trying to get iconUrl from DivIcon markers
  // We'll draw labels programmatically on canvas instead
  const removedLayers: Layer[] = []
  map.eachLayer((layer: Layer) => {
    // Check if this is a Marker with a DivIcon (no iconUrl)
    const marker = layer as Marker
    if (marker.getIcon && marker.getIcon()) {
      const icon = marker.getIcon() as any
      // DivIcon doesn't have iconUrl, regular Icon does
      if (!icon.options?.iconUrl) {
        removedLayers.push(layer)
      }
    }
  })

  // Remove the DivIcon markers from the map
  removedLayers.forEach(layer => map.removeLayer(layer))
  console.log(`Temporarily removed ${removedLayers.length} DivIcon markers for export`)

  try {
    console.log('Waiting for tiles to load...')
    await waitForTilesToLoad(map, 3000)
    console.log('Tiles ready, starting map capture with leaflet-image...')

    // Use leaflet-image with timeout
    const canvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Export timed out after 15 seconds. Please try again.'))
      }, TIMEOUT_MS)

      leafletImage(map, (err: Error | null, canvas: HTMLCanvasElement) => {
        clearTimeout(timeoutId)
        if (err) {
          reject(err)
        } else {
          resolve(canvas)
        }
      })
    })

    console.log('Map captured successfully, dimensions:', canvas.width, 'x', canvas.height)

    // Get canvas context for drawing overlays
    const ctx = canvas.getContext('2d')!

    // Draw labels if requested and we have bounds
    if (includeLabels && mapBounds && visibleCodes) {
      console.log('Drawing labels...')
      drawLabelsOnCanvas(ctx, canvas.width, canvas.height, mapBounds, visibleCodes)
      console.log('Labels drawn')
    }

    // Draw legend if requested
    if (includeLegend && legendData) {
      console.log('Drawing legend...')
      drawLegendOnCanvas(ctx, canvas.width, canvas.height, legendData)
      console.log('Legend drawn')
    }

    // Generate final data URL
    console.log('Generating data URL...')
    const finalDataUrl = canvas.toDataURL(
      format === 'jpeg' ? 'image/jpeg' : 'image/png',
      quality
    )
    console.log('Data URL generated, length:', finalDataUrl.length)

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const defaultFilename = `territory-map-${timestamp}.${format}`
    const finalFilename = filename || defaultFilename
    console.log('Downloading as:', finalFilename)

    // Download
    downloadDataUrl(finalDataUrl, finalFilename)
    console.log('Download triggered')
  } catch (error) {
    console.error('Failed to export map:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to export map image: ${errorMsg}`)
  } finally {
    // Restore the removed DivIcon markers to the map
    removedLayers.forEach(layer => map.addLayer(layer))
    console.log(`Restored ${removedLayers.length} DivIcon markers after export`)
  }
}

/**
 * Draw state labels directly onto the canvas
 */
function drawLabelsOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  bounds: { north: number; south: number; east: number; west: number },
  visibleCodes: string[]
): void {
  // Set up text styling
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const code of visibleCodes) {
    const centroid = ALL_CENTROIDS[code]
    if (!centroid) continue

    // Get label position (use offset for small states)
    const hasLeader = needsLeaderLine(code)
    const labelOffset = SMALL_STATE_LABEL_OFFSETS[code]
    const labelLat = hasLeader && labelOffset ? labelOffset.labelLat : centroid.lat
    const labelLng = hasLeader && labelOffset ? labelOffset.labelLng : centroid.lng

    // Convert lat/lng to pixel coordinates
    const x = lngToX(labelLng, bounds.west, bounds.east, canvasWidth)
    const y = latToY(labelLat, bounds.north, bounds.south, canvasHeight)

    // Skip if outside canvas
    if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) continue

    // Draw leader line for small states
    if (hasLeader) {
      const centroidX = lngToX(centroid.lng, bounds.west, bounds.east, canvasWidth)
      const centroidY = latToY(centroid.lat, bounds.north, bounds.south, canvasHeight)

      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(centroidX, centroidY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw white outline (simulate text-shadow)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.strokeText(code, x, y)

    // Draw text
    ctx.fillStyle = '#1f2937'
    ctx.fillText(code, x, y)
  }
}

/**
 * Draw legend directly onto the canvas
 */
function drawLegendOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  legendData: LegendData
): void {
  const { reps, assignments } = legendData

  // Count territories per rep
  const territoryCounts: Record<string, number> = {}
  for (const assignment of Object.values(assignments)) {
    const repName = assignment.repName.toLowerCase()
    territoryCounts[repName] = (territoryCounts[repName] || 0) + 1
  }

  // Only show reps that have territories
  const activeReps = reps.filter(
    (rep) => territoryCounts[rep.name.toLowerCase()] > 0
  )

  if (activeReps.length === 0) return

  // Legend dimensions
  const padding = 12
  const lineHeight = 18
  const dotRadius = 6
  const titleHeight = 22
  const separatorHeight = 16
  const legendWidth = 150
  const legendHeight = titleHeight + (activeReps.length * lineHeight) + separatorHeight + lineHeight + padding * 2

  // Position in bottom-right
  const legendX = canvasWidth - legendWidth - 20
  const legendY = canvasHeight - legendHeight - 20

  // Draw background
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2
  roundRect(ctx, legendX, legendY, legendWidth, legendHeight, 6)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  // Draw border
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  roundRect(ctx, legendX, legendY, legendWidth, legendHeight, 6)
  ctx.stroke()

  // Draw title
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = '#111827'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('Territories', legendX + padding, legendY + padding)

  // Draw active reps
  let currentY = legendY + padding + titleHeight
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

  for (const rep of activeReps) {
    const count = territoryCounts[rep.name.toLowerCase()] || 0

    // Draw color dot
    ctx.fillStyle = rep.color
    ctx.beginPath()
    ctx.arc(legendX + padding + dotRadius, currentY + lineHeight / 2, dotRadius / 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw name
    ctx.fillStyle = '#374151'
    ctx.textAlign = 'left'
    ctx.fillText(rep.name, legendX + padding + dotRadius * 2 + 6, currentY + 3)

    // Draw count
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'right'
    ctx.fillText(count.toString(), legendX + legendWidth - padding, currentY + 3)

    currentY += lineHeight
  }

  // Draw separator
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(legendX + padding, currentY + 2)
  ctx.lineTo(legendX + legendWidth - padding, currentY + 2)
  ctx.stroke()

  currentY += separatorHeight

  // Draw unassigned
  ctx.fillStyle = '#d1d5db'
  ctx.beginPath()
  ctx.arc(legendX + padding + dotRadius, currentY + lineHeight / 2 - 6, dotRadius / 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#6b7280'
  ctx.textAlign = 'left'
  ctx.fillText('Unassigned', legendX + padding + dotRadius * 2 + 6, currentY - 3)
}

/**
 * Draw a rounded rectangle
 */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Convert longitude to X pixel coordinate
 */
function lngToX(lng: number, west: number, east: number, width: number): number {
  return ((lng - west) / (east - west)) * width
}

/**
 * Convert latitude to Y pixel coordinate (inverted because Y increases downward)
 */
function latToY(lat: number, north: number, south: number, height: number): number {
  return ((north - lat) / (north - south)) * height
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
