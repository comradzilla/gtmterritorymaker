import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { SalesRep } from '../data/reps'
import type { TerritoryAssignments } from '../types'

interface LegendProps {
  reps: SalesRep[]
  assignments: TerritoryAssignments
}

interface TerritoryItem {
  territoryName: string
  repName: string
  color: string
  count: number
}

function Legend({ reps, assignments }: LegendProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null)

  // Build territory summary based on rep.territoryName
  const { territories, repsWithoutTerritory } = useMemo(() => {
    // Count assignments per rep
    const repCounts = new Map<string, number>()
    Object.values(assignments).forEach((a) => {
      repCounts.set(a.repName, (repCounts.get(a.repName) || 0) + 1)
    })

    // Build territory list from reps that have assignments
    const territories: TerritoryItem[] = []
    const repsWithoutTerritory: { repName: string; color: string; count: number }[] = []

    reps.forEach((rep) => {
      const count = repCounts.get(rep.name) || 0
      if (count === 0) return // Skip reps with no assignments

      if (rep.territoryName) {
        territories.push({
          territoryName: rep.territoryName,
          repName: rep.name,
          color: rep.color,
          count,
        })
      } else {
        repsWithoutTerritory.push({
          repName: rep.name,
          color: rep.color,
          count,
        })
      }
    })

    // Sort territories alphabetically
    territories.sort((a, b) => a.territoryName.localeCompare(b.territoryName))

    return { territories, repsWithoutTerritory }
  }, [assignments, reps])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start drag if clicking inside the legend content area (allow text selection)
    if ((e.target as HTMLElement).tagName === 'INPUT') return

    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    }
    e.preventDefault()
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return

    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY

    setPosition({
      x: dragRef.current.initialX + deltaX,
      y: dragRef.current.initialY + deltaY,
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragRef.current = null
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const legendStyle = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const hasContent = territories.length > 0 || repsWithoutTerritory.length > 0

  if (!hasContent) {
    return (
      <div
        className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[700] select-none"
        style={legendStyle}
        onMouseDown={handleMouseDown}
      >
        <p className="text-xs text-gray-500">
          Click a state to assign
        </p>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[700] min-w-36 select-none"
      style={legendStyle}
      onMouseDown={handleMouseDown}
    >
      <h3 className="text-xs font-semibold text-gray-900 mb-1.5">Territories</h3>
      <div className="space-y-1">
        {/* Named territories */}
        {territories.map((territory) => (
          <div key={`${territory.territoryName}-${territory.repName}`} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: territory.color }}
            />
            <span className="text-xs text-gray-700 flex-1 truncate" title={`${territory.repName} - ${territory.territoryName}`}>
              {territory.repName} - {territory.territoryName}
            </span>
            <span className="text-xs text-gray-500">{territory.count}</span>
          </div>
        ))}
        {/* Reps without territory names */}
        {repsWithoutTerritory.map((item) => (
          <div key={item.repName} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-500 flex-1 truncate italic">{item.repName}</span>
            <span className="text-xs text-gray-500">{item.count}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300" />
          <span className="text-xs text-gray-500">Unassigned</span>
        </div>
      </div>
    </div>
  )
}

export default Legend
