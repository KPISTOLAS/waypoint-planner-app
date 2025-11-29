import { LatLng } from 'leaflet'

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate area of a polygon in square meters
 */
export const calculatePolygonArea = (coordinates: LatLng[]): number => {
  if (coordinates.length < 3) return 0

  let area = 0
  const R = 6371000 // Earth radius in meters

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length
    const lat1 = (coordinates[i].lat * Math.PI) / 180
    const lat2 = (coordinates[j].lat * Math.PI) / 180
    const lon1 = (coordinates[i].lng * Math.PI) / 180
    const lon2 = (coordinates[j].lng * Math.PI) / 180

    area +=
      (lon2 - lon1) *
      (2 + Math.sin(lat1) + Math.sin(lat2))
  }

  area = (area * R * R) / 2
  return Math.abs(area)
}

/**
 * Format distance for display
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}

/**
 * Format area for display
 */
export const formatArea = (squareMeters: number): string => {
  if (squareMeters < 10000) {
    return `${Math.round(squareMeters)} m²`
  }
  if (squareMeters < 1000000) {
    return `${(squareMeters / 10000).toFixed(2)} ha`
  }
  return `${(squareMeters / 1000000).toFixed(2)} km²`
}

