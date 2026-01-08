import { useState, useEffect, useMemo, useCallback } from 'react'
import { SALES_REPS, buildRepColorMap } from '../data/reps'
import type { SalesRep } from '../data/reps'
import type { RepColors } from '../types'

const STORAGE_KEY = 'territory-map-reps'

interface StoredRepData {
  [id: string]: { name: string }
}

export interface UseRepsReturn {
  reps: SalesRep[]
  repColors: RepColors
  updateRepName: (id: string, newName: string) => void
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
        dataToStore[rep.id] = { name: rep.name }
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore))
    } catch (e) {
      console.warn('Failed to save reps to localStorage:', e)
    }
  }, [reps])

  // Build color map from current reps
  const repColors = useMemo(() => buildRepColorMap(reps), [reps])

  // Update a rep's name
  const updateRepName = useCallback((id: string, newName: string) => {
    if (!newName.trim()) return
    setReps((prev) =>
      prev.map((rep) =>
        rep.id === id ? { ...rep, name: newName.trim() } : rep
      )
    )
  }, [])

  return { reps, repColors, updateRepName }
}
