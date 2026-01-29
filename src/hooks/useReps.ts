import { useCallback, useEffect, useMemo, useState } from 'react'

import { buildRepColorMap, SALES_REPS } from '../data/reps'
import type { SalesRep } from '../data/reps'
import type { RepColors } from '../types'
import type { StoredRepData } from '../types/savedMaps'

const STORAGE_KEY = 'territory-map-reps'

const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
]

export interface UseRepsReturn {
  reps: SalesRep[]
  repColors: RepColors
  updateRepName: (id: string, newName: string) => void
  updateRepColor: (id: string, newColor: string) => void
  updateRepTerritory: (id: string, territoryName: string | undefined) => void
  importReps: (names: string[]) => void
  resetToData: (data: StoredRepData) => void
  getStoredRepData: () => StoredRepData
}

export function useReps(): UseRepsReturn {
  const [reps, setReps] = useState<SalesRep[]>(() => {
    // Initialize from localStorage if available
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const storedData: StoredRepData = JSON.parse(stored)
        return SALES_REPS.map((rep) => ({
          ...rep,
          name: storedData[rep.id]?.name || rep.name,
          color: storedData[rep.id]?.color || rep.color,
          territoryName: storedData[rep.id]?.territoryName,
        }))
      }
    } catch (e) {
      console.warn('Failed to load reps from localStorage:', e)
    }
    return SALES_REPS
  })

  // Save to localStorage whenever reps change
  useEffect(() => {
    try {
      const dataToStore: StoredRepData = {}
      reps.forEach((rep) => {
        dataToStore[rep.id] = {
          name: rep.name,
          color: rep.color,
          territoryName: rep.territoryName,
        }
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore))
    } catch (e) {
      console.warn('Failed to save reps to localStorage:', e)
    }
  }, [reps])

  // Build color map from current reps
  const repColors = useMemo(() => buildRepColorMap(reps), [reps])

  // Helper to update a specific rep field
  const updateRep = useCallback((id: string, updates: Partial<SalesRep>) => {
    setReps((prev) =>
      prev.map((rep) => (rep.id === id ? { ...rep, ...updates } : rep))
    )
  }, [])

  const updateRepName = useCallback((id: string, newName: string) => {
    if (!newName.trim()) return
    updateRep(id, { name: newName.trim() })
  }, [updateRep])

  const updateRepColor = useCallback((id: string, newColor: string) => {
    updateRep(id, { color: newColor })
  }, [updateRep])

  const updateRepTerritory = useCallback((id: string, territoryName: string | undefined) => {
    updateRep(id, { territoryName })
  }, [updateRep])

  // Import rep names - updates existing reps with new names and auto-assigns colors
  const importReps = useCallback((names: string[]) => {
    setReps((prev) =>
      prev.map((rep, index) => {
        const newName = names[index]
        if (newName) {
          return {
            ...rep,
            name: newName.trim(),
            color: COLOR_PALETTE[index % COLOR_PALETTE.length],
            territoryName: undefined, // Clear territory on import
          }
        }
        // Keep existing rep if no name provided for this slot
        return rep
      })
    )
  }, [])

  // Reset to specific data (for loading saved maps)
  const resetToData = useCallback((data: StoredRepData) => {
    setReps(
      SALES_REPS.map((rep) => ({
        ...rep,
        name: data[rep.id]?.name || rep.name,
        color: data[rep.id]?.color || rep.color,
        territoryName: data[rep.id]?.territoryName,
      }))
    )
  }, [])

  // Get current reps as stored data format
  const getStoredRepData = useCallback((): StoredRepData => {
    const data: StoredRepData = {}
    reps.forEach((rep) => {
      data[rep.id] = {
        name: rep.name,
        color: rep.color,
        territoryName: rep.territoryName,
      }
    })
    return data
  }, [reps])

  return { reps, repColors, updateRepName, updateRepColor, updateRepTerritory, importReps, resetToData, getStoredRepData }
}
