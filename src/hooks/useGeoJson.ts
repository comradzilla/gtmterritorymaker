import { useEffect, useState } from 'react'

import type { StateFeature, StatesGeoJSON } from '../types'

const US_STATES_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'
const CANADA_URL = 'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/canada.geojson'

export interface StateLookupMaps {
  nameToCode: Record<string, string>  // "California" -> "CA"
  codeToName: Record<string, string>  // "CA" -> "California"
  allCodes: Set<string>               // Set of all valid state codes
}

interface UseGeoJsonResult {
  data: StatesGeoJSON | null
  loading: boolean
  error: string | null
  lookupMaps: StateLookupMaps
}

// Normalize GeoJSON properties to consistent format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFeatures(features: any[], isCanada: boolean): StateFeature[] {
  return features.map((feature) => {
    const props = feature.properties || {}
    let name: string
    let code: string

    if (isCanada) {
      // Canada GeoJSON uses 'name' for province name
      name = props.name || props.NAME || 'Unknown'
      // Generate code from name for Canada (first 2 letters uppercase)
      code = props.cartodb_id
        ? `CA-${String(props.cartodb_id).padStart(2, '0')}`
        : name.substring(0, 2).toUpperCase()
    } else {
      // US GeoJSON uses 'name' for state name
      name = props.name || props.NAME || 'Unknown'
      // US states typically don't have a code in this dataset, generate from name
      code = getUSStateCode(name)
    }

    return {
      ...feature,
      properties: { name, code }
    }
  })
}

// Map US state names to their postal codes
function getUSStateCode(stateName: string): string {
  const stateCodeMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
    'Puerto Rico': 'PR'
  }
  return stateCodeMap[stateName] || stateName.substring(0, 2).toUpperCase()
}

const emptyLookupMaps: StateLookupMaps = {
  nameToCode: {},
  codeToName: {},
  allCodes: new Set(),
}

export function useGeoJson(): UseGeoJsonResult {
  const [data, setData] = useState<StatesGeoJSON | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lookupMaps, setLookupMaps] = useState<StateLookupMaps>(emptyLookupMaps)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const [usResponse, canadaResponse] = await Promise.all([
          fetch(US_STATES_URL),
          fetch(CANADA_URL)
        ])

        if (!usResponse.ok) {
          throw new Error(`Failed to fetch US states: ${usResponse.status}`)
        }
        if (!canadaResponse.ok) {
          throw new Error(`Failed to fetch Canada provinces: ${canadaResponse.status}`)
        }

        const usData = await usResponse.json()
        const canadaData = await canadaResponse.json()

        // Normalize and combine features
        const usFeatures = normalizeFeatures(usData.features || [], false)
        const canadaFeatures = normalizeFeatures(canadaData.features || [], true)

        const allFeatures = [...usFeatures, ...canadaFeatures]

        const combined: StatesGeoJSON = {
          type: 'FeatureCollection',
          features: allFeatures
        }

        // Build lookup maps
        const nameToCode: Record<string, string> = {}
        const codeToName: Record<string, string> = {}
        const allCodes = new Set<string>()

        allFeatures.forEach((feature) => {
          const { name, code } = feature.properties
          nameToCode[name.toLowerCase()] = code
          codeToName[code] = name
          allCodes.add(code)
        })

        setData(combined)
        setLookupMaps({ nameToCode, codeToName, allCodes })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load map data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error, lookupMaps }
}
