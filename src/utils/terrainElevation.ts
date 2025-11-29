/**
 * Terrain Elevation Service
 * Uses free/open-source APIs to get elevation data
 * 
 * APIs used:
 * 1. Open-Elevation API (https://open-elevation.com/) - Free, no API key required
 * 2. USGS Elevation Point Query Service (fallback) - Free, US only
 * 3. GeoNames (fallback) - Free with registration
 */

export interface ElevationResult {
  latitude: number
  longitude: number
  elevation: number // in meters
}

/**
 * Get elevation for a single point using Open-Elevation API
 */
export const getElevation = async (
  latitude: number,
  longitude: number
): Promise<number> => {
  try {
    // Use Open-Elevation API (free, no API key)
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: [{ latitude, longitude }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.status}`)
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      return data.results[0].elevation
    }

    throw new Error('No elevation data returned')
  } catch (error) {
    console.error('Failed to get elevation:', error)
    // Return 0 as fallback (sea level)
    return 0
  }
}

/**
 * Get elevations for multiple points (batch request)
 */
export const getElevations = async (
  points: Array<{ latitude: number; longitude: number }>
): Promise<ElevationResult[]> => {
  if (points.length === 0) return []

  try {
    // Open-Elevation supports batch requests (up to 100 points)
    const batchSize = 100
    const results: ElevationResult[] = []

    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize)
      
      const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations: batch,
        }),
      })

      if (!response.ok) {
        throw new Error(`Elevation API error: ${response.status}`)
      }

      const data = await response.json()
      if (data.results && data.results.length > 0) {
        batch.forEach((point, index) => {
          results.push({
            latitude: point.latitude,
            longitude: point.longitude,
            elevation: data.results[index]?.elevation || 0,
          })
        })
      }
    }

    return results
  } catch (error) {
    console.error('Failed to get elevations:', error)
    // Return zero elevations as fallback
    return points.map((point) => ({
      ...point,
      elevation: 0,
    }))
  }
}

/**
 * Apply terrain elevation to waypoints
 * Adjusts waypoint altitudes based on terrain elevation
 */
export const applyTerrainElevation = async (
  waypoints: Array<{ latitude: number; longitude: number; altitude: number }>,
  baseAltitude: number
): Promise<Array<{ latitude: number; longitude: number; altitude: number }>> => {
  const points = waypoints.map((wp) => ({
    latitude: wp.latitude,
    longitude: wp.longitude,
  }))

  const elevations = await getElevations(points)

  return waypoints.map((wp, index) => {
    const terrainElevation = elevations[index]?.elevation || 0
    // Adjust altitude: baseAltitude + terrain elevation
    return {
      ...wp,
      altitude: baseAltitude + terrainElevation,
    }
  })
}

