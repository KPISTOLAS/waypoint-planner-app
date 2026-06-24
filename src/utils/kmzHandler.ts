import JSZip from 'jszip'
import { DJIModel, Waypoint, FlightPlan, FlightSettings, WaypointAction } from '../types'
import L from 'leaflet'
import { generateWaypointsFromArea } from './waypointGenerator'

export interface KMZData {
  waypoints: Waypoint[]
  name?: string
  description?: string
}

interface DJIWPMLProfile {
  droneEnumValue: number
  droneSubEnumValue: number
  payloadEnumValue: number
  payloadLensIndex: string
}

const DJI_WPML_NAMESPACE = 'http://www.dji.com/wpmz/1.0.2'

const DJI_WPML_PROFILES: Partial<Record<DJIModel, DJIWPMLProfile>> = {
  'Mavic 3 Enterprise': {
    droneEnumValue: 77,
    droneSubEnumValue: 0,
    payloadEnumValue: 66,
    payloadLensIndex: 'wide',
  },
  'Mavic 3 Thermal': {
    droneEnumValue: 77,
    droneSubEnumValue: 1,
    payloadEnumValue: 67,
    payloadLensIndex: 'wide,ir',
  },
  'Mavic 3 Multispectral': {
    droneEnumValue: 77,
    droneSubEnumValue: 2,
    payloadEnumValue: 68,
    payloadLensIndex: 'wide',
  },
  'Matrice 30': {
    droneEnumValue: 67,
    droneSubEnumValue: 0,
    payloadEnumValue: 52,
    payloadLensIndex: 'wide',
  },
  'Matrice 30T': {
    droneEnumValue: 67,
    droneSubEnumValue: 1,
    payloadEnumValue: 53,
    payloadLensIndex: 'wide,ir',
  },
  'Matrice 3D': {
    droneEnumValue: 91,
    droneSubEnumValue: 0,
    payloadEnumValue: 80,
    payloadLensIndex: 'wide',
  },
  'Matrice 3TD': {
    droneEnumValue: 91,
    droneSubEnumValue: 1,
    payloadEnumValue: 81,
    payloadLensIndex: 'wide,ir',
  },
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const escapeXml = (str: string): string => {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const formatNumber = (value: number, digits = 6): string => {
  return Number.isFinite(value) ? Number(value.toFixed(digits)).toString() : '0'
}

const getWPMLProfile = (droneModel: DJIModel): DJIWPMLProfile => {
  const profile = DJI_WPML_PROFILES[droneModel]
  if (!profile) {
    throw new Error(
      `DJI WPML export supports Mavic 3 Enterprise/Thermal/Multispectral, Matrice 30/30T, and Matrice 3D/3TD. "${droneModel}" does not have a published DJI WPML SDK identifier.`
    )
  }
  return profile
}

export const exportToKMZ = async (flightPlan: FlightPlan): Promise<Blob> => {
  const zip = new JSZip()

  validateFlightPlanForWPML(flightPlan)
  const profile = getWPMLProfile(flightPlan.droneModel)

  zip.file('template.kml', generateTemplateKML(flightPlan, profile))
  zip.file('waylines.wpml', generateWaylinesWPML(flightPlan, profile))
  
  // Generate and return KMZ blob
  return await zip.generateAsync({ type: 'blob' })
}

const validateFlightPlanForWPML = (flightPlan: FlightPlan): void => {
  const waypoints = flightPlan.waypoints
  
  // Validate waypoints
  if (!waypoints || waypoints.length === 0) {
    throw new Error('No waypoints to export')
  }

  waypoints.forEach((wp, index) => {
    if (
      typeof wp.latitude !== 'number' ||
      typeof wp.longitude !== 'number' ||
      !Number.isFinite(wp.latitude) ||
      !Number.isFinite(wp.longitude)
    ) {
      throw new Error(`Invalid coordinates in waypoint ${index + 1}`)
    }
  })
}

const generateMissionConfig = (flightPlan: FlightPlan, profile: DJIWPMLProfile): string => {
  const speed = clamp(flightPlan.settings.speed || 5, 1, 15)
  const takeOffSecurityHeight = clamp(Math.max(20, flightPlan.settings.altitude || 20), 1.2, 1500)

  return `  <wpml:missionConfig>
    <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
    <wpml:finishAction>goHome</wpml:finishAction>
    <wpml:exitOnRCLost>goContinue</wpml:exitOnRCLost>
    <wpml:executeRCLostAction>hover</wpml:executeRCLostAction>
    <wpml:takeOffSecurityHeight>${formatNumber(takeOffSecurityHeight, 2)}</wpml:takeOffSecurityHeight>
    <wpml:globalTransitionalSpeed>${formatNumber(speed, 2)}</wpml:globalTransitionalSpeed>
    <wpml:droneInfo>
      <wpml:droneEnumValue>${profile.droneEnumValue}</wpml:droneEnumValue>
      <wpml:droneSubEnumValue>${profile.droneSubEnumValue}</wpml:droneSubEnumValue>
    </wpml:droneInfo>
    <wpml:payloadInfo>
      <wpml:payloadEnumValue>${profile.payloadEnumValue}</wpml:payloadEnumValue>
      <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
    </wpml:payloadInfo>
  </wpml:missionConfig>`
}

const generateCoordinateSysParam = (flightPlan: FlightPlan): string => {
  return `    <wpml:waylineCoordinateSysParam>
      <wpml:coordinateMode>WGS84</wpml:coordinateMode>
      <wpml:heightMode>EGM96</wpml:heightMode>
      <wpml:globalShootHeight>${formatNumber(flightPlan.settings.altitude, 2)}</wpml:globalShootHeight>
      <wpml:positioningType>GPS</wpml:positioningType>
      <wpml:surfaceFollowModeEnable>${flightPlan.settings.dynamicAltitude ? 1 : 0}</wpml:surfaceFollowModeEnable>
      <wpml:surfaceRelativeHeight>${formatNumber(flightPlan.settings.altitude, 2)}</wpml:surfaceRelativeHeight>
    </wpml:waylineCoordinateSysParam>`
}

const generateWaypointHeadingParam = (heading?: number): string => {
  if (typeof heading === 'number' && Number.isFinite(heading)) {
    const normalizedHeading = ((heading + 180) % 360) - 180
    return `        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>smoothTransition</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${formatNumber(normalizedHeading, 2)}</wpml:waypointHeadingAngle>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
        </wpml:waypointHeadingParam>`
  }

  return `        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
        </wpml:waypointHeadingParam>`
}

const generateWaypointTurnParam = (): string => {
  return `        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>`
}

const generateActionParam = (action: WaypointAction, waypointIndex: number, actionIndex: number, profile: DJIWPMLProfile): string => {
  const payloadPosition = '<wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>'
  const payloadLens = `<wpml:payloadLensIndex>${escapeXml(profile.payloadLensIndex)}</wpml:payloadLensIndex>
            <wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>`

  switch (action.type) {
    case 'takePhoto':
      return `          <wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:fileSuffix>wp${waypointIndex + 1}_photo${actionIndex + 1}</wpml:fileSuffix>
            ${payloadPosition}
            ${payloadLens}
          </wpml:actionActuatorFuncParam>`
    case 'startRecord':
      return `          <wpml:actionActuatorFunc>startRecord</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:fileSuffix>wp${waypointIndex + 1}_video${actionIndex + 1}</wpml:fileSuffix>
            ${payloadPosition}
            ${payloadLens}
          </wpml:actionActuatorFuncParam>`
    case 'stopRecord':
      return `          <wpml:actionActuatorFunc>stopRecord</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            ${payloadPosition}
            ${payloadLens}
          </wpml:actionActuatorFuncParam>`
    case 'rotateGimbal': {
      const pitch = typeof action.params?.angle === 'number' ? action.params.angle : 0
      return `          <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:gimbalHeadingYawBase>north</wpml:gimbalHeadingYawBase>
            <wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode>
            <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
            <wpml:gimbalPitchRotateAngle>${formatNumber(pitch, 2)}</wpml:gimbalPitchRotateAngle>
            <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
            <wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle>
            <wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
            <wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle>
            <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
            <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
            ${payloadPosition}
          </wpml:actionActuatorFuncParam>`
    }
    case 'hover': {
      const hoverTime = typeof action.params?.duration === 'number' ? Math.max(1, action.params.duration) : 5
      return `          <wpml:actionActuatorFunc>hover</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:hoverTime>${formatNumber(hoverTime, 2)}</wpml:hoverTime>
          </wpml:actionActuatorFuncParam>`
    }
    default:
      return ''
  }
}

const generateActionGroup = (
  waypoint: Waypoint,
  waypointIndex: number,
  profile: DJIWPMLProfile
): string => {
  const actions = waypoint.actions || []
  if (actions.length === 0) return ''

  const wpmlActions = actions
    .map((action, actionIndex) => {
      const param = generateActionParam(action, waypointIndex, actionIndex, profile)
      if (!param) return ''
      return `        <wpml:action>
          <wpml:actionId>${actionIndex}</wpml:actionId>
${param}
        </wpml:action>`
    })
    .filter(Boolean)

  if (wpmlActions.length === 0) return ''

  return `
        <wpml:actionGroup>
          <wpml:actionGroupId>${waypointIndex}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${waypointIndex}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${waypointIndex}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
${wpmlActions.join('\n')}
        </wpml:actionGroup>`
}

const generateTemplatePlacemark = (wp: Waypoint, index: number, flightPlan: FlightPlan, profile: DJIWPMLProfile): string => {
  const altitude = typeof wp.altitude === 'number' ? wp.altitude : flightPlan.settings.altitude
  const gimbal = wp.gimbalPitch ?? flightPlan.settings.gimbalAngle

  return `    <Placemark>
      <Point>
        <coordinates>${formatNumber(wp.longitude, 8)},${formatNumber(wp.latitude, 8)}</coordinates>
      </Point>
      <wpml:index>${index}</wpml:index>
      <wpml:ellipsoidHeight>${formatNumber(altitude, 2)}</wpml:ellipsoidHeight>
      <wpml:height>${formatNumber(altitude, 2)}</wpml:height>
      <wpml:useGlobalHeight>0</wpml:useGlobalHeight>
      <wpml:useGlobalSpeed>${wp.speed === undefined ? 1 : 0}</wpml:useGlobalSpeed>
      <wpml:useGlobalHeadingParam>${wp.heading === undefined ? 1 : 0}</wpml:useGlobalHeadingParam>
      <wpml:useGlobalTurnParam>1</wpml:useGlobalTurnParam>
      <wpml:gimbalPitchAngle>${formatNumber(gimbal, 2)}</wpml:gimbalPitchAngle>${generateActionGroup(wp, index, profile)}
    </Placemark>`
}

const generateWaylinePlacemark = (wp: Waypoint, index: number, flightPlan: FlightPlan, profile: DJIWPMLProfile): string => {
  const altitude = typeof wp.altitude === 'number' ? wp.altitude : flightPlan.settings.altitude
  const speed = clamp(wp.speed ?? flightPlan.settings.speed, 1, 15)
  const gimbal = wp.gimbalPitch ?? flightPlan.settings.gimbalAngle

  return `      <Placemark>
        <Point>
          <coordinates>${formatNumber(wp.longitude, 8)},${formatNumber(wp.latitude, 8)}</coordinates>
        </Point>
        <wpml:index>${index}</wpml:index>
        <wpml:executeHeight>${formatNumber(altitude, 2)}</wpml:executeHeight>
        <wpml:waypointSpeed>${formatNumber(speed, 2)}</wpml:waypointSpeed>
${generateWaypointHeadingParam(wp.heading)}
${generateWaypointTurnParam()}
        <wpml:gimbalPitchAngle>${formatNumber(gimbal, 2)}</wpml:gimbalPitchAngle>${generateActionGroup(wp, index, profile)}
      </Placemark>`
}

const generateTemplateKML = (flightPlan: FlightPlan, profile: DJIWPMLProfile): string => {
  const timestamp = flightPlan.updatedAt instanceof Date ? flightPlan.updatedAt.getTime() : Date.now()
  const speed = clamp(flightPlan.settings.speed || 5, 1, 15)
  const placemarks = flightPlan.waypoints
    .map((wp, index) => generateTemplatePlacemark(wp, index, flightPlan, profile))
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${DJI_WPML_NAMESPACE}">
<Document>
  <name>${escapeXml(flightPlan.name || 'Flight Plan')}</name>
  <wpml:author>Waypoint Planner</wpml:author>
  <wpml:createTime>${timestamp}</wpml:createTime>
  <wpml:updateTime>${timestamp}</wpml:updateTime>
${generateMissionConfig(flightPlan, profile)}
  <Folder>
    <wpml:templateType>waypoint</wpml:templateType>
    <wpml:templateId>0</wpml:templateId>
${generateCoordinateSysParam(flightPlan)}
    <wpml:autoFlightSpeed>${formatNumber(speed, 2)}</wpml:autoFlightSpeed>
    <wpml:gimbalPitchMode>usePointSetting</wpml:gimbalPitchMode>
    <wpml:globalWaypointHeadingParam>
      <wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode>
    </wpml:globalWaypointHeadingParam>
    <wpml:globalWaypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:globalWaypointTurnMode>
    <wpml:globalUseStraightLine>${flightPlan.settings.straightenedPaths ? 1 : 0}</wpml:globalUseStraightLine>
${placemarks}
  </Folder>
</Document>
</kml>`
}

const generateWaylinesWPML = (flightPlan: FlightPlan, profile: DJIWPMLProfile): string => {
  const timestamp = flightPlan.updatedAt instanceof Date ? flightPlan.updatedAt.getTime() : Date.now()
  const speed = clamp(flightPlan.settings.speed || 5, 1, 15)
  const placemarks = flightPlan.waypoints
    .map((wp, index) => generateWaylinePlacemark(wp, index, flightPlan, profile))
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${DJI_WPML_NAMESPACE}">
<Document>
  <name>${escapeXml(flightPlan.name || 'Flight Plan')}</name>
  <wpml:author>Waypoint Planner</wpml:author>
  <wpml:createTime>${timestamp}</wpml:createTime>
  <wpml:updateTime>${timestamp}</wpml:updateTime>
${generateMissionConfig(flightPlan, profile)}
  <Folder>
    <wpml:templateId>0</wpml:templateId>
    <wpml:executeHeightMode>WGS84</wpml:executeHeightMode>
    <wpml:waylineId>0</wpml:waylineId>
    <wpml:distance>0</wpml:distance>
    <wpml:duration>0</wpml:duration>
    <wpml:autoFlightSpeed>${formatNumber(speed, 2)}</wpml:autoFlightSpeed>
${placemarks}
  </Folder>
</Document>
</kml>`
}

export const importFromKMZ = async (file: File): Promise<KMZData> => {
  const zip = new JSZip()
  const zipData = await zip.loadAsync(file)
  
  // Find KML file in the zip
  const kmlFile = Object.keys(zipData.files).find(name => name.endsWith('.kml'))
  
  if (!kmlFile) {
    throw new Error('No KML file found in KMZ')
  }
  
  const kmlContent = await zipData.files[kmlFile].async('string')
  return Promise.resolve(parseKML(kmlContent))
}

const parseKML = (kmlContent: string): KMZData => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml')
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror')
    if (parseError) {
      throw new Error('Failed to parse KML: ' + parseError.textContent)
    }
    
    // Get document or folder
    const document = xmlDoc.querySelector('Document') || xmlDoc.querySelector('Folder')
    if (!document) {
      throw new Error('No Document or Folder found in KML')
    }
    
    const getDirectChildText = (parent: Element, tagName: string): string | undefined => {
      return Array.from(parent.children).find((child) => child.tagName === tagName)?.textContent || undefined
    }

    const name = getDirectChildText(document, 'name') || 'Imported Flight Plan'
    
    const description = getDirectChildText(document, 'description') || ''
    
    // Get all placemarks with Point elements
    const placemarks = Array.from(document.querySelectorAll('Placemark'))
    
    const waypoints: Waypoint[] = placemarks
      .filter((pm) => pm.querySelector('Point'))
      .map((pm, index) => {
        const point = pm.querySelector('Point')
        const coordsEl = point?.querySelector('coordinates')
        
        if (!coordsEl) {
          throw new Error(`No coordinates found in waypoint ${index + 1}`)
        }
        
        const coordinateText = coordsEl.textContent?.trim().split(/\s+/)[0] || ''
        const coords = coordinateText.split(',')
        if (coords.length < 2) {
          throw new Error(`Invalid coordinates in waypoint ${index + 1}`)
        }

        const longitude = parseFloat(coords[0])
        const latitude = parseFloat(coords[1])
        const altitude = coords[2] === undefined ? 50 : parseFloat(coords[2])
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !Number.isFinite(altitude)) {
          throw new Error(`Invalid coordinates in waypoint ${index + 1}`)
        }
        
        return {
          id: `imported-${index}-${Date.now()}`,
          longitude,
          latitude,
          altitude,
          speed: undefined,
          gimbalPitch: undefined,
          heading: 0,
          actions: [],
        }
      })
    
    return {
      waypoints,
      name,
      description,
    }
  } catch (error) {
    throw new Error(`Failed to parse KML: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Parse KML file and extract polygon coordinates
 * Returns polygon coordinates as array of [lat, lng] pairs
 */
export const parseKMLPolygon = (kmlContent: string): { coordinates: [number, number][], name?: string } => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml')
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror')
    if (parseError) {
      throw new Error('Failed to parse KML: ' + parseError.textContent)
    }
    
    // Get document or folder
    const document = xmlDoc.querySelector('Document') || xmlDoc.querySelector('Folder')
    if (!document) {
      throw new Error('No Document or Folder found in KML')
    }
    
    const nameEl = document.querySelector('name')
    const name = nameEl?.textContent || 'Imported Polygon'
    
    // Find Polygon or LinearRing elements
    const polygon = xmlDoc.querySelector('Polygon')
    const linearRing = polygon?.querySelector('LinearRing') || polygon?.querySelector('outerBoundaryIs LinearRing')
    const coordinatesEl = linearRing?.querySelector('coordinates')
    
    if (!coordinatesEl) {
      // Try to find in Placemark
      const placemark = xmlDoc.querySelector('Placemark')
      const placemarkPolygon = placemark?.querySelector('Polygon')
      const placemarkLinearRing = placemarkPolygon?.querySelector('LinearRing') || placemarkPolygon?.querySelector('outerBoundaryIs LinearRing')
      const placemarkCoords = placemarkLinearRing?.querySelector('coordinates')
      
      if (placemarkCoords && placemark) {
        const coordsText = placemarkCoords.textContent?.trim() || ''
        const coordinates = parseCoordinates(coordsText)
        return { coordinates, name: placemark.querySelector('name')?.textContent || name }
      }
      
      throw new Error('No Polygon or LinearRing coordinates found in KML')
    }
    
    const coordsText = coordinatesEl.textContent?.trim() || ''
    const coordinates = parseCoordinates(coordsText)
    
    return { coordinates, name }
  } catch (error) {
    throw new Error(`Failed to parse KML polygon: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Parse coordinate string from KML (format: "lon,lat,alt lon,lat,alt ..." or "lon,lat lon,lat ...")
 */
const parseCoordinates = (coordsText: string): [number, number][] => {
  const coordinates: [number, number][] = []
  const lines = coordsText.split(/\s+/).filter(line => line.trim())
  
  for (const line of lines) {
    const parts = line.split(',').filter(p => p.trim())
    if (parts.length >= 2) {
      const lon = parseFloat(parts[0].trim())
      const lat = parseFloat(parts[1].trim())
      if (!isNaN(lat) && !isNaN(lon)) {
        coordinates.push([lat, lon])
      }
    }
  }
  
  if (coordinates.length < 3) {
    throw new Error('Polygon must have at least 3 coordinates')
  }
  
  return coordinates
}

/**
 * Parse WGS84 coordinate file
 * Supports formats:
 * - lat,lon (comma-separated)
 * - lon,lat (comma-separated)
 * - lat lon (space-separated)
 * - lon lat (space-separated)
 */
export const parseWGS84 = (content: string): { coordinates: [number, number][], name?: string } => {
  const coordinates: [number, number][] = []
  const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'))
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    // Try comma-separated first
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map(p => p.trim())
      if (parts.length >= 2) {
        const val1 = parseFloat(parts[0])
        const val2 = parseFloat(parts[1])
        if (!isNaN(val1) && !isNaN(val2)) {
          // Determine if lat,lon or lon,lat based on value ranges
          // Latitude: -90 to 90, Longitude: -180 to 180
          if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
            // Likely lat,lon
            coordinates.push([val1, val2])
          } else if (Math.abs(val1) <= 180 && Math.abs(val2) <= 90) {
            // Likely lon,lat
            coordinates.push([val2, val1])
          } else {
            // Default to lat,lon
            coordinates.push([val1, val2])
          }
        }
      }
    } else {
      // Try space-separated
      const parts = trimmed.split(/\s+/).filter(p => p.trim())
      if (parts.length >= 2) {
        const val1 = parseFloat(parts[0])
        const val2 = parseFloat(parts[1])
        if (!isNaN(val1) && !isNaN(val2)) {
          // Determine if lat,lon or lon,lat based on value ranges
          if (Math.abs(val1) <= 90 && Math.abs(val2) <= 180) {
            // Likely lat,lon
            coordinates.push([val1, val2])
          } else if (Math.abs(val1) <= 180 && Math.abs(val2) <= 90) {
            // Likely lon,lat
            coordinates.push([val2, val1])
          } else {
            // Default to lat,lon
            coordinates.push([val1, val2])
          }
        }
      }
    }
  }
  
  if (coordinates.length < 3) {
    throw new Error('WGS84 file must contain at least 3 coordinate pairs')
  }
  
  return { coordinates, name: 'Imported from WGS84' }
}

/**
 * Generate waypoints from polygon coordinates
 */
export const generateWaypointsFromPolygonCoords = (
  coordinates: [number, number][],
  settings: FlightSettings
): Waypoint[] => {
  if (coordinates.length < 3) {
    throw new Error('Polygon must have at least 3 coordinates')
  }
  
  // Create a Leaflet polygon from coordinates
  const latLngs = coordinates.map(coord => L.latLng(coord[0], coord[1]))
  const polygon = L.polygon(latLngs)
  
  // Use existing waypoint generator
  return generateWaypointsFromArea(polygon, settings)
}

