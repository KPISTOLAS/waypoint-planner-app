export interface Waypoint {
  id: string
  latitude: number
  longitude: number
  altitude: number
  speed?: number
  gimbalPitch?: number
  heading?: number
  actions?: WaypointAction[]
  dynamicAltitude?: boolean
}

export interface WaypointAction {
  type: 'takePhoto' | 'startRecord' | 'stopRecord' | 'rotateGimbal' | 'hover'
  params?: Record<string, any>
}

export interface FlightPlan {
  id: string
  name: string
  droneModel: DJIModel
  waypoints: Waypoint[]
  settings: FlightSettings
  createdAt: Date
  updatedAt: Date
}

export interface FlightSettings {
  altitude: number
  speed: number
  gimbalAngle: number
  pathSpacing: number
  imageOverlap: {
    forward: number
    side: number
  }
  reversePoints: boolean
  lineOrientation: number
  straightenedPaths: boolean
  dynamicAltitude: boolean
  autoTakePhoto: boolean
}

export type DJIModel =
  | 'Mini 5 Pro'
  | 'Mavic 4 Pro'
  | 'Mini 4 Pro'
  | 'Air 3'
  | 'Air 3S'
  | 'Mavic 3'
  | 'Mavic 3 Pro'
  | 'Mavic 3 Classic'

export const DJI_MODELS: DJIModel[] = [
  'Mini 5 Pro',
  'Mavic 4 Pro',
  'Mini 4 Pro',
  'Air 3',
  'Air 3S',
  'Mavic 3',
  'Mavic 3 Pro',
  'Mavic 3 Classic',
]

// Camera sensor width in millimeters for each DJI model
export const DJI_CAMERA_SENSORS: Record<DJIModel, number> = {
  'Mini 5 Pro': 13.2,      // 1-inch CMOS
  'Mavic 4 Pro': 17.3,     // 4/3" CMOS
  'Mini 4 Pro': 9.6,       // 1/1.3" CMOS
  'Air 3': 9.6,            // 1/1.3" CMOS
  'Air 3S': 13.2,          // 1-inch CMOS
  'Mavic 3': 17.3,         // 4/3" CMOS
  'Mavic 3 Pro': 17.3,     // 4/3" CMOS
  'Mavic 3 Classic': 17.3, // 4/3" CMOS
}

