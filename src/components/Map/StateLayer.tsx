import { GeoJSON } from 'react-leaflet'
import type { Layer, PathOptions } from 'leaflet'
import type { Feature, Geometry } from 'geojson'
import type { StatesGeoJSON, StateProperties, TerritoryAssignments, RepColors } from '../../types'

interface StateLayerProps {
  data: StatesGeoJSON
  assignments: TerritoryAssignments
  repColors: RepColors
  onStateClick: (code: string, name: string) => void
}

const DEFAULT_STYLE: PathOptions = {
  fillColor: '#E5E7EB',
  weight: 1,
  opacity: 1,
  color: '#374151',
  fillOpacity: 0.5,
}

const HOVER_STYLE: PathOptions = {
  fillOpacity: 0.7,
}

function StateLayer({ data, assignments, repColors, onStateClick }: StateLayerProps) {
  const getStyle = (feature: Feature<Geometry, StateProperties> | undefined): PathOptions => {
    if (!feature?.properties) return DEFAULT_STYLE

    const { code } = feature.properties
    const assignment = assignments[code]

    if (assignment) {
      const color = repColors[assignment.repName.toLowerCase()]
      if (color) {
        return {
          ...DEFAULT_STYLE,
          fillColor: color,
        }
      }
    }

    return DEFAULT_STYLE
  }

  const onEachFeature = (feature: Feature<Geometry, StateProperties>, layer: Layer) => {
    const { code, name } = feature.properties

    // Click handler
    layer.on('click', () => {
      onStateClick(code, name)
    })

    // Hover effects
    layer.on('mouseover', (e) => {
      const target = e.target as L.Path
      target.setStyle(HOVER_STYLE)
      target.bringToFront()
    })

    layer.on('mouseout', (e) => {
      const target = e.target as L.Path
      target.setStyle({ fillOpacity: 0.5 })
    })

    // Tooltip with state name
    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'state-tooltip'
    })
  }

  // Key forces re-render when assignments or colors change
  const layerKey = JSON.stringify({ assignments, repColors })

  return (
    <GeoJSON
      key={layerKey}
      data={data}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  )
}

export default StateLayer
