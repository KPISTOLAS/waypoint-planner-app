/**
 * Advanced Photogrammetry Tools
 * Calculations for GSD, coverage, image count, processing time, and camera recommendations
 */

import { DJIModel, FlightSettings, Waypoint } from '../types'
import { DJI_CAMERA_SENSORS } from '../types'

// Camera focal length in millimeters for each DJI model
export const DJI_FOCAL_LENGTHS: Record<DJIModel, number> = {
  'Mini 5 Pro': 24,      // 24mm equivalent
  'Mavic 4 Pro': 24,     // 24mm equivalent
  'Mini 4 Pro': 24,      // 24mm equivalent
  'Air 3': 24,           // 24mm equivalent
  'Air 3S': 24,          // 24mm equivalent
  'Mavic 3': 24,         // 24mm equivalent
  'Mavic 3 Pro': 24,     // 24mm equivalent
  'Mavic 3 Classic': 24, // 24mm equivalent
}

// Camera resolution for each DJI model (width x height in pixels)
export const DJI_CAMERA_RESOLUTIONS: Record<DJIModel, { width: number; height: number }> = {
  'Mini 5 Pro': { width: 5472, height: 3648 },
  'Mavic 4 Pro': { width: 5280, height: 3956 },
  'Mini 4 Pro': { width: 4000, height: 3000 },
  'Air 3': { width: 4000, height: 3000 },
  'Air 3S': { width: 5472, height: 3648 },
  'Mavic 3': { width: 5280, height: 3956 },
  'Mavic 3 Pro': { width: 5280, height: 3956 },
  'Mavic 3 Classic': { width: 5280, height: 3956 },
}

export interface GSDResult {
  gsd: number // Ground Sample Distance in cm/pixel
  pixelSize: number // Pixel size in cm
}

export interface CoverageResult {
  singleImageArea: number // Area covered by single image in m²
  totalCoverageArea: number // Total area covered by all images in m²
  imageFootprint: {
    width: number // Image footprint width in meters
    height: number // Image footprint height in meters
  }
}

export interface ImageCountResult {
  totalImages: number
  imagesPerWaypoint: number
  estimatedImages: number
}

export interface ProcessingTimeResult {
  estimatedHours: number
  estimatedMinutes: number
  processingSpeed: number // Images per hour
}

export interface CameraRecommendations {
  recommendedISO: number
  recommendedShutterSpeed: string
  recommendedAperture: string
  recommendedWhiteBalance: string
  notes: string[]
}

/**
 * Calculate Ground Sample Distance (GSD)
 * GSD = (Sensor Width / Focal Length) * (Altitude / Image Width)
 */
export function calculateGSD(
  altitude: number, // meters
  droneModel: DJIModel,
  imageWidth?: number // pixels (optional, uses default if not provided)
): GSDResult {
  const sensorWidth = DJI_CAMERA_SENSORS[droneModel] // mm
  const focalLength = DJI_FOCAL_LENGTHS[droneModel] // mm
  const resolution = DJI_CAMERA_RESOLUTIONS[droneModel]
  const imgWidth = imageWidth || resolution.width

  // Convert altitude from meters to millimeters
  const altitudeMm = altitude * 1000

  // Calculate GSD in mm/pixel
  const gsdMmPerPixel = (sensorWidth / focalLength) * (altitudeMm / imgWidth)

  // Convert to cm/pixel
  const gsd = gsdMmPerPixel / 10

  // Pixel size in cm
  const pixelSize = gsd

  return {
    gsd: Math.round(gsd * 100) / 100, // Round to 2 decimal places
    pixelSize: Math.round(pixelSize * 100) / 100,
  }
}

/**
 * Calculate coverage area for single image and total coverage
 */
export function calculateCoverage(
  altitude: number,
  droneModel: DJIModel,
  waypoints: Waypoint[],
  settings: FlightSettings
): CoverageResult {
  const gsdResult = calculateGSD(altitude, droneModel)
  const resolution = DJI_CAMERA_RESOLUTIONS[droneModel]

  // Calculate image footprint in meters
  const imageFootprintWidth = (gsdResult.gsd / 100) * resolution.width // Convert cm to m
  const imageFootprintHeight = (gsdResult.gsd / 100) * resolution.height

  // Single image area in m²
  const singleImageArea = imageFootprintWidth * imageFootprintHeight

  // Calculate total coverage area
  // This is an approximation based on waypoint area and overlap
  let totalCoverageArea = 0

  if (waypoints.length >= 2) {
    // Calculate bounding box of waypoints
    const lats = waypoints.map(wp => wp.latitude)
    const lngs = waypoints.map(wp => wp.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Approximate area using Haversine formula
    const centerLat = (minLat + maxLat) / 2
    const metersPerDegreeLat = 111320
    const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180)

    const width = (maxLng - minLng) * metersPerDegreeLng
    const height = (maxLat - minLat) * metersPerDegreeLat

    // Account for overlap
    const overlapFactor = 1 - (settings.imageOverlap.side / 100)
    const effectiveArea = width * height * overlapFactor

    totalCoverageArea = effectiveArea
  } else {
    totalCoverageArea = singleImageArea
  }

  return {
    singleImageArea: Math.round(singleImageArea * 100) / 100,
    totalCoverageArea: Math.round(totalCoverageArea * 100) / 100,
    imageFootprint: {
      width: Math.round(imageFootprintWidth * 100) / 100,
      height: Math.round(imageFootprintHeight * 100) / 100,
    },
  }
}

/**
 * Estimate image count based on flight plan
 */
export function estimateImageCount(
  waypoints: Waypoint[],
  settings: FlightSettings,
  flightTime?: number // minutes
): ImageCountResult {
  // Images per waypoint (if auto-take-photo is enabled)
  const imagesPerWaypoint = settings.autoTakePhoto ? 1 : 0

  // Total images from waypoints
  const totalImages = waypoints.length * imagesPerWaypoint

  // Estimate based on flight time and path spacing
  // Assuming average speed and photo interval
  let estimatedImages = totalImages

  if (flightTime && settings.speed > 0 && settings.pathSpacing > 0) {
    // Calculate distance
    const distance = flightTime * (settings.speed / 60) * 1000 // meters

    // Images based on path spacing
    const imagesFromSpacing = Math.ceil(distance / settings.pathSpacing)

    // Account for overlap
    const overlapFactor = settings.imageOverlap.forward / 100
    estimatedImages = Math.max(totalImages, Math.ceil(imagesFromSpacing / (1 - overlapFactor)))
  }

  return {
    totalImages,
    imagesPerWaypoint,
    estimatedImages: Math.max(totalImages, estimatedImages),
  }
}

/**
 * Estimate processing time for 3D reconstruction
 * Based on image count and typical processing speeds
 */
export function estimateProcessingTime(
  imageCount: number,
  processingSpeed: number = 50 // images per hour (default for standard processing)
): ProcessingTimeResult {
  const totalHours = imageCount / processingSpeed
  const hours = Math.floor(totalHours)
  const minutes = Math.round((totalHours - hours) * 60)

  return {
    estimatedHours: hours,
    estimatedMinutes: minutes,
    processingSpeed,
  }
}

/**
 * Get camera settings recommendations based on conditions
 */
export function getCameraRecommendations(
  altitude: number,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon',
  weather: 'sunny' | 'cloudy' | 'overcast' = 'sunny'
): CameraRecommendations {
  const recommendations: CameraRecommendations = {
    recommendedISO: 100,
    recommendedShutterSpeed: '1/500',
    recommendedAperture: 'f/2.8',
    recommendedWhiteBalance: 'Auto',
    notes: [],
  }

  // ISO recommendations based on lighting
  if (timeOfDay === 'night' || weather === 'overcast') {
    recommendations.recommendedISO = 400
    recommendations.notes.push('Higher ISO needed for low light conditions')
  } else if (weather === 'cloudy') {
    recommendations.recommendedISO = 200
  } else {
    recommendations.recommendedISO = 100
    recommendations.notes.push('Low ISO for best image quality in good light')
  }

  // Shutter speed based on altitude and speed
  if (altitude > 100) {
    recommendations.recommendedShutterSpeed = '1/1000'
    recommendations.notes.push('Faster shutter for high altitude to reduce motion blur')
  } else if (altitude > 50) {
    recommendations.recommendedShutterSpeed = '1/500'
  } else {
    recommendations.recommendedShutterSpeed = '1/250'
    recommendations.notes.push('Lower shutter speed acceptable at lower altitudes')
  }

  // Aperture (most DJI drones have fixed aperture, but recommend wide open)
  recommendations.recommendedAperture = 'f/2.8'
  recommendations.notes.push('Wide aperture for maximum light gathering')

  // White balance
  if (timeOfDay === 'morning' || timeOfDay === 'evening') {
    recommendations.recommendedWhiteBalance = 'Cloudy'
    recommendations.notes.push('Warmer white balance for golden hour')
  } else {
    recommendations.recommendedWhiteBalance = 'Auto'
  }

  // Additional recommendations
  recommendations.notes.push('Shoot in RAW format for best post-processing results')
  recommendations.notes.push('Enable auto-exposure bracketing for challenging lighting')

  return recommendations
}

/**
 * Calculate all photogrammetry metrics at once
 */
export function calculateAllPhotogrammetryMetrics(
  altitude: number,
  droneModel: DJIModel,
  waypoints: Waypoint[],
  settings: FlightSettings,
  flightTime?: number
) {
  const gsd = calculateGSD(altitude, droneModel)
  const coverage = calculateCoverage(altitude, droneModel, waypoints, settings)
  const imageCount = estimateImageCount(waypoints, settings, flightTime)
  const processingTime = estimateProcessingTime(imageCount.estimatedImages)
  const cameraRecommendations = getCameraRecommendations(altitude)

  return {
    gsd,
    coverage,
    imageCount,
    processingTime,
    cameraRecommendations,
  }
}

