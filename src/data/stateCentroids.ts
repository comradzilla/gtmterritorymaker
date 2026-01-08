export interface StateCentroid {
  code: string
  lat: number
  lng: number
  isSmall: boolean
}

export interface SmallStateLabelPosition {
  labelLat: number
  labelLng: number
}

// States that are too small to display labels inside
export const SMALL_STATES = new Set([
  'RI', 'DE', 'DC', 'CT', 'NJ', 'NH', 'VT', 'MA', 'MD'
])

// US State centroids (approximate visual centers)
export const US_STATE_CENTROIDS: Record<string, StateCentroid> = {
  'AL': { code: 'AL', lat: 32.7794, lng: -86.8287, isSmall: false },
  'AK': { code: 'AK', lat: 64.0685, lng: -152.2782, isSmall: false },
  'AZ': { code: 'AZ', lat: 34.2744, lng: -111.6602, isSmall: false },
  'AR': { code: 'AR', lat: 34.8938, lng: -92.4426, isSmall: false },
  'CA': { code: 'CA', lat: 37.1841, lng: -119.4696, isSmall: false },
  'CO': { code: 'CO', lat: 38.9972, lng: -105.5478, isSmall: false },
  'CT': { code: 'CT', lat: 41.6219, lng: -72.7273, isSmall: true },
  'DE': { code: 'DE', lat: 38.9896, lng: -75.5050, isSmall: true },
  'DC': { code: 'DC', lat: 38.9101, lng: -77.0147, isSmall: true },
  'FL': { code: 'FL', lat: 28.6305, lng: -82.4497, isSmall: false },
  'GA': { code: 'GA', lat: 32.6415, lng: -83.4426, isSmall: false },
  'HI': { code: 'HI', lat: 20.2927, lng: -156.3737, isSmall: false },
  'ID': { code: 'ID', lat: 44.3509, lng: -114.6130, isSmall: false },
  'IL': { code: 'IL', lat: 40.0417, lng: -89.1965, isSmall: false },
  'IN': { code: 'IN', lat: 39.8942, lng: -86.2816, isSmall: false },
  'IA': { code: 'IA', lat: 42.0751, lng: -93.4960, isSmall: false },
  'KS': { code: 'KS', lat: 38.4937, lng: -98.3804, isSmall: false },
  'KY': { code: 'KY', lat: 37.5347, lng: -85.3021, isSmall: false },
  'LA': { code: 'LA', lat: 31.0689, lng: -91.9968, isSmall: false },
  'ME': { code: 'ME', lat: 45.3695, lng: -69.2428, isSmall: false },
  'MD': { code: 'MD', lat: 39.0550, lng: -76.7909, isSmall: true },
  'MA': { code: 'MA', lat: 42.2596, lng: -71.8083, isSmall: true },
  'MI': { code: 'MI', lat: 44.3467, lng: -85.4102, isSmall: false },
  'MN': { code: 'MN', lat: 46.2807, lng: -94.3053, isSmall: false },
  'MS': { code: 'MS', lat: 32.7364, lng: -89.6678, isSmall: false },
  'MO': { code: 'MO', lat: 38.3566, lng: -92.4580, isSmall: false },
  'MT': { code: 'MT', lat: 47.0527, lng: -109.6333, isSmall: false },
  'NE': { code: 'NE', lat: 41.5378, lng: -99.7951, isSmall: false },
  'NV': { code: 'NV', lat: 39.3289, lng: -116.6312, isSmall: false },
  'NH': { code: 'NH', lat: 43.6805, lng: -71.5811, isSmall: true },
  'NJ': { code: 'NJ', lat: 40.1907, lng: -74.6728, isSmall: true },
  'NM': { code: 'NM', lat: 34.4071, lng: -106.1126, isSmall: false },
  'NY': { code: 'NY', lat: 42.9538, lng: -75.5268, isSmall: false },
  'NC': { code: 'NC', lat: 35.5557, lng: -79.3877, isSmall: false },
  'ND': { code: 'ND', lat: 47.4501, lng: -100.4659, isSmall: false },
  'OH': { code: 'OH', lat: 40.2862, lng: -82.7937, isSmall: false },
  'OK': { code: 'OK', lat: 35.5889, lng: -97.4943, isSmall: false },
  'OR': { code: 'OR', lat: 43.9336, lng: -120.5583, isSmall: false },
  'PA': { code: 'PA', lat: 40.8781, lng: -77.7996, isSmall: false },
  'RI': { code: 'RI', lat: 41.6762, lng: -71.5562, isSmall: true },
  'SC': { code: 'SC', lat: 33.9169, lng: -80.8964, isSmall: false },
  'SD': { code: 'SD', lat: 44.4443, lng: -100.2263, isSmall: false },
  'TN': { code: 'TN', lat: 35.8580, lng: -86.3505, isSmall: false },
  'TX': { code: 'TX', lat: 31.4757, lng: -99.3312, isSmall: false },
  'UT': { code: 'UT', lat: 39.3055, lng: -111.6703, isSmall: false },
  'VT': { code: 'VT', lat: 44.0687, lng: -72.6658, isSmall: true },
  'VA': { code: 'VA', lat: 37.5215, lng: -78.8537, isSmall: false },
  'WA': { code: 'WA', lat: 47.3826, lng: -120.4472, isSmall: false },
  'WV': { code: 'WV', lat: 38.6409, lng: -80.6227, isSmall: false },
  'WI': { code: 'WI', lat: 44.6243, lng: -89.9941, isSmall: false },
  'WY': { code: 'WY', lat: 42.9957, lng: -107.5512, isSmall: false },
  'PR': { code: 'PR', lat: 18.2208, lng: -66.5901, isSmall: false },
}

// Canadian Province centroids (using CA-XX format from useGeoJson)
// Note: The exact codes depend on the GeoJSON source, these match typical patterns
export const CANADA_PROVINCE_CENTROIDS: Record<string, StateCentroid> = {
  'CA-01': { code: 'CA-01', lat: 53.9333, lng: -116.5765, isSmall: false }, // Alberta
  'CA-02': { code: 'CA-02', lat: 53.7267, lng: -127.6476, isSmall: false }, // British Columbia
  'CA-03': { code: 'CA-03', lat: 53.7609, lng: -98.8139, isSmall: false }, // Manitoba
  'CA-04': { code: 'CA-04', lat: 46.4988, lng: -66.1591, isSmall: false }, // New Brunswick
  'CA-05': { code: 'CA-05', lat: 53.1355, lng: -57.6604, isSmall: false }, // Newfoundland and Labrador
  'CA-06': { code: 'CA-06', lat: 64.8255, lng: -124.8457, isSmall: false }, // Northwest Territories
  'CA-07': { code: 'CA-07', lat: 44.6820, lng: -63.7443, isSmall: false }, // Nova Scotia
  'CA-08': { code: 'CA-08', lat: 70.2998, lng: -83.1076, isSmall: false }, // Nunavut
  'CA-09': { code: 'CA-09', lat: 50.0000, lng: -85.0000, isSmall: false }, // Ontario
  'CA-10': { code: 'CA-10', lat: 46.2382, lng: -63.1311, isSmall: false }, // Prince Edward Island
  'CA-11': { code: 'CA-11', lat: 52.9399, lng: -73.5491, isSmall: false }, // Quebec
  'CA-12': { code: 'CA-12', lat: 52.9399, lng: -106.4509, isSmall: false }, // Saskatchewan
  'CA-13': { code: 'CA-13', lat: 64.2823, lng: -135.0000, isSmall: false }, // Yukon
}

// Combined centroids for easy lookup
export const ALL_CENTROIDS: Record<string, StateCentroid> = {
  ...US_STATE_CENTROIDS,
  ...CANADA_PROVINCE_CENTROIDS,
}

// External label positions for small states (positioned over the Atlantic)
export const SMALL_STATE_LABEL_OFFSETS: Record<string, SmallStateLabelPosition> = {
  'RI': { labelLat: 41.0, labelLng: -69.0 },
  'CT': { labelLat: 40.5, labelLng: -70.0 },
  'NJ': { labelLat: 39.5, labelLng: -72.5 },
  'DE': { labelLat: 38.5, labelLng: -73.5 },
  'MD': { labelLat: 37.8, labelLng: -74.5 },
  'DC': { labelLat: 38.0, labelLng: -75.5 },
  'MA': { labelLat: 42.5, labelLng: -68.5 },
  'NH': { labelLat: 44.0, labelLng: -69.0 },
  'VT': { labelLat: 45.0, labelLng: -70.5 },
}

/**
 * Get centroid for a state/province code
 */
export function getCentroid(code: string): StateCentroid | null {
  return ALL_CENTROIDS[code] || null
}

/**
 * Get label position for a state (accounts for small state offsets)
 */
export function getLabelPosition(code: string): { lat: number; lng: number } | null {
  const centroid = ALL_CENTROIDS[code]
  if (!centroid) return null

  if (centroid.isSmall && SMALL_STATE_LABEL_OFFSETS[code]) {
    const offset = SMALL_STATE_LABEL_OFFSETS[code]
    return { lat: offset.labelLat, lng: offset.labelLng }
  }

  return { lat: centroid.lat, lng: centroid.lng }
}

/**
 * Check if a state needs a leader line
 */
export function needsLeaderLine(code: string): boolean {
  return SMALL_STATES.has(code)
}

/**
 * Get simple lat/lng lookup for all states
 */
export function getCentroidsLookup(): Record<string, { lat: number; lng: number }> {
  const lookup: Record<string, { lat: number; lng: number }> = {}
  for (const [code, centroid] of Object.entries(ALL_CENTROIDS)) {
    lookup[code] = { lat: centroid.lat, lng: centroid.lng }
  }
  return lookup
}
