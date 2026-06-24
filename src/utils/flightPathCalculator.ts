import { Waypoint, FlightSettings } from '../types'

export interface CalculatedPath {
  waypoints: Waypoint[]
  totalDistance: number
  estimatedTime: number
}

/**
 * Calculate flight path with straightened paths option
 */
export const calculateFlightPath = (
  waypoints: Waypoint[],
  settings: FlightSettings
): CalculatedPath => {
  if (waypoints.length < 2) {
    return {
      waypoints,
      totalDistance: 0,
      estimatedTime: 0,
    }
  }

  let processedWaypoints = [...waypoints]

  // Apply straightened paths if enabled
  if (settings.straightenedPaths) {
    processedWaypoints = straightenPaths(processedWaypoints)
  }

  // Apply reverse points if enabled
  if (settings.reversePoints) {
    processedWaypoints = [...processedWaypoints].reverse()
  }

  // Apply line orientation
  if (settings.lineOrientation !== 0) {
    processedWaypoints = rotateWaypoints(processedWaypoints, settings.lineOrientation)
  }

  // Calculate total distance
  const totalDistance = calculateTotalDistance(processedWaypoints)

  // Estimate time based on average speed
  const avgSpeed = settings.speed || 5 // m/s
  const estimatedTime = totalDistance / avgSpeed // seconds

  return {
    waypoints: processedWaypoints,
    totalDistance,
    estimatedTime,
  }
}

/**
 * Straighten flight paths by removing unnecessary waypoints
 */
const straightenPaths = (waypoints: Waypoint[]): Waypoint[] => {
  if (waypoints.length <= 2) return waypoints

  const straightened: Waypoint[] = [waypoints[0]]

  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1]
    const curr = waypoints[i]
    const next = waypoints[i + 1]

    // Calculate angle between segments
    const angle1 = calculateBearing(prev, curr)
    const angle2 = calculateBearing(curr, next)
    const rawAngleDiff = Math.abs(angle1 - angle2)
    const angleDiff = Math.min(rawAngleDiff, 360 - rawAngleDiff)

    // If angle change is significant, keep the waypoint
    if (angleDiff > 10) {
      // 10 degrees threshold
      straightened.push(curr)
    }
  }

  straightened.push(waypoints[waypoints.length - 1])
  return straightened
}

/**
 * Rotate waypoints around center point
 */
const rotateWaypoints = (waypoints: Waypoint[], angleDegrees: number): Waypoint[] => {
  if (waypoints.length === 0) return waypoints

  // Calculate center point
  const centerLat =
    waypoints.reduce((sum, wp) => sum + wp.latitude, 0) / waypoints.length
  const centerLng =
    waypoints.reduce((sum, wp) => sum + wp.longitude, 0) / waypoints.length

  const angleRad = (angleDegrees * Math.PI) / 180

  return waypoints.map((wp) => {
    // Convert to relative coordinates
    const dx = (wp.longitude - centerLng) * Math.cos((centerLat * Math.PI) / 180)
    const dy = wp.latitude - centerLat

    // Rotate
    const rotatedDx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
    const rotatedDy = dx * Math.sin(angleRad) + dy * Math.cos(angleRad)

    // Convert back to absolute coordinates
    return {
      ...wp,
      longitude: centerLng + rotatedDx / Math.cos((centerLat * Math.PI) / 180),
      latitude: centerLat + rotatedDy,
    }
  })
}

/**
 * Calculate bearing between two waypoints
 */
const calculateBearing = (from: Waypoint, to: Waypoint): number => {
  const lat1 = (from.latitude * Math.PI) / 180
  const lat2 = (to.latitude * Math.PI) / 180
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

/**
 * Calculate total distance of flight path
 */
const calculateTotalDistance = (waypoints: Waypoint[]): number => {
  let totalDistance = 0

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const curr = waypoints[i]
    totalDistance += haversineDistance(prev, curr)
  }

  return totalDistance
}

/**
 * Calculate distance between two waypoints using Haversine formula
 */
const haversineDistance = (from: Waypoint, to: Waypoint): number => {
  const R = 6371000 // Earth radius in meters
  const lat1 = (from.latitude * Math.PI) / 180
  const lat2 = (to.latitude * Math.PI) / 180
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Apply dynamic altitude adjustment based on terrain
 */
export const applyDynamicAltitude = (
  waypoints: Waypoint[],
  baseAltitude: number,
  terrainData?: number[]
): Waypoint[] => {
  if (!terrainData || terrainData.length !== waypoints.length) {
    return waypoints.map((wp) => ({
      ...wp,
      altitude: wp.altitude ?? baseAltitude,
    }))
  }

  return waypoints.map((wp, index) => ({
    ...wp,
    altitude: (wp.altitude ?? baseAltitude) + (terrainData[index] ?? 0),
  }))
}

