import React, { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { useAtom, useSetAtom } from 'jotai'
import { waypointsAtom, flightSettingsAtom } from '../store/flightPlanStore'
import { isDrawingAtom } from '../store/drawingStore'
import { drawingModeAtom } from '../store/drawingModeStore'
import { generateWaypointsFromArea, generateWaypointsFromPOI } from '../utils/waypointGenerator'
import L from 'leaflet'
import { loadLeafletDraw } from '../utils/loadLeafletDraw'
import { Check, X } from 'lucide-react'
import './DrawingTools.css'

const DrawingTools: React.FC = () => {
  const map = useMap()
  const [waypoints, setWaypoints] = useAtom(waypointsAtom)
  const [settings] = useAtom(flightSettingsAtom)
  const [, setIsDrawing] = useAtom(isDrawingAtom)
  const [drawingMode] = useAtom(drawingModeAtom)
  const setDrawingMode = useSetAtom(drawingModeAtom)
  const drawnLayerRef = useRef<L.FeatureGroup | null>(null)
  const currentDrawHandlerRef = useRef<L.Draw.Polygon | L.Draw.Rectangle | L.Draw.Circle | null>(null)
  const [drawnShape, setDrawnShape] = React.useState<L.Polygon | L.Rectangle | L.Circle | null>(null)
  const [isDrawingLocal, setIsDrawingLocal] = React.useState(false)

  useEffect(() => {
    let isMounted = true
    
    // Initialize feature group for drawn shapes
    if (!drawnLayerRef.current) {
      drawnLayerRef.current = new L.FeatureGroup()
      map.addLayer(drawnLayerRef.current)
    }

    // Handle draw events - set these up first
    const handleCreated = (e: any) => {
      const layer = e.layer
      if (!layer) {
        console.error('No layer in draw:created event')
        return
      }
      
      // Apply light blue styling to the drawn shape
      if (layer.setStyle) {
        layer.setStyle({
          color: '#4a90e2',
          weight: 3,
          fillColor: '#87ceeb',
          fillOpacity: 0.35,
          stroke: true,
        })
      }
      
      drawnLayerRef.current!.addLayer(layer)
      setIsDrawing(true)
      setIsDrawingLocal(true)
      
      // Check if it's a rectangle, polygon, or circle
      const isPolygon = layer instanceof L.Polygon
      const isRectangle = layer instanceof L.Rectangle
      const isCircle = layer instanceof L.Circle
      const layerName = layer.constructor?.name || ''
      const isPolygonByName = layerName.includes('Polygon')
      const isRectangleByName = layerName.includes('Rectangle')
      const isCircleByName = layerName.includes('Circle')
      
      // Set the shape based on type
      if (isCircle || isCircleByName) {
        setDrawnShape(layer as L.Circle)
      } else if (isPolygon || isRectangle || isPolygonByName || isRectangleByName) {
        setDrawnShape(layer as L.Polygon | L.Rectangle)
      } else {
        // Check if it has required methods for polygon/rectangle
        const hasRequiredMethods = layer.getBounds && (layer.getLatLngs || layer.getLatLngs === undefined)
        if (hasRequiredMethods) {
          setDrawnShape(layer as L.Polygon | L.Rectangle)
        } else {
          console.warn('Layer type check failed:', layerName, layer)
        }
      }
      
      // Don't disable drawing handler yet - keep it enabled in case user wants to draw again
      // Only disable when user confirms or cancels
    }

    const handleDrawStart = () => {
      setIsDrawing(true)
    }

    const handleDrawStop = () => {}

    // Register event handlers
    map.on('draw:created' as any, handleCreated)
    map.on('draw:drawstart' as any, handleDrawStart)
    map.on('draw:drawstop' as any, handleDrawStop)

    // Wait a bit to ensure leaflet-draw is loaded
    const initDrawing = async () => {
      if (!isMounted) return
      
      // Ensure leaflet-draw is loaded
      try {
        await loadLeafletDraw()
      } catch (error) {
        console.error('Failed to load leaflet-draw:', error)
        // Retry after a delay
        setTimeout(() => {
          if (isMounted) {
            initDrawing()
          }
        }, 500)
        return
      }
      
      // Check if leaflet-draw is available (from CDN, it extends window.L)
      const Draw = (window as any).L?.Draw || (L as any).Draw
      if (!Draw) {
        console.warn('Leaflet Draw not available yet, retrying...')
        // Retry after a short delay
        setTimeout(() => {
          if (isMounted) {
            initDrawing()
          }
        }, 200)
        return
      }
      
      if (!isMounted) return

      // Handle drawing mode changes
      
      if (drawingMode === 'none' || drawingMode === 'cursor') {
        // Cancel any active drawing
        if (currentDrawHandlerRef.current) {
          try {
            currentDrawHandlerRef.current.disable()
          } catch (e) {
            // Ignore errors when disabling
          }
          currentDrawHandlerRef.current = null
        }
        setIsDrawing(false)
        // Don't reset isDrawingLocal if there's a shape waiting for confirmation
        // Only reset if there's no drawn shape
        if (!drawnShape) {
          setIsDrawingLocal(false)
        }
      } else if (drawingMode === 'rectangle' || drawingMode === 'polygon' || drawingMode === 'poi') {
        // Enable drawing mode
        if (drawnLayerRef.current) {
          drawnLayerRef.current.clearLayers()
        }
        setDrawnShape(null)
        
        // Disable any existing handler first
        if (currentDrawHandlerRef.current) {
          try {
            currentDrawHandlerRef.current.disable()
          } catch (e) {
            // Ignore errors
          }
          currentDrawHandlerRef.current = null
        }
        
        // Create appropriate draw handler
        // Wait a bit to ensure map is fully ready
        setTimeout(() => {
          if (!isMounted) return
          
          if (drawingMode === 'rectangle' && Draw.Rectangle) {
            try {
              const handler = new Draw.Rectangle(map, {
                shapeOptions: {
                  color: '#4a90e2',
                  weight: 3,
                  fillColor: '#87ceeb',
                  fillOpacity: 0.35,
                  stroke: true,
                },
              })
              currentDrawHandlerRef.current = handler as any
              handler.enable()
            } catch (error) {
              console.error('Error enabling rectangle drawing:', error)
            }
          } else if (drawingMode === 'polygon' && Draw.Polygon) {
            try {
              const handler = new Draw.Polygon(map, {
                shapeOptions: {
                  color: '#4a90e2',
                  weight: 3,
                  fillColor: '#87ceeb',
                  fillOpacity: 0.35,
                  stroke: true,
                },
                allowIntersection: false,
              })
              currentDrawHandlerRef.current = handler as any
              handler.enable()
            } catch (error) {
              console.error('Error enabling polygon drawing:', error)
            }
          } else if (drawingMode === 'poi' && Draw.Circle) {
            try {
              const handler = new Draw.Circle(map, {
                shapeOptions: {
                  color: '#4a90e2',
                  weight: 3,
                  fillColor: '#87ceeb',
                  fillOpacity: 0.35,
                  stroke: true,
                },
              })
              currentDrawHandlerRef.current = handler as any
              handler.enable()
            } catch (error) {
              console.error('Error enabling circle drawing:', error)
            }
          } else {
            console.warn('Draw handler not available:', { 
              mode: drawingMode, 
              hasRectangle: !!Draw.Rectangle, 
              hasPolygon: !!Draw.Polygon,
              hasCircle: !!Draw.Circle
            })
          }
        }, 100) // Small delay to ensure map is ready
      }
    }

    // Initialize drawing after ensuring leaflet-draw is loaded
    initDrawing()

    return () => {
      isMounted = false
      map.off('draw:created' as any, handleCreated)
      map.off('draw:drawstart' as any, handleDrawStart)
      map.off('draw:drawstop' as any, handleDrawStop)
      if (currentDrawHandlerRef.current) {
        try {
          currentDrawHandlerRef.current.disable()
        } catch (e) {
          // Ignore errors
        }
        currentDrawHandlerRef.current = null
      }
    }
  }, [map, drawingMode, setDrawingMode])

  const handleGenerateWaypoints = () => {
    if (!drawnShape) return

    // Check if it's a circle (POI) or polygon/rectangle
    let generatedWaypoints: any[] = []
    if (drawnShape instanceof L.Circle) {
      generatedWaypoints = generateWaypointsFromPOI(drawnShape, settings)
    } else {
      generatedWaypoints = generateWaypointsFromArea(drawnShape as L.Polygon | L.Rectangle, settings)
    }
    
    // Add generated waypoints to existing waypoints
    setWaypoints([...waypoints, ...generatedWaypoints])
    
    // Clear the drawn shape
    if (drawnLayerRef.current) {
      drawnLayerRef.current.clearLayers()
    }
    setDrawnShape(null)
    setIsDrawing(false)
    setIsDrawingLocal(false)
    
    // Disable drawing handler
    if (currentDrawHandlerRef.current) {
      try {
        currentDrawHandlerRef.current.disable()
      } catch (e) {
        // Ignore errors
      }
      currentDrawHandlerRef.current = null
    }
    
    // Reset drawing mode to cursor after generating
    setDrawingMode('cursor')
  }

  const handleCancel = () => {
    if (drawnLayerRef.current) {
      drawnLayerRef.current.clearLayers()
    }
    setDrawnShape(null)
    setIsDrawing(false)
    setIsDrawingLocal(false)
    
    // Disable drawing handler
    if (currentDrawHandlerRef.current) {
      try {
        currentDrawHandlerRef.current.disable()
      } catch (e) {
        // Ignore errors
      }
      currentDrawHandlerRef.current = null
    }
    
    // Reset drawing mode to cursor
    setDrawingMode('cursor')
  }

  if (!isDrawingLocal || !drawnShape) {
    return null
  }

  return (
    <div className="drawing-confirm-panel">
      <div className="drawing-confirm-content">
        <div className="drawing-confirm-header">
          <h3>{drawnShape instanceof L.Circle ? 'POI Circle Selected' : 'Area Selected'}</h3>
          <p>{drawnShape instanceof L.Circle ? 'Generate waypoints around the circle perimeter (facing center)?' : 'Generate waypoints for this area?'}</p>
        </div>
        <div className="drawing-confirm-buttons">
          <button
            className="confirm-btn"
            onClick={handleGenerateWaypoints}
            title="Generate Waypoints"
          >
            <Check size={18} />
            <span>Generate Waypoints</span>
          </button>
          <button
            className="cancel-btn"
            onClick={handleCancel}
            title="Cancel"
          >
            <X size={18} />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DrawingTools
