export interface SalesRep {
  id: string
  name: string
  color: string
  territoryName?: string
}

export const SALES_REPS: SalesRep[] = [
  { id: 'rep1', name: 'Alice Johnson', color: '#3B82F6' },  // Blue
  { id: 'rep2', name: 'Bob Smith', color: '#10B981' },      // Green
  { id: 'rep3', name: 'Carol Davis', color: '#F59E0B' },    // Amber
  { id: 'rep4', name: 'David Wilson', color: '#EF4444' },   // Red
  { id: 'rep5', name: 'Eva Martinez', color: '#8B5CF6' },   // Purple
  { id: 'rep6', name: 'Frank Brown', color: '#EC4899' },    // Pink
]

// Build a lookup map for colors by rep name (lowercase)
export function buildRepColorMap(reps: SalesRep[]): Record<string, string> {
  return reps.reduce((acc, rep) => {
    acc[rep.name.toLowerCase()] = rep.color
    return acc
  }, {} as Record<string, string>)
}
