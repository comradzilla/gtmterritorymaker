import { useMemo } from 'react'
import { Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'
import type { StatesGeoJSON } from '../../types'
import {
  ALL_CENTROIDS,
  SMALL_STATE_LABEL_OFFSETS,
  needsLeaderLine,
} from '../../data/stateCentroids'

interface StateLabelsProps {
  data: StatesGeoJSON
  showLabels: boolean
}

function StateLabels({ data, showLabels }: StateLabelsProps) {
  // Create label data from features
  const labels = useMemo(() => {
    if (!data?.features) return []

    return data.features
      .map((feature) => {
        const { code, name } = feature.properties
        const centroid = ALL_CENTROIDS[code]

        if (!centroid) {
          // Fallback: try to calculate from bounds if we have the geometry
          return null
        }

        const hasLeader = needsLeaderLine(code)
        const labelOffset = SMALL_STATE_LABEL_OFFSETS[code]

        return {
          code,
          name,
          centroidLat: centroid.lat,
          centroidLng: centroid.lng,
          labelLat: hasLeader && labelOffset ? labelOffset.labelLat : centroid.lat,
          labelLng: hasLeader && labelOffset ? labelOffset.labelLng : centroid.lng,
          hasLeader,
        }
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
  }, [data])

  if (!showLabels) return null

  return (
    <>
      {labels.map((label) => (
        <StateLabel key={label.code} {...label} />
      ))}
    </>
  )
}

interface StateLabelData {
  code: string
  name: string
  centroidLat: number
  centroidLng: number
  labelLat: number
  labelLng: number
  hasLeader: boolean
}

function StateLabel({
  code,
  centroidLat,
  centroidLng,
  labelLat,
  labelLng,
  hasLeader,
}: StateLabelData) {
  // Create a custom DivIcon for the label
  const icon = useMemo(() => {
    return L.divIcon({
      className: 'state-label-marker',
      html: `<div class="state-label-text">${code}</div>`,
      iconSize: [40, 20],
      iconAnchor: [20, 10],
    })
  }, [code])

  return (
    <>
      {/* Leader line for small states */}
      {hasLeader && (
        <Polyline
          positions={[
            [labelLat, labelLng],
            [centroidLat, centroidLng],
          ]}
          pathOptions={{
            color: '#6b7280',
            weight: 1,
            opacity: 0.7,
            dashArray: '3, 3',
          }}
        />
      )}

      {/* Label marker */}
      <Marker
        position={[labelLat, labelLng]}
        icon={icon}
        interactive={false}
      />
    </>
  )
}

export default StateLabels
