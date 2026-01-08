import { useState, useEffect, useCallback, useRef } from 'react'
import type { TerritoryAssignments } from '../types'

const STORAGE_KEY = 'territory-map-assignments'
const MAX_HISTORY = 50
const DEBOUNCE_MS = 300

interface HistoryState {
  past: TerritoryAssignments[]
  present: TerritoryAssignments
  future: TerritoryAssignments[]
}

export interface UseAssignmentsReturn {
  assignments: TerritoryAssignments
  setAssignment: (code: string, repName: string) => void
  removeAssignment: (code: string) => void
  bulkAssign: (codes: string[], repName: string) => void
  clearAll: () => void
  importAssignments: (data: TerritoryAssignments) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  lastSaved: Date | null
  isDirty: boolean
}

function loadFromStorage(): TerritoryAssignments {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate structure
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as TerritoryAssignments
      }
    }
  } catch (e) {
    console.warn('Failed to load assignments from localStorage:', e)
  }
  return {}
}

function saveToStorage(assignments: TerritoryAssignments): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
  } catch (e) {
    console.warn('Failed to save assignments to localStorage:', e)
  }
}

export function useAssignments(): UseAssignmentsReturn {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: loadFromStorage(),
    future: [],
  }))

  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const saveTimeoutRef = useRef<number | null>(null)

  // Debounced save to localStorage
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    setIsDirty(true)

    saveTimeoutRef.current = window.setTimeout(() => {
      saveToStorage(history.present)
      setLastSaved(new Date())
      setIsDirty(false)
    }, DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [history.present])

  // Push new state to history
  const pushState = useCallback((newPresent: TerritoryAssignments) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present].slice(-MAX_HISTORY),
      present: newPresent,
      future: [],
    }))
  }, [])

  const setAssignment = useCallback(
    (code: string, repName: string) => {
      pushState({
        ...history.present,
        [code]: {
          repName,
          assignedAt: new Date().toISOString(),
        },
      })
    },
    [history.present, pushState]
  )

  const removeAssignment = useCallback(
    (code: string) => {
      const next = { ...history.present }
      delete next[code]
      pushState(next)
    },
    [history.present, pushState]
  )

  const bulkAssign = useCallback(
    (codes: string[], repName: string) => {
      const timestamp = new Date().toISOString()
      const next = { ...history.present }
      codes.forEach((code) => {
        next[code] = { repName, assignedAt: timestamp }
      })
      pushState(next)
    },
    [history.present, pushState]
  )

  const clearAll = useCallback(() => {
    pushState({})
  }, [pushState])

  const importAssignments = useCallback(
    (data: TerritoryAssignments) => {
      pushState(data)
    },
    [pushState]
  )

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev
      const previous = prev.past[prev.past.length - 1]
      const newPast = prev.past.slice(0, -1)
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev
      const next = prev.future[0]
      const newFuture = prev.future.slice(1)
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      }
    })
  }, [])

  return {
    assignments: history.present,
    setAssignment,
    removeAssignment,
    bulkAssign,
    clearAll,
    importAssignments,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    lastSaved,
    isDirty,
  }
}
