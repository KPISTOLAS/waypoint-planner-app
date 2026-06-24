import { atom } from 'jotai'
import { DJI_MODELS, FlightPlan, Waypoint, FlightSettings, DJIModel } from '../types'

export const defaultFlightSettings: FlightSettings = {
  altitude: 50,
  speed: 5,
  gimbalAngle: -90,
  pathSpacing: 20,
  imageOverlap: {
    forward: 70,
    side: 70,
  },
  reversePoints: false,
  lineOrientation: 0,
  straightenedPaths: false,
  dynamicAltitude: false,
  autoTakePhoto: false,
}

export const defaultDroneModel: DJIModel = 'Mavic 3 Enterprise'

const isDJIModel = (value: unknown): value is DJIModel => {
  return typeof value === 'string' && (DJI_MODELS as string[]).includes(value)
}

const normalizeDate = (value: unknown): Date => {
  const date = value instanceof Date ? value : new Date(value as string | number | Date)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export const normalizeFlightSettings = (settings?: Partial<FlightSettings>): FlightSettings => ({
  ...defaultFlightSettings,
  ...settings,
  imageOverlap: {
    ...defaultFlightSettings.imageOverlap,
    ...settings?.imageOverlap,
  },
})

export const normalizeFlightPlan = (flightPlan: FlightPlan): FlightPlan => ({
  ...flightPlan,
  droneModel: isDJIModel(flightPlan.droneModel) ? flightPlan.droneModel : defaultDroneModel,
  waypoints: Array.isArray(flightPlan.waypoints) ? flightPlan.waypoints : [],
  settings: normalizeFlightSettings(flightPlan.settings),
  createdAt: normalizeDate(flightPlan.createdAt),
  updatedAt: normalizeDate(flightPlan.updatedAt),
})

export const currentFlightPlanAtom = atom<FlightPlan | null>(null)
export const waypointsAtom = atom<Waypoint[]>([])
export const selectedWaypointAtom = atom<string | null>(null)
export const droneModelAtom = atom<DJIModel>(defaultDroneModel)
export const flightSettingsAtom = atom<FlightSettings>(defaultFlightSettings)
export const mapCenterAtom = atom<[number, number]>([41.5, 20.0]) // Default to Balkans/Greece/Italy region
export const mapZoomAtom = atom<number>(6) // Zoom level to show the region
export const projectLoadedAtom = atom<boolean>(false) // Track if a project has been loaded

