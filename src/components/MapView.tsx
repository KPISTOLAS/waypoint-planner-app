import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet'
import { useAtom } from 'jotai'
import { waypointsAtom, selectedWaypointAtom, flightSettingsAtom, mapCenterAtom, mapZoomAtom } from '../store/flightPlanStore'
import { isDrawingAtom } from '../store/drawingStore'
import { drawingModeAtom } from '../store/drawingModeStore'
import { Waypoint } from '../types'
import DrawingTools from './DrawingTools'
import DrawingToolbar from './DrawingToolbar'
import L from 'leaflet'
import { Layers, Map as MapIcon } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

// Free and open-source map style options
export type MapStyle = 'dark' | 'satellite' | 'terrain' | 'light' | 'osm'

export const MAP_STYLES: Record<MapStyle, { name: string; url: string; attribution: string }> = {
  dark: {
    name: 'Dark (Starlink-like)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  },
  light: {
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
}

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom waypoint icon - triangle arrow pointing in heading direction
const createWaypointIcon = (index: number, isSelected: boolean, heading: number = 0) => {
  // Heading is in degrees (0-360, where 0 is North, 90 is East)
  // CSS rotation is clockwise, so we use heading directly
  const rotation = heading || 0
  
  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `
      <div class="waypoint-marker ${isSelected ? 'selected' : ''}" style="transform: rotate(${rotation}deg);">
        <div class="waypoint-arrow"></div>
        <div class="waypoint-marker-number">${index + 1}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

// Component to handle map clicks (only when not drawing)
const MapClickHandler: React.FC = () => {
  const [, setWaypoints] = useAtom(waypointsAtom)
  const [settings] = useAtom(flightSettingsAtom)
  const [, setSelectedWaypoint] = useAtom(selectedWaypointAtom)
  const [isDrawing] = useAtom(isDrawingAtom)
  const [drawingMode] = useAtom(drawingModeAtom)

  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      // Only add waypoints in 'none' mode (Select mode)
      // Don't add waypoints when drawing tools are active, in cursor mode, or other drawing modes
      if (isDrawing || drawingMode !== 'none') return
      
      const { lat, lng } = e.latlng
      const newWaypoint: Waypoint = {
        id: Date.now().toString(),
        latitude: lat,
        longitude: lng,
        altitude: settings.altitude,
        speed: settings.speed,
        gimbalPitch: settings.gimbalAngle,
        heading: 0,
        actions: settings.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
        dynamicAltitude: settings.dynamicAltitude,
      }
      setWaypoints((prevWaypoints) => [...prevWaypoints, newWaypoint])
      setSelectedWaypoint(newWaypoint.id)
    },
  })

  return null
}

// Component to handle map view synchronization
const MapViewSync: React.FC = () => {
  const [center] = useAtom(mapCenterAtom)
  const [zoom] = useAtom(mapZoomAtom)
  const [, setCenter] = useAtom(mapCenterAtom)
  const [, setZoom] = useAtom(mapZoomAtom)
  const map = useMap()

  const centersAreEqual = (a: [number, number], b: [number, number]) =>
    Math.abs(a[0] - b[0]) < 0.0000001 && Math.abs(a[1] - b[1]) < 0.0000001

  useMapEvents({
    moveend: () => {
      const nextCenter = map.getCenter()
      setCenter((currentCenter) => {
        const nextCenterTuple: [number, number] = [nextCenter.lat, nextCenter.lng]
        return centersAreEqual(currentCenter, nextCenterTuple) ? currentCenter : nextCenterTuple
      })
      setZoom((currentZoom) => {
        const nextZoom = map.getZoom()
        return currentZoom === nextZoom ? currentZoom : nextZoom
      })
    },
  })

  useEffect(() => {
    if (center[0] !== 0 || center[1] !== 0) {
      const currentCenter = map.getCenter()
      const currentCenterTuple: [number, number] = [currentCenter.lat, currentCenter.lng]
      if (!centersAreEqual(currentCenterTuple, center) || map.getZoom() !== zoom) {
        map.setView(center, zoom)
      }
    }
  }, [center, zoom, map])

  return null
}

// Component for individual waypoint markers
const WaypointMarker: React.FC<{ waypoint: Waypoint; index: number }> = ({ waypoint, index }) => {
  const [selectedWaypoint, setSelectedWaypoint] = useAtom(selectedWaypointAtom)
  const [, setWaypoints] = useAtom(waypointsAtom)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<[number, number] | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const map = useMap()
  const dragStartPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const isRightClickRef = useRef<boolean>(false)
  const mouseMoveHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null)
  const mouseUpHandlerRef = useRef<((e: MouseEvent) => void) | null>(null)

  // Clean up event listeners
  useEffect(() => {
    return () => {
      if (mouseMoveHandlerRef.current && map) {
        map.off('mousemove', mouseMoveHandlerRef.current)
      }
      if (mouseUpHandlerRef.current) {
        window.removeEventListener('mouseup', mouseUpHandlerRef.current)
      }
    }
  }, [map])

  const handleContextMenu = (e: L.LeafletMouseEvent) => {
    // Prevent default context menu
    e.originalEvent.preventDefault()
    e.originalEvent.stopPropagation()
  }

  const handleMouseDown = (e: L.LeafletMouseEvent) => {
    const event = e.originalEvent
    
    // Check if right mouse button is pressed
    if (event.button === 2 || event.which === 3) {
      // Right mouse button - start custom drag
      isRightClickRef.current = true
      dragStartPositionRef.current = {
        lat: waypoint.latitude,
        lng: waypoint.longitude
      }
      setIsDragging(true)
      
      // Prevent context menu and default behavior
      event.preventDefault()
      event.stopPropagation()
      
      // Create mouse move handler
      mouseMoveHandlerRef.current = (moveEvent: L.LeafletMouseEvent) => {
        if (isRightClickRef.current && markerRef.current) {
          const newLatLng = moveEvent.latlng
          // Update local drag position for visual feedback
          setDragPosition([newLatLng.lat, newLatLng.lng])
          // Update marker position visually
          markerRef.current.setLatLng(newLatLng)
        }
      }
      
      // Create mouse up handler
      const mouseUpHandler = (_upEvent: MouseEvent) => {
        // Check if it's still a right button release
        if (isRightClickRef.current && markerRef.current && dragStartPositionRef.current) {
          const finalPosition = markerRef.current.getLatLng()
          
          // Final update to waypoint position in state
          setWaypoints(prevWaypoints => 
            prevWaypoints.map(wp => 
              wp.id === waypoint.id 
                ? { ...wp, latitude: finalPosition.lat, longitude: finalPosition.lng }
                : wp
            )
          )
          
          // Clean up
          if (mouseMoveHandlerRef.current && map) {
            map.off('mousemove', mouseMoveHandlerRef.current)
          }
          window.removeEventListener('mouseup', mouseUpHandler)
          
          setIsDragging(false)
          setDragPosition(null)
          dragStartPositionRef.current = null
          isRightClickRef.current = false
          mouseMoveHandlerRef.current = null
          mouseUpHandlerRef.current = null
        }
      }
      
      mouseUpHandlerRef.current = mouseUpHandler
      
      // Attach event listeners
      if (mouseMoveHandlerRef.current) {
        map.on('mousemove', mouseMoveHandlerRef.current)
      }
      window.addEventListener('mouseup', mouseUpHandler, { once: true })
    } else {
      // Left mouse button - disable dragging
      isRightClickRef.current = false
    }
  }

  const handleClick = (e: L.LeafletMouseEvent) => {
    const event = e.originalEvent
    
    // Don't select waypoint if we just finished dragging with right click
    if (isDragging && isRightClickRef.current) {
      return
    }
    
    // Only select on left click
    if (event.button === 0 || event.which === 1 || !event.button) {
      setSelectedWaypoint(waypoint.id)
    }
  }

  // Use drag position if dragging, otherwise use waypoint position
  const markerPosition = dragPosition || [waypoint.latitude, waypoint.longitude]

  // Recreate icon when heading or selection changes
  const waypointIcon = React.useMemo(
    () => createWaypointIcon(index, selectedWaypoint === waypoint.id, waypoint.heading || 0),
    [index, selectedWaypoint, waypoint.id, waypoint.heading]
  )

  // Update marker icon when it changes
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(waypointIcon)
    }
  }, [waypointIcon])

  return (
    <Marker
      ref={markerRef}
      position={markerPosition}
      icon={waypointIcon}
      draggable={false}
      eventHandlers={{
        click: handleClick,
        mousedown: handleMouseDown,
        contextmenu: handleContextMenu,
      }}
    />
  )
}

// Wrapper component for DrawingToolbar (needs to be outside MapContainer)
const DrawingToolbarWrapper: React.FC = () => {
  const [drawingMode, setDrawingMode] = useAtom(drawingModeAtom)
  
  return <DrawingToolbar mode={drawingMode} onModeChange={setDrawingMode} />
}

const MapView: React.FC = () => {
  const [waypoints, setWaypoints] = useAtom(waypointsAtom)
  const [selectedWaypoint, setSelectedWaypoint] = useAtom(selectedWaypointAtom)
  const [mapCenter, setMapCenter] = useAtom(mapCenterAtom)
  const [mapZoom, setMapZoom] = useAtom(mapZoomAtom)
  const [settings] = useAtom(flightSettingsAtom)
  const [mapError, setMapError] = React.useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('osm')
  const [showStyleSelector, setShowStyleSelector] = useState(false)
  const styleSelectorRef = useRef<HTMLDivElement>(null)

  // Close style selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleSelectorRef.current && !styleSelectorRef.current.contains(event.target as Node)) {
        setShowStyleSelector(false)
      }
    }

    if (showStyleSelector) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showStyleSelector])

  // Initialize map to a default location if not set
  useEffect(() => {
    if (mapCenter[0] === 0 && mapCenter[1] === 0) {
      // Default to Balkans/Greece/Italy region
      setMapCenter([41.5, 20.0])
      setMapZoom(6)
    }
  }, [mapCenter, setMapCenter, setMapZoom])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // N - Add new waypoint at map center
      if (e.key === 'n' || e.key === 'N') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const newWaypoint: Waypoint = {
            id: Date.now().toString(),
            latitude: mapCenter[0],
            longitude: mapCenter[1],
            altitude: settings.altitude,
            speed: settings.speed,
            gimbalPitch: settings.gimbalAngle,
            heading: 0,
            actions: settings.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
            dynamicAltitude: settings.dynamicAltitude,
          }
          setWaypoints((prevWaypoints) => [...prevWaypoints, newWaypoint])
          setSelectedWaypoint(newWaypoint.id)
        }
      }

      // D or Delete - Delete selected waypoint
      if ((e.key === 'Delete' || e.key === 'Backspace' || e.key === 'd' || e.key === 'D') && selectedWaypoint) {
        if (e.key === 'd' || e.key === 'D') {
          if (e.ctrlKey || e.metaKey) return // Allow Ctrl+D for browser
          e.preventDefault()
        }
        setWaypoints((prevWaypoints) => prevWaypoints.filter((wp) => wp.id !== selectedWaypoint))
        setSelectedWaypoint(null)
      }

      // Escape - Deselect waypoint
      if (e.key === 'Escape' && selectedWaypoint) {
        setSelectedWaypoint(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedWaypoint, setWaypoints, setSelectedWaypoint, mapCenter, settings])

  // Create polyline path from waypoints
  const pathPositions = waypoints.map((wp) => [wp.latitude, wp.longitude] as [number, number])

  // Ensure map center is valid before rendering
  if (mapCenter[0] === 0 && mapCenter[1] === 0) {
    return (
      <div className="map-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading map...</div>
      </div>
    )
  }

  // Show error if map failed to load
  if (mapError) {
    return (
      <div className="map-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ color: '#c33', marginBottom: '10px' }}>Map Error: {mapError}</div>
        <button onClick={() => setMapError(null)} style={{ padding: '8px 16px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="map-view">
      <DrawingToolbarWrapper />
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
      >
          <TileLayer
            key={mapStyle}
            attribution={MAP_STYLES[mapStyle].attribution}
            url={MAP_STYLES[mapStyle].url}
          />
          <MapClickHandler />
          <MapViewSync />
          <DrawingTools />
          
          {waypoints.map((waypoint, index) => (
            <WaypointMarker key={waypoint.id} waypoint={waypoint} index={index} />
          ))}
          
          {waypoints.length > 1 && (
            <Polyline
              positions={pathPositions}
              pathOptions={{
                color: '#4a90e2',
                weight: 3,
                opacity: 0.7,
              }}
            />
          )}
      </MapContainer>
      
      <div className="map-controls">
        <div className="map-info">
          {waypoints.length > 0 && (
            <div className="info-item">
              <strong>{waypoints.length}</strong> waypoint{waypoints.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Map Style Selector */}
      <div className="map-style-selector" ref={styleSelectorRef}>
        <button
          className="map-style-btn"
          onClick={() => setShowStyleSelector(!showStyleSelector)}
          title="Change Map Style"
        >
          <Layers size={18} />
          <span>{MAP_STYLES[mapStyle].name}</span>
        </button>
        {showStyleSelector && (
          <div className="map-style-menu">
            {Object.entries(MAP_STYLES).map(([key, style]) => (
              <button
                key={key}
                className={`map-style-option ${mapStyle === key ? 'active' : ''}`}
                onClick={() => {
                  setMapStyle(key as MapStyle)
                  setShowStyleSelector(false)
                }}
              >
                <MapIcon size={16} />
                <span>{style.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MapView

