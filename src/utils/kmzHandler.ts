import JSZip from 'jszip'
import { Waypoint, FlightPlan, FlightSettings } from '../types'
import L from 'leaflet'
import { generateWaypointsFromArea } from './waypointGenerator'

export interface KMZData {
  waypoints: Waypoint[]
  name?: string
  description?: string
}

export const exportToKMZ = async (flightPlan: FlightPlan): Promise<Blob> => {
  const zip = new JSZip()
  
  // Create KML content
  const kmlContent = generateKML(flightPlan)
  
  // Add KML to zip
  zip.file('doc.kml', kmlContent)
  
  // Generate and return KMZ blob
  return await zip.generateAsync({ type: 'blob' })
}

const generateKML = (flightPlan: FlightPlan): string => {
  const waypoints = flightPlan.waypoints
  
  // Validate waypoints
  if (!waypoints || waypoints.length === 0) {
    throw new Error('No waypoints to export')
  }
  
  // Escape XML special characters
  const escapeXml = (str: string): string => {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
  
  const placemarks = waypoints.map((wp, index) => {
    // Validate waypoint data
    if (typeof wp.latitude !== 'number' || typeof wp.longitude !== 'number') {
      throw new Error(`Invalid coordinates in waypoint ${index + 1}`)
    }
    
    const actions = wp.actions?.map(a => `<action>${escapeXml(a.type)}</action>`).join('') || ''
    const altitude = typeof wp.altitude === 'number' ? wp.altitude : 0
    const speed = wp.speed ?? flightPlan.settings?.speed ?? 0
    const gimbal = wp.gimbalPitch ?? flightPlan.settings?.gimbalAngle ?? 0
    
    return `
    <Placemark>
      <name>Waypoint ${index + 1}</name>
      <description>
        Altitude: ${altitude}m
        Speed: ${speed}m/s
        Gimbal: ${gimbal}°
        ${actions ? `<br/>Actions: ${actions}` : ''}
      </description>
      <Point>
        <coordinates>${wp.longitude},${wp.latitude},${altitude}</coordinates>
      </Point>
    </Placemark>
    `
  }).join('')
  
  const pathCoordinates = waypoints
    .map(wp => `${wp.longitude},${wp.latitude},${typeof wp.altitude === 'number' ? wp.altitude : 0}`)
    .join(' ')
  
  const planName = escapeXml(flightPlan.name || 'Flight Plan')
  const droneModel = escapeXml(flightPlan.droneModel || 'Unknown')
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${planName}</name>
    <description>Flight plan for ${droneModel}</description>
    ${placemarks}
    <Placemark>
      <name>Flight Path</name>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${pathCoordinates}</coordinates>
      </LineString>
      <Style>
        <LineStyle>
          <color>ff0099ff</color>
          <width>3</width>
        </LineStyle>
      </Style>
    </Placemark>
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

