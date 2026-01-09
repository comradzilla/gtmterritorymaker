import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'territory-map-panel-width'
const DEFAULT_WIDTH = 320
const MIN_WIDTH = 240
const MAX_WIDTH = 600

interface UsePanelResizeReturn {
  width: number
  isResizing: boolean
  startResize: (e: React.MouseEvent) => void
}

export function usePanelResize(): UsePanelResizeReturn {
  const [width, setWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('Failed to load panel width:', e)
    }
    return DEFAULT_WIDTH
  })

  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Persist width changes (debounced)
  useEffect(() => {
    if (isResizing) return // Don't save while actively resizing

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, String(width))
      } catch (e) {
        console.warn('Failed to save panel width:', e)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [width, isResizing])

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }, [width])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    // Prevent text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  return { width, isResizing, startResize }
}

export { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH }
