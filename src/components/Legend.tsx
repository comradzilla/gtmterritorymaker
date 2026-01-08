import { useState, useEffect, useRef, useCallback } from 'react'
import type { SalesRep } from '../data/reps'
import type { TerritoryAssignments } from '../types'

interface LegendProps {
  reps: SalesRep[]
  assignments: TerritoryAssignments
}

function Legend({ reps, assignments }: LegendProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null)

  // Count territories per rep
  const territoryCounts = Object.values(assignments).reduce((acc, assignment) => {
    const repName = assignment.repName.toLowerCase()
    acc[repName] = (acc[repName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Only show reps that have at least one territory assigned
  const activeReps = reps.filter(
    (rep) => territoryCounts[rep.name.toLowerCase()] > 0
  )

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

  if (activeReps.length === 0) {
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
      className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[700] min-w-32 select-none"
      style={legendStyle}
      onMouseDown={handleMouseDown}
    >
      <h3 className="text-xs font-semibold text-gray-900 mb-1.5">Territories</h3>
      <div className="space-y-1">
        {activeReps.map((rep) => {
          const count = territoryCounts[rep.name.toLowerCase()] || 0
          return (
            <div key={rep.id} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: rep.color }}
              />
              <span className="text-xs text-gray-700 flex-1 truncate">{rep.name}</span>
              <span className="text-xs text-gray-500">{count}</span>
            </div>
          )
        })}
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
