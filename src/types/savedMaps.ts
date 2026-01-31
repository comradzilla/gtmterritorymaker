import type { TerritoryAssignments } from './index'

// Rep data stored in localStorage
export interface StoredRepData {
  [id: string]: {
    name: string
    color?: string
    territoryName?: string
  }
}

// Metadata for listing saved maps (lightweight)
export interface SavedMapMeta {
  id: string
  name: string
  createdAt: string
  modifiedAt: string
  stateCount: number
}

// Full saved map data
export interface SavedMap {
  id: string
  name: string
  createdAt: string
  modifiedAt: string
  reps: StoredRepData
  assignments: TerritoryAssignments
  repOrder?: string[]  // Ordered rep IDs; absent in older saved maps
}

// Context for the currently active map
export interface MapContext {
  activeMapId: string | null
  activeMapName: string | null
  hasUnsavedChanges: boolean
}

// Storage keys
export const STORAGE_KEYS = {
  SAVED_LIST: 'territory-map-saved-list',
  SAVED_MAP_PREFIX: 'territory-map-saved-',
  ACTIVE_ID: 'territory-map-active-id',
} as const
