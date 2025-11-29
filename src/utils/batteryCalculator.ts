import { DJIModel, Waypoint, FlightSettings } from '../types'
import { calculateFlightPath } from './flightPathCalculator'

// Battery specifications for DJI drones (in mAh and flight time in minutes)
export const DRONE_BATTERY_SPECS: Record<DJIModel, {
  capacity: number // mAh
  voltage: number // V
  maxFlightTime: number // minutes
  hoverTime: number // minutes
  maxSpeed: number // m/s
}> = {
  'Mini 5 Pro': { capacity: 3850, voltage: 7.7, maxFlightTime: 47, hoverTime: 40, maxSpeed: 16 },
  'Mavic 4 Pro': { capacity: 5870, voltage: 15.4, maxFlightTime: 45, hoverTime: 38, maxSpeed: 22 },
  'Mini 4 Pro': { capacity: 2451, voltage: 7.38, maxFlightTime: 34, hoverTime: 30, maxSpeed: 16 },
  'Air 3': { capacity: 4241, voltage: 11.55, maxFlightTime: 46, hoverTime: 40, maxSpeed: 21 },
  'Air 3S': { capacity: 4241, voltage: 11.55, maxFlightTime: 46, hoverTime: 40, maxSpeed: 21 },
  'Mavic 3': { capacity: 5000, voltage: 15.4, maxFlightTime: 46, hoverTime: 40, maxSpeed: 21 },
  'Mavic 3 Pro': { capacity: 5000, voltage: 15.4, maxFlightTime: 46, hoverTime: 40, maxSpeed: 21 },
  'Mavic 3 Classic': { capacity: 5000, voltage: 15.4, maxFlightTime: 46, hoverTime: 40, maxSpeed: 21 },
}

export interface BatteryEstimate {
  estimatedFlightTime: number // minutes
  batteryUsage: number // percentage
  remainingBattery: number // percentage
  isSafe: boolean
  warnings: string[]
}

/**
 * Estimate battery usage for a flight plan
 */
export const estimateBatteryUsage = (
  waypoints: Waypoint[],
  settings: FlightSettings,
  droneModel: DJIModel
): BatteryEstimate => {
  const specs = DRONE_BATTERY_SPECS[droneModel]
  const { totalDistance, estimatedTime } = calculateFlightPath(waypoints, settings)
  
  // Convert time to minutes
  const flightTimeMinutes = estimatedTime / 60
  
  // Calculate battery usage based on flight time
  // Use hover time as baseline, adjust for speed
  const speedFactor = Math.min(settings.speed / specs.maxSpeed, 1.5) // Higher speed = more battery
  const baseBatteryPerMinute = 100 / specs.hoverTime // Percentage per minute at hover
  const adjustedBatteryPerMinute = baseBatteryPerMinute * (1 + (speedFactor - 1) * 0.3)
  
  const batteryUsage = flightTimeMinutes * adjustedBatteryPerMinute
  const remainingBattery = Math.max(0, 100 - batteryUsage)
  
  const warnings: string[] = []
  if (batteryUsage > 80) {
    warnings.push('High battery usage - consider splitting mission')
  }
  if (batteryUsage > specs.maxFlightTime / specs.hoverTime * 100) {
    warnings.push('Battery usage exceeds safe limits')
  }
  if (flightTimeMinutes > specs.maxFlightTime * 0.8) {
    warnings.push('Flight time approaches maximum battery capacity')
  }
  
  return {
    estimatedFlightTime: flightTimeMinutes,
    batteryUsage: Math.min(100, batteryUsage),
    remainingBattery,
    isSafe: batteryUsage < 70 && flightTimeMinutes < specs.maxFlightTime * 0.7,
    warnings,
  }
}

/**
 * Calculate maximum safe distance based on battery
 */
export const calculateMaxSafeDistance = (
  settings: FlightSettings,
  droneModel: DJIModel
): number => {
  const specs = DRONE_BATTERY_SPECS[droneModel]
  // Use 70% of max flight time for safety margin
  const safeFlightTime = specs.maxFlightTime * 0.7 * 60 // seconds
  return safeFlightTime * settings.speed // meters
}

