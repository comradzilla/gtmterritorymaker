import type { TerritoryAssignments } from '../types'
import type { SalesRep } from '../data/reps'

export interface ExportedAssignments {
  version: string
  exportedAt: string
  assignments: TerritoryAssignments
  metadata: {
    totalStates: number
    totalAssigned: number
    repSummary: { name: string; territoryName?: string; count: number }[]
  }
}

/**
 * Export assignments as a downloadable JSON file
 */
export function exportAssignmentsAsJSON(
  assignments: TerritoryAssignments,
  reps: SalesRep[]
): void {
  const repCounts = new Map<string, number>()

  Object.values(assignments).forEach((a) => {
    repCounts.set(a.repName, (repCounts.get(a.repName) || 0) + 1)
  })

  const exportData: ExportedAssignments = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    assignments,
    metadata: {
      totalStates: Object.keys(assignments).length,
      totalAssigned: Object.keys(assignments).length,
      repSummary: reps
        .map((r) => ({
          name: r.name,
          territoryName: r.territoryName,
          count: repCounts.get(r.name) || 0,
        }))
        .filter((r) => r.count > 0),
    },
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  downloadBlob(blob, `territory-assignments-${formatDate(new Date())}.json`)
}

/**
 * Export assignments as a downloadable CSV file
 */
export function exportAssignmentsAsCSV(
  assignments: TerritoryAssignments,
  codeToName: Record<string, string>,
  reps: SalesRep[]
): void {
  // Build rep name to territory lookup
  const repTerritoryLookup = new Map<string, string>()
  reps.forEach((rep) => {
    if (rep.territoryName) {
      repTerritoryLookup.set(rep.name, rep.territoryName)
    }
  })

  const headers = ['State Code', 'State Name', 'Rep Name', 'Territory Name', 'Assigned At']
  const rows = Object.entries(assignments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, assignment]) => [
      code,
      codeToName[code] || code,
      assignment.repName,
      repTerritoryLookup.get(assignment.repName) || '',
      assignment.assignedAt,
    ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `territory-assignments-${formatDate(new Date())}.csv`)
}

/**
 * Parse and validate an imported JSON file
 */
export async function parseImportedJSON(
  file: File
): Promise<{ assignments: TerritoryAssignments; error?: string }> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    // Handle both full export format and simple assignments object
    let assignments: TerritoryAssignments

    if (data.version && data.assignments) {
      // Full export format
      assignments = data.assignments
    } else if (typeof data === 'object' && data !== null) {
      // Simple assignments object
      assignments = data
    } else {
      return { assignments: {}, error: 'Invalid file format' }
    }

    // Validate structure
    const validated: TerritoryAssignments = {}
    for (const [code, value] of Object.entries(assignments)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'repName' in value &&
        typeof (value as { repName: unknown }).repName === 'string'
      ) {
        const v = value as { repName: string; assignedAt?: string }
        validated[code] = {
          repName: v.repName,
          assignedAt: v.assignedAt || new Date().toISOString(),
        }
      }
    }

    return { assignments: validated }
  } catch (e) {
    return {
      assignments: {},
      error: e instanceof Error ? e.message : 'Failed to parse file',
    }
  }
}

/**
 * Trigger download of a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Escape a value for CSV (wrap in quotes if needed)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
