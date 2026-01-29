import type { SavedMap, SavedMapMeta, StoredRepData } from '../types/savedMaps'
import type { TerritoryAssignments } from '../types'
import { STORAGE_KEYS } from '../types/savedMaps'

// Generate a unique ID for new maps
export function generateMapId(): string {
  return crypto.randomUUID()
}

// Load the list of saved maps (metadata only)
export function loadSavedMapsList(): SavedMapMeta[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SAVED_LIST)
    if (stored) {
      return JSON.parse(stored) as SavedMapMeta[]
    }
  } catch (e) {
    console.warn('Failed to load saved maps list:', e)
  }
  return []
}

// Save the list of saved maps (metadata only)
export function saveSavedMapsList(list: SavedMapMeta[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_LIST, JSON.stringify(list))
  } catch (e) {
    console.warn('Failed to save maps list:', e)
  }
}

// Load a specific saved map by ID
export function loadSavedMap(id: string): SavedMap | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEYS.SAVED_MAP_PREFIX}${id}`)
    if (stored) {
      return JSON.parse(stored) as SavedMap
    }
  } catch (e) {
    console.warn(`Failed to load saved map ${id}:`, e)
  }
  return null
}

// Save a map (creates or updates)
export function saveSavedMap(map: SavedMap): void {
  try {
    localStorage.setItem(`${STORAGE_KEYS.SAVED_MAP_PREFIX}${map.id}`, JSON.stringify(map))

    // Update metadata in list
    const list = loadSavedMapsList()
    const stateCount = Object.keys(map.assignments).length
    const meta: SavedMapMeta = {
      id: map.id,
      name: map.name,
      createdAt: map.createdAt,
      modifiedAt: map.modifiedAt,
      stateCount,
    }

    const existingIndex = list.findIndex((m) => m.id === map.id)
    if (existingIndex >= 0) {
      list[existingIndex] = meta
    } else {
      list.push(meta)
    }

    saveSavedMapsList(list)
  } catch (e) {
    console.warn('Failed to save map:', e)
  }
}

// Delete a saved map
export function deleteSavedMap(id: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.SAVED_MAP_PREFIX}${id}`)

    // Remove from list
    const list = loadSavedMapsList()
    const filteredList = list.filter((m) => m.id !== id)
    saveSavedMapsList(filteredList)
  } catch (e) {
    console.warn(`Failed to delete map ${id}:`, e)
  }
}

// Get the currently active map ID
export function getActiveMapId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID)
  } catch {
    return null
  }
}

// Set the currently active map ID
export function setActiveMapId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id)
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID)
    }
  } catch (e) {
    console.warn('Failed to set active map ID:', e)
  }
}

// Create a SavedMap object from current state
export function createSavedMapFromState(
  name: string,
  reps: StoredRepData,
  assignments: TerritoryAssignments,
  existingId?: string
): SavedMap {
  const now = new Date().toISOString()
  return {
    id: existingId || generateMapId(),
    name,
    createdAt: existingId ? loadSavedMap(existingId)?.createdAt || now : now,
    modifiedAt: now,
    reps,
    assignments,
  }
}

// Migration: If there's existing data but no saved maps, create a default map
export function migrateExistingData(
  currentReps: StoredRepData,
  currentAssignments: TerritoryAssignments
): SavedMap | null {
  const list = loadSavedMapsList()

  // Only migrate if there are no saved maps and there's existing data
  if (list.length === 0 && Object.keys(currentAssignments).length > 0) {
    const map = createSavedMapFromState('Default Map', currentReps, currentAssignments)
    saveSavedMap(map)
    setActiveMapId(map.id)
    return map
  }

  return null
}
