import { useCallback, useEffect, useMemo, useState } from 'react'

import { buildRepColorMap, EXTENDED_COLOR_PALETTE, generateRepId, MAX_REPS, SALES_REPS } from '../data/reps'
import type { SalesRep } from '../data/reps'
import type { RepColors } from '../types'
import type { StoredRepData } from '../types/savedMaps'

const STORAGE_KEY = 'territory-map-reps'

// ---------- Storage format ----------
// V1 (legacy): StoredRepData keyed object with keys rep1–rep6
// V2: { version: 2, reps: SalesRep[] }
interface StoredV2 {
  version: 2
  reps: SalesRep[]
}

function isV2(raw: unknown): raw is StoredV2 {
  return typeof raw === 'object' && raw !== null && (raw as StoredV2).version === 2
}

function migrateV1(data: StoredRepData): SalesRep[] {
  // Rebuild from SALES_REPS template + stored overrides
  return SALES_REPS.map((rep) => ({
    ...rep,
    name: data[rep.id]?.name || rep.name,
    color: data[rep.id]?.color || rep.color,
    territoryName: data[rep.id]?.territoryName,
  }))
}

function loadRepsFromStorage(): SalesRep[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return [...SALES_REPS]
    const parsed = JSON.parse(stored)
    if (isV2(parsed)) return parsed.reps
    // Legacy V1
    return migrateV1(parsed as StoredRepData)
  } catch {
    return [...SALES_REPS]
  }
}

function saveRepsToStorage(reps: SalesRep[]) {
  try {
    const payload: StoredV2 = { version: 2, reps }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save reps to localStorage:', e)
  }
}

// Pick the next unused color from the extended palette
function nextUnusedColor(reps: SalesRep[]): string {
  const used = new Set(reps.map((r) => r.color))
  for (const c of EXTENDED_COLOR_PALETTE) {
    if (!used.has(c)) return c
  }
  // All used — just cycle
  return EXTENDED_COLOR_PALETTE[reps.length % EXTENDED_COLOR_PALETTE.length]
}

export interface UseRepsReturn {
  reps: SalesRep[]
  repColors: RepColors
  updateRepName: (id: string, newName: string) => void
  updateRepColor: (id: string, newColor: string) => void
  updateRepTerritory: (id: string, territoryName: string | undefined) => void
  importReps: (names: string[]) => void
  resetToData: (data: StoredRepData, repOrder?: string[]) => void
  getStoredRepData: () => StoredRepData
  getRepOrder: () => string[]
  addRep: () => SalesRep | null
  removeRep: (id: string) => void
  clearAllReps: () => void
}

export function useReps(): UseRepsReturn {
  const [reps, setReps] = useState<SalesRep[]>(loadRepsFromStorage)

  // Persist whenever reps change
  useEffect(() => { saveRepsToStorage(reps) }, [reps])

  const repColors = useMemo(() => buildRepColorMap(reps), [reps])

  // --- Existing mutations ---
  const updateRep = useCallback((id: string, updates: Partial<SalesRep>) => {
    setReps((prev) => prev.map((rep) => (rep.id === id ? { ...rep, ...updates } : rep)))
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

  // Import rep names — dynamically creates reps for every name provided
  const importReps = useCallback((names: string[]) => {
    setReps(() => {
      return names.map((name, i) => ({
        id: generateRepId(),
        name: name.trim(),
        color: EXTENDED_COLOR_PALETTE[i % EXTENDED_COLOR_PALETTE.length],
      }))
    })
  }, [])

  // Reset to stored data (for loading saved maps)
  const resetToData = useCallback((data: StoredRepData, repOrder?: string[]) => {
    const ids = repOrder || Object.keys(data)
    setReps(
      ids
        .filter((id) => data[id]) // guard against stale order entries
        .map((id) => ({
          id,
          name: data[id].name,
          color: data[id].color || EXTENDED_COLOR_PALETTE[0],
          territoryName: data[id].territoryName,
        }))
    )
  }, [])

  // Serialise current reps to the StoredRepData format used by saved maps
  const getStoredRepData = useCallback((): StoredRepData => {
    const data: StoredRepData = {}
    reps.forEach((rep) => {
      data[rep.id] = { name: rep.name, color: rep.color, territoryName: rep.territoryName }
    })
    return data
  }, [reps])

  const getRepOrder = useCallback((): string[] => reps.map((r) => r.id), [reps])

  // --- New: dynamic add / remove / clear ---
  const addRep = useCallback((): SalesRep | null => {
    let created: SalesRep | null = null
    setReps((prev) => {
      if (prev.length >= MAX_REPS) return prev
      const newRep: SalesRep = {
        id: generateRepId(),
        name: '',
        color: nextUnusedColor(prev),
      }
      created = newRep
      return [...prev, newRep]
    })
    return created
  }, [])

  const removeRep = useCallback((id: string) => {
    setReps((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const clearAllReps = useCallback(() => {
    setReps([...SALES_REPS])
  }, [])

  return {
    reps,
    repColors,
    updateRepName,
    updateRepColor,
    updateRepTerritory,
    importReps,
    resetToData,
    getStoredRepData,
    getRepOrder,
    addRep,
    removeRep,
    clearAllReps,
  }
}
