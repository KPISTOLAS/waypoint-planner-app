import { Waypoint, FlightSettings } from '../types'

export interface WaypointTemplate {
  id: string
  name: string
  description: string
  waypoints: Waypoint[]
  settings?: Partial<FlightSettings>
}

// Predefined waypoint templates
export const WAYPOINT_TEMPLATES: WaypointTemplate[] = [
  {
    id: 'grid-survey',
    name: 'Grid Survey',
    description: 'Creates a grid pattern for area mapping',
    waypoints: [],
    settings: {
      pathSpacing: 50,
      imageOverlap: { forward: 70, side: 70 },
      autoTakePhoto: true,
    },
  },
  {
    id: 'linear-path',
    name: 'Linear Path',
    description: 'Simple linear waypoint path',
    waypoints: [],
    settings: {
      straightenedPaths: true,
      autoTakePhoto: false,
    },
  },
  {
    id: 'circular-orbit',
    name: 'Circular Orbit',
    description: 'Circular orbit around a point of interest',
    waypoints: [],
    settings: {
      speed: 3,
      gimbalAngle: -45,
      autoTakePhoto: true,
    },
  },
  {
    id: 'zigzag-pattern',
    name: 'Zigzag Pattern',
    description: 'Zigzag pattern for efficient area coverage',
    waypoints: [],
    settings: {
      pathSpacing: 40,
      imageOverlap: { forward: 75, side: 75 },
      autoTakePhoto: true,
    },
  },
]

/**
 * Generate waypoints from a template
 */
export const generateWaypointsFromTemplate = (
  template: WaypointTemplate,
  centerLat: number,
  centerLng: number,
  areaSize: number = 100 // meters
): Waypoint[] => {
  const waypoints: Waypoint[] = []
  
  switch (template.id) {
    case 'grid-survey': {
      const gridSize = Math.ceil(Math.sqrt(areaSize / 20)) // Approximate grid size
      const spacing = areaSize / gridSize
      
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const lat = centerLat + (i - gridSize / 2) * (spacing / 111000) // Rough conversion
          const lng = centerLng + (j - gridSize / 2) * (spacing / (111000 * Math.cos(centerLat * Math.PI / 180)))
          waypoints.push({
            id: `grid-${i}-${j}`,
            latitude: lat,
            longitude: lng,
            altitude: 50,
            speed: 5,
            gimbalPitch: -90,
            heading: 0,
            actions: template.settings?.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
          })
        }
      }
      break
    }
    
    case 'linear-path': {
      const numPoints = 5
      for (let i = 0; i < numPoints; i++) {
        const lat = centerLat + (i - numPoints / 2) * (areaSize / 111000)
        waypoints.push({
          id: `linear-${i}`,
          latitude: lat,
          longitude: centerLng,
          altitude: 50,
          speed: 5,
          gimbalPitch: -90,
          heading: 0,
          actions: [],
        })
      }
      break
    }
    
    case 'circular-orbit': {
      const radius = areaSize / 2
      const numPoints = 8
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI
        const lat = centerLat + (radius / 111000) * Math.cos(angle)
        const lng = centerLng + (radius / (111000 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle)
        waypoints.push({
          id: `orbit-${i}`,
          latitude: lat,
          longitude: lng,
          altitude: 50,
          speed: 3,
          gimbalPitch: -45,
          heading: (angle * 180 / Math.PI + 90) % 360,
          actions: template.settings?.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
        })
      }
      break
    }
    
    case 'zigzag-pattern': {
      const numRows = 5
      const rowSpacing = areaSize / numRows
      for (let i = 0; i < numRows; i++) {
        const lat = centerLat + (i - numRows / 2) * (rowSpacing / 111000)
        const numCols = i % 2 === 0 ? 4 : 4
        for (let j = 0; j < numCols; j++) {
          const lng = centerLng + (j - numCols / 2) * (areaSize / (numCols * 111000 * Math.cos(centerLat * Math.PI / 180)))
          waypoints.push({
            id: `zigzag-${i}-${j}`,
            latitude: lat,
            longitude: lng,
            altitude: 50,
            speed: 5,
            gimbalPitch: -90,
            heading: i % 2 === 0 ? 0 : 180,
            actions: template.settings?.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
          })
        }
      }
      break
    }
  }
  
  return waypoints.map((wp, index) => ({
    ...wp,
    id: Date.now().toString() + index,
  }))
}

