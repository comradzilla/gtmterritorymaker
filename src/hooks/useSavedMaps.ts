import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SALES_REPS } from '../data/reps'
import type { SavedMap, SavedMapMeta, StoredRepData } from '../types/savedMaps'
import type { TerritoryAssignments } from '../types'
import {
  loadSavedMapsList,
  loadSavedMap,
  saveSavedMap,
  deleteSavedMap,
  getActiveMapId,
  setActiveMapId,
  createSavedMapFromState,
  migrateExistingData,
} from '../utils/savedMapsStorage'

export interface UseSavedMapsProps {
  reps: StoredRepData
  repOrder: string[]
  assignments: TerritoryAssignments
  isDirty: boolean
  onLoadMap: (reps: StoredRepData, assignments: TerritoryAssignments, repOrder?: string[]) => void
  onMarkClean: () => void
}

export interface UseSavedMapsReturn {
  // State
  savedMaps: SavedMapMeta[]
  activeMapId: string | null
  activeMapName: string | null
  hasUnsavedChanges: boolean

  // Actions
  saveCurrentMap: () => void
  saveAsNewMap: (name: string) => void
  loadMap: (id: string) => boolean
  createNewMap: () => void
  deleteMap: (id: string) => void
  renameMap: (id: string, newName: string) => void

  // Helpers
  isActiveMap: (id: string) => boolean
}

export function useSavedMaps({
  reps,
  repOrder,
  assignments,
  isDirty,
  onLoadMap,
  onMarkClean,
}: UseSavedMapsProps): UseSavedMapsReturn {
  const [savedMaps, setSavedMaps] = useState<SavedMapMeta[]>(() => loadSavedMapsList())
  const [activeMapId, setActiveMapIdState] = useState<string | null>(() => getActiveMapId())

  // Track if we've done initial migration
  const hasMigrated = useRef(false)

  // Run migration on first load if needed
  useEffect(() => {
    if (hasMigrated.current) return
    hasMigrated.current = true

    const migratedMap = migrateExistingData(reps, assignments)
    if (migratedMap) {
      setSavedMaps(loadSavedMapsList())
      setActiveMapIdState(migratedMap.id)
    }
  }, [reps, assignments])

  // Get the active map name
  const activeMapName = useMemo(() => {
    if (!activeMapId) return null
    const map = savedMaps.find((m) => m.id === activeMapId)
    return map?.name || null
  }, [activeMapId, savedMaps])

  // Track unsaved changes
  const hasUnsavedChanges = isDirty

  // Save current map (update existing or prompt for name if new)
  const saveCurrentMap = useCallback(() => {
    if (!activeMapId) {
      // No active map - caller should use saveAsNewMap with a name
      return
    }

    const map = createSavedMapFromState(
      activeMapName || 'Untitled Map',
      reps,
      assignments,
      activeMapId,
      repOrder
    )
    saveSavedMap(map)
    setSavedMaps(loadSavedMapsList())
    onMarkClean()
  }, [activeMapId, activeMapName, reps, assignments, repOrder, onMarkClean])

  // Save as a new map with a given name
  const saveAsNewMap = useCallback(
    (name: string) => {
      const map = createSavedMapFromState(name, reps, assignments, undefined, repOrder)
      saveSavedMap(map)
      setActiveMapIdState(map.id)
      setActiveMapId(map.id)
      setSavedMaps(loadSavedMapsList())
      onMarkClean()
    },
    [reps, repOrder, assignments, onMarkClean]
  )

  // Load a saved map
  const loadMap = useCallback(
    (id: string): boolean => {
      const map = loadSavedMap(id)
      if (!map) return false

      onLoadMap(map.reps, map.assignments, map.repOrder)
      setActiveMapIdState(id)
      setActiveMapId(id)
      return true
    },
    [onLoadMap]
  )

  // Create a new blank map
  const createNewMap = useCallback(() => {
    // Reset to 6 default reps with no assignments
    const defaultReps: StoredRepData = {}
    SALES_REPS.forEach((rep) => {
      defaultReps[rep.id] = { name: rep.name, color: rep.color }
    })
    const defaultAssignments: TerritoryAssignments = {}
    const defaultOrder = SALES_REPS.map((r) => r.id)
    onLoadMap(defaultReps, defaultAssignments, defaultOrder)
    setActiveMapIdState(null)
    setActiveMapId(null)
  }, [onLoadMap])

  // Delete a saved map
  const deleteMapCallback = useCallback(
    (id: string) => {
      deleteSavedMap(id)
      setSavedMaps(loadSavedMapsList())

      // If deleting the active map, reset to untitled
      if (activeMapId === id) {
        setActiveMapIdState(null)
        setActiveMapId(null)
      }
    },
    [activeMapId]
  )

  // Rename a saved map
  const renameMap = useCallback(
    (id: string, newName: string) => {
      const map = loadSavedMap(id)
      if (!map) return

      const updatedMap: SavedMap = {
        ...map,
        name: newName,
        modifiedAt: new Date().toISOString(),
      }
      saveSavedMap(updatedMap)
      setSavedMaps(loadSavedMapsList())
    },
    []
  )

  // Check if a map is the active one
  const isActiveMap = useCallback(
    (id: string) => activeMapId === id,
    [activeMapId]
  )

  return {
    savedMaps,
    activeMapId,
    activeMapName,
    hasUnsavedChanges,
    saveCurrentMap,
    saveAsNewMap,
    loadMap,
    createNewMap,
    deleteMap: deleteMapCallback,
    renameMap,
    isActiveMap,
  }
}
