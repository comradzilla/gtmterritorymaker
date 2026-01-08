import leafletImage from 'leaflet-image'
import L from 'leaflet'
import type { Map as LeafletMap, Layer, Marker } from 'leaflet'
import { ALL_CENTROIDS, SMALL_STATE_LABEL_OFFSETS, needsLeaderLine } from '../data/stateCentroids'

interface LabelPosition {
  code: string
  labelX: number
  labelY: number
  centroidX: number
  centroidY: number
  hasLeader: boolean
}

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
  geoJsonData?: GeoJSON.FeatureCollection
  repColors?: Record<string, string>
}

interface PolygonPosition {
  code: string
  paths: { x: number; y: number }[][]
  fillColor: string
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
  const { format, quality = 0.95, includeLegend, includeLabels = false, filename, visibleCodes, legendData, geoJsonData, repColors } = options

  const TIMEOUT_MS = 15000 // 15 seconds

  // Pre-calculate polygon positions for territory shading
  const polygonPositions: PolygonPosition[] = []
  const mapSize = map.getSize()

  if (geoJsonData && legendData && repColors) {
    for (const feature of geoJsonData.features) {
      const code = (feature.properties as any)?.code
      if (!code) continue

      const assignment = legendData.assignments[code]
      if (!assignment) continue // Skip unassigned territories

      const repColor = repColors[assignment.repName.toLowerCase()]
      if (!repColor) continue

      // Get coordinates based on geometry type
      const geometry = feature.geometry
      const coordArrays: number[][][] = []

      if (geometry.type === 'Polygon') {
        coordArrays.push(...(geometry.coordinates as number[][][]))
      } else if (geometry.type === 'MultiPolygon') {
        for (const polygon of geometry.coordinates as number[][][][]) {
          coordArrays.push(...polygon)
        }
      }

      // Convert each ring to pixel positions
      const paths: { x: number; y: number }[][] = []
      for (const ring of coordArrays) {
        const path: { x: number; y: number }[] = []
        for (const coord of ring) {
          const point = map.latLngToContainerPoint(L.latLng(coord[1], coord[0]))
          path.push({ x: point.x, y: point.y })
        }
        paths.push(path)
      }

      if (paths.length > 0) {
        polygonPositions.push({
          code,
          paths,
          fillColor: repColor,
        })
      }
    }
    console.log(`Pre-calculated positions for ${polygonPositions.length} territory polygons`)
  }

  // Pre-calculate label positions using Leaflet's projection BEFORE removing markers
  // This gives us accurate pixel positions that match the map's projection
  const labelPositions: LabelPosition[] = []

  if (includeLabels && visibleCodes) {
    for (const code of visibleCodes) {
      const centroid = ALL_CENTROIDS[code]
      if (!centroid) continue

      const hasLeader = needsLeaderLine(code)
      const labelOffset = SMALL_STATE_LABEL_OFFSETS[code]
      const labelLat = hasLeader && labelOffset ? labelOffset.labelLat : centroid.lat
      const labelLng = hasLeader && labelOffset ? labelOffset.labelLng : centroid.lng

      // Use Leaflet's projection to get accurate pixel positions
      const labelPoint = map.latLngToContainerPoint(L.latLng(labelLat, labelLng))
      const centroidPoint = map.latLngToContainerPoint(L.latLng(centroid.lat, centroid.lng))

      labelPositions.push({
        code,
        labelX: labelPoint.x,
        labelY: labelPoint.y,
        centroidX: centroidPoint.x,
        centroidY: centroidPoint.y,
        hasLeader,
      })
    }
    console.log(`Pre-calculated positions for ${labelPositions.length} labels`)
  }

  // Remove DivIcon markers before capture - leaflet-image can't handle them
  // It crashes when trying to get iconUrl from DivIcon markers
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

    // Calculate scale factor between map container and canvas
    const scaleX = canvas.width / mapSize.x
    const scaleY = canvas.height / mapSize.y

    // Draw territory polygons FIRST (under labels)
    if (polygonPositions.length > 0) {
      console.log('Drawing territory polygons...')
      drawPolygonsOnCanvas(ctx, polygonPositions, scaleX, scaleY)
      console.log('Territory polygons drawn')
    }

    // Draw labels if requested using pre-calculated positions
    if (includeLabels && labelPositions.length > 0) {
      console.log('Drawing labels...')
      drawLabelsOnCanvas(ctx, labelPositions, scaleX, scaleY)
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
 * Draw state labels directly onto the canvas using pre-calculated positions
 */
function drawLabelsOnCanvas(
  ctx: CanvasRenderingContext2D,
  labelPositions: LabelPosition[],
  scaleX: number,
  scaleY: number
): void {
  // Set up text styling - scale font size with canvas
  const fontSize = Math.round(12 * Math.max(scaleX, scaleY))
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const pos of labelPositions) {
    // Scale positions to match canvas size
    const x = pos.labelX * scaleX
    const y = pos.labelY * scaleY

    // Draw leader line for small states
    if (pos.hasLeader) {
      const centroidX = pos.centroidX * scaleX
      const centroidY = pos.centroidY * scaleY

      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = Math.max(1, scaleX)
      ctx.setLineDash([4 * scaleX, 4 * scaleX])
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(centroidX, centroidY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw white outline (simulate text-shadow)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3 * Math.max(scaleX, scaleY)
    ctx.strokeText(pos.code, x, y)

    // Draw text
    ctx.fillStyle = '#1f2937'
    ctx.fillText(pos.code, x, y)
  }
}

/**
 * Draw territory polygons directly onto the canvas
 */
function drawPolygonsOnCanvas(
  ctx: CanvasRenderingContext2D,
  polygonPositions: PolygonPosition[],
  scaleX: number,
  scaleY: number
): void {
  for (const polygon of polygonPositions) {
    ctx.fillStyle = polygon.fillColor
    ctx.strokeStyle = '#374151' // Border color (gray-700)
    ctx.lineWidth = Math.max(1, scaleX)
    ctx.globalAlpha = 0.5 // Match fillOpacity from StateLayer

    for (const path of polygon.paths) {
      if (path.length < 3) continue

      ctx.beginPath()
      const startX = path[0].x * scaleX
      const startY = path[0].y * scaleY
      ctx.moveTo(startX, startY)

      for (let i = 1; i < path.length; i++) {
        const x = path[i].x * scaleX
        const y = path[i].y * scaleY
        ctx.lineTo(x, y)
      }

      ctx.closePath()
      ctx.fill()
    }

    // Draw borders separately with full opacity
    ctx.globalAlpha = 1
    for (const path of polygon.paths) {
      if (path.length < 3) continue

      ctx.beginPath()
      const startX = path[0].x * scaleX
      const startY = path[0].y * scaleY
      ctx.moveTo(startX, startY)

      for (let i = 1; i < path.length; i++) {
        const x = path[i].x * scaleX
        const y = path[i].y * scaleY
        ctx.lineTo(x, y)
      }

      ctx.closePath()
      ctx.stroke()
    }
  }

  // Reset alpha
  ctx.globalAlpha = 1
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
