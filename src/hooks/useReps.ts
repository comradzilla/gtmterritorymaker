import { useCallback, useEffect, useMemo, useState } from 'react'

import { buildRepColorMap, SALES_REPS } from '../data/reps'
import type { SalesRep } from '../data/reps'
import type { RepColors } from '../types'

const STORAGE_KEY = 'territory-map-reps'

interface StoredRepData {
  [id: string]: { name: string; color?: string; territoryName?: string }
}

export interface UseRepsReturn {
  reps: SalesRep[]
  repColors: RepColors
  updateRepName: (id: string, newName: string) => void
  updateRepColor: (id: string, newColor: string) => void
  updateRepTerritory: (id: string, territoryName: string | undefined) => void
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

  return { reps, repColors, updateRepName, updateRepColor, updateRepTerritory }
}
