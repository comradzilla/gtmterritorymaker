import type { StateLookupMaps } from '../hooks/useGeoJson'

export interface ParsedRow {
  stateCode: string
  stateName: string
  repName: string
  isValid: boolean
  error?: string
}

export interface ImportData {
  rows: ParsedRow[]
  repNames: string[]
  errors: string[]
}

type ImportFormat = 'state-per-row' | 'rep-per-row' | 'minimal'

/**
 * Parse CSV or TSV text into rows
 * Handles quoted fields with commas/tabs inside
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect delimiter (tab or comma)
    const hasTab = trimmed.includes('\t')
    const delimiter = hasTab ? '\t' : ','

    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i]

      if (char === '"') {
        if (inQuotes && trimmed[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current.trim())

    if (cells.some((c) => c)) {
      rows.push(cells)
    }
  }

  return rows
}

/**
 * Detect if first row is a header
 */
function isHeaderRow(row: string[]): boolean {
  const headerKeywords = ['state', 'rep', 'name', 'territory', 'code', 'sales', 'region']
  const lowerRow = row.map((c) => c.toLowerCase())
  return lowerRow.some((cell) =>
    headerKeywords.some((keyword) => cell.includes(keyword))
  )
}

/**
 * Detect the format of the import data
 */
function detectFormat(rows: string[][], lookupMaps: StateLookupMaps): ImportFormat {
  if (rows.length === 0) return 'minimal'

  const firstDataRow = isHeaderRow(rows[0]) && rows.length > 1 ? rows[1] : rows[0]

  if (firstDataRow.length < 2) return 'minimal'

  // Check if first column looks like a state code/name
  const firstCell = firstDataRow[0].trim()
  const isFirstCellState =
    lookupMaps.allCodes.has(firstCell.toUpperCase()) ||
    lookupMaps.nameToCode[firstCell.toLowerCase()]

  // Check if second column contains comma-separated values (rep-per-row format)
  const secondCell = firstDataRow[1].trim()
  const hasMultipleStates = secondCell.includes(',')

  if (!isFirstCellState && hasMultipleStates) {
    return 'rep-per-row'
  }

  return isFirstCellState ? 'state-per-row' : 'minimal'
}

/**
 * Resolve a state input to a state code
 */
function resolveStateCode(
  input: string,
  lookupMaps: StateLookupMaps
): { code: string; name: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Check if it's a valid state code
  const upperInput = trimmed.toUpperCase()
  if (lookupMaps.allCodes.has(upperInput)) {
    return {
      code: upperInput,
      name: lookupMaps.codeToName[upperInput] || upperInput,
    }
  }

  // Check if it's a state name
  const codeFromName = lookupMaps.nameToCode[trimmed.toLowerCase()]
  if (codeFromName) {
    return {
      code: codeFromName,
      name: lookupMaps.codeToName[codeFromName] || trimmed,
    }
  }

  return null
}

/**
 * Parse import data from CSV rows
 */
export function parseImportData(
  text: string,
  lookupMaps: StateLookupMaps
): ImportData {
  const csvRows = parseCSV(text)

  if (csvRows.length === 0) {
    return { rows: [], repNames: [], errors: ['No data found'] }
  }

  const hasHeader = isHeaderRow(csvRows[0])
  const dataRows = hasHeader ? csvRows.slice(1) : csvRows
  const format = detectFormat(csvRows, lookupMaps)

  const parsedRows: ParsedRow[] = []
  const repNamesSet = new Set<string>()
  const errors: string[] = []

  if (format === 'rep-per-row') {
    // Format: Rep Name, "CA,TX,NV"
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (row.length < 2) continue

      const repName = row[0].trim()
      if (!repName) continue

      repNamesSet.add(repName)

      // Parse comma-separated states in second column
      const statesStr = row[1].trim()
      const states = statesStr.split(',').map((s) => s.trim()).filter(Boolean)

      for (const stateInput of states) {
        const resolved = resolveStateCode(stateInput, lookupMaps)
        if (resolved) {
          parsedRows.push({
            stateCode: resolved.code,
            stateName: resolved.name,
            repName,
            isValid: true,
          })
        } else {
          parsedRows.push({
            stateCode: stateInput.toUpperCase(),
            stateName: stateInput,
            repName,
            isValid: false,
            error: `Invalid state: ${stateInput}`,
          })
          errors.push(`Row ${i + 1}: Invalid state "${stateInput}"`)
        }
      }
    }
  } else {
    // Format: State, Rep Name (state-per-row or minimal)
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (row.length < 2) continue

      const stateInput = row[0].trim()
      const repName = row[1].trim()

      if (!stateInput || !repName) continue

      repNamesSet.add(repName)

      const resolved = resolveStateCode(stateInput, lookupMaps)
      if (resolved) {
        parsedRows.push({
          stateCode: resolved.code,
          stateName: resolved.name,
          repName,
          isValid: true,
        })
      } else {
        parsedRows.push({
          stateCode: stateInput.toUpperCase(),
          stateName: stateInput,
          repName,
          isValid: false,
          error: `Invalid state: ${stateInput}`,
        })
        errors.push(`Row ${i + 1}: Invalid state "${stateInput}"`)
      }
    }
  }

  // Check for duplicate state assignments
  const seenStates = new Map<string, string>()
  for (const row of parsedRows) {
    if (row.isValid) {
      if (seenStates.has(row.stateCode)) {
        const prevRep = seenStates.get(row.stateCode)
        if (prevRep !== row.repName) {
          errors.push(
            `Duplicate: ${row.stateCode} assigned to both "${prevRep}" and "${row.repName}"`
          )
        }
      } else {
        seenStates.set(row.stateCode, row.repName)
      }
    }
  }

  return {
    rows: parsedRows,
    repNames: Array.from(repNamesSet),
    errors,
  }
}

/**
 * Convert parsed data to assignment format
 */
export function toAssignments(
  rows: ParsedRow[]
): Record<string, { repName: string; assignedAt: string }> {
  const assignments: Record<string, { repName: string; assignedAt: string }> = {}
  const timestamp = new Date().toISOString()

  for (const row of rows) {
    if (row.isValid) {
      assignments[row.stateCode] = {
        repName: row.repName,
        assignedAt: timestamp,
      }
    }
  }

  return assignments
}
