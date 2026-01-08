import type { FeatureCollection, Feature, Geometry } from 'geojson'

export interface StateProperties {
  name: string
  code: string
}

export type StateFeature = Feature<Geometry, StateProperties>
export type StatesGeoJSON = FeatureCollection<Geometry, StateProperties>

export interface Assignment {
  repName: string
  assignedAt: string
}

export interface TerritoryAssignments {
  [stateCode: string]: Assignment
}

export interface RepColors {
  [repName: string]: string
}

export interface SelectedState {
  code: string
  name: string
}
