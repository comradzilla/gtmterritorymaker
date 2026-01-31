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

export const MAX_REPS = 20

// 20 distinguishable colors — first 6 match the original palette
export const EXTENDED_COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#E11D48', // Rose
  '#A855F7', // Violet
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
  '#22C55E', // Emerald
  '#FACC15', // Yellow
  '#78716C', // Stone
  '#64748B', // Slate
  '#F43F5E', // Coral
]

const REP_ID_COUNTER_KEY = 'territory-map-rep-id-counter'

/** Generate a unique rep ID using a localStorage counter (starts at 7 to avoid collisions with rep1–rep6). */
export function generateRepId(): string {
  let counter = 7
  try {
    const stored = localStorage.getItem(REP_ID_COUNTER_KEY)
    if (stored) counter = Math.max(7, parseInt(stored, 10))
  } catch { /* ignore */ }
  const id = `rep${counter}`
  try {
    localStorage.setItem(REP_ID_COUNTER_KEY, String(counter + 1))
  } catch { /* ignore */ }
  return id
}

// Build a lookup map for colors by rep name (lowercase)
export function buildRepColorMap(reps: SalesRep[]): Record<string, string> {
  return reps.reduce((acc, rep) => {
    acc[rep.name.toLowerCase()] = rep.color
    return acc
  }, {} as Record<string, string>)
}
