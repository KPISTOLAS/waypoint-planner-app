import { Waypoint, FlightSettings } from '../types'
import L from 'leaflet'

/**
 * Generate waypoints along parallel flight lines (lawnmower pattern) within a polygon or rectangle
 * Creates waypoints along parallel lines with proper spacing, not a full grid
 */
export const generateWaypointsFromArea = (
  layer: L.Polygon | L.Rectangle,
  settings: FlightSettings
): Waypoint[] => {
  const bounds = layer.getBounds()
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const centerLat = (sw.lat + ne.lat) / 2
  
  // Calculate spacing based on path spacing setting
  // Account for latitude (degrees vary by latitude)
  const metersPerDegreeLat = 111320 // meters per degree latitude (constant)
  const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180) // varies by latitude
  
  // Path spacing in degrees (distance between parallel flight lines)
  const spacingLat = settings.pathSpacing / metersPerDegreeLat
  
  // Calculate waypoint spacing along each line
  // Use path spacing as the waypoint spacing (waypoints should be spaced similar to flight lines)
  // This ensures reasonable waypoint density without creating too many waypoints
  // Minimum waypoint spacing: 3m to prevent excessive waypoints
  const waypointSpacingMeters = Math.max(settings.pathSpacing, 3)
  const waypointSpacingLng = waypointSpacingMeters / metersPerDegreeLng
  
  // Calculate number of flight lines (rows)
  const latRange = ne.lat - sw.lat
  const numLines = Math.max(1, Math.floor(latRange / spacingLat))
  
  // Adjust spacing to evenly distribute lines
  const adjustedSpacingLat = numLines > 0 ? latRange / numLines : latRange
  
  const waypoints: Waypoint[] = []
  
  // Generate waypoints along parallel flight lines
  for (let lineIndex = 0; lineIndex <= numLines; lineIndex++) {
    const lat = sw.lat + (lineIndex * adjustedSpacingLat)
    
    // Find intersection points of this latitude line with the polygon/rectangle
    let minLng = sw.lng
    let maxLng = ne.lng
    
    if (layer instanceof L.Rectangle) {
      // For rectangles, use the bounding box edges
      minLng = sw.lng
      maxLng = ne.lng
    } else {
      // For polygons, find intersection points with the polygon boundary
      const polygon = layer as L.Polygon
      const latlngs = polygon.getLatLngs()[0] as L.LatLng[]
      
      // Find all intersections of the horizontal line with polygon edges
      const intersections: number[] = []
      
      for (let i = 0; i < latlngs.length; i++) {
        const p1 = latlngs[i]
        const p2 = latlngs[(i + 1) % latlngs.length]
        
        // Check if the line crosses this edge
        if ((p1.lat <= lat && p2.lat > lat) || (p1.lat > lat && p2.lat <= lat)) {
          // Calculate intersection longitude
          const t = (lat - p1.lat) / (p2.lat - p1.lat)
          const lng = p1.lng + t * (p2.lng - p1.lng)
          intersections.push(lng)
        }
      }
      
      if (intersections.length >= 2) {
        intersections.sort((a, b) => a - b)
        minLng = intersections[0]
        maxLng = intersections[intersections.length - 1]
      } else {
        // Skip this line if no valid intersections
        continue
      }
    }
    
    // Generate waypoints along this line
    const lngRange = maxLng - minLng
    const numWaypointsOnLine = Math.max(2, Math.ceil(lngRange / waypointSpacingLng))
    const adjustedSpacingLng = numWaypointsOnLine > 1 ? lngRange / (numWaypointsOnLine - 1) : lngRange
    
    const lineWaypoints: Waypoint[] = []
    
    for (let wpIndex = 0; wpIndex < numWaypointsOnLine; wpIndex++) {
      const lng = minLng + (wpIndex * adjustedSpacingLng)
      const point = L.latLng(lat, lng)
      
      // For polygons, verify point is inside
      if (layer instanceof L.Rectangle || isPointInPolygon(point, layer as L.Polygon)) {
        lineWaypoints.push({
          id: `generated-${lineIndex}-${wpIndex}-${Date.now()}`,
          latitude: lat,
          longitude: lng,
          altitude: settings.altitude,
          speed: settings.speed,
          gimbalPitch: settings.gimbalAngle,
          heading: 0,
          actions: settings.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
          dynamicAltitude: settings.dynamicAltitude,
        })
      }
    }
    
    // Add in zigzag pattern: even lines left-to-right, odd lines right-to-left
    if (lineIndex % 2 === 0) {
      waypoints.push(...lineWaypoints)
    } else {
      waypoints.push(...lineWaypoints.reverse())
    }
  }
  
  return waypoints
}

/**
 * Check if a point is inside a polygon
 */
const isPointInPolygon = (point: L.LatLng, polygon: L.Polygon): boolean => {
  const latlngs = polygon.getLatLngs()[0] as L.LatLng[]
  let inside = false
  
  for (let i = 0, j = latlngs.length - 1; i < latlngs.length; j = i++) {
    const xi = latlngs[i].lng
    const yi = latlngs[i].lat
    const xj = latlngs[j].lng
    const yj = latlngs[j].lat
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * Generate waypoints around a circle perimeter, all facing the center
 */
export const generateWaypointsFromPOI = (
  circle: L.Circle,
  settings: FlightSettings
): Waypoint[] => {
  const center = circle.getLatLng()
  const radius = circle.getRadius() // radius in meters
  
  // Calculate number of waypoints based on path spacing
  const circumference = 2 * Math.PI * radius
  const numWaypoints = Math.max(8, Math.ceil(circumference / settings.pathSpacing))
  
  const waypoints: Waypoint[] = []
  const centerLat = center.lat
  const centerLng = center.lng
  
  // Convert radius from meters to degrees (approximate)
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180)
  const radiusLat = radius / metersPerDegreeLat
  const radiusLng = radius / metersPerDegreeLng
  
  // Generate waypoints around the circle perimeter
  for (let i = 0; i < numWaypoints; i++) {
    const angle = (2 * Math.PI * i) / numWaypoints
    
    // Calculate waypoint position on circle perimeter
    const lat = centerLat + radiusLat * Math.cos(angle)
    const lng = centerLng + radiusLng * Math.sin(angle)
    
    // Calculate heading to face the center (in degrees, 0-360)
    // Heading is the bearing from waypoint to center
    // Use atan2 with (lng difference, lat difference) for proper bearing calculation
    const dLng = centerLng - lng
    const dLat = centerLat - lat
    const headingRad = Math.atan2(dLng, dLat)
    const headingDeg = (headingRad * 180) / Math.PI
    // Normalize to 0-360 (heading is clockwise from North)
    const heading = ((headingDeg + 360) % 360)
    
    waypoints.push({
      id: `poi-${i}-${Date.now()}`,
      latitude: lat,
      longitude: lng,
      altitude: settings.altitude,
      speed: settings.speed,
      gimbalPitch: settings.gimbalAngle,
      heading: heading,
      actions: settings.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
      dynamicAltitude: settings.dynamicAltitude,
    })
  }
  
  return waypoints
}


