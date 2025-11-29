import React, { useState, useRef, useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { useAtom } from 'jotai'
import { waypointsAtom } from '../store/flightPlanStore'
import { calculateDistance, calculatePolygonArea, formatDistance, formatArea } from '../utils/measurementTools'
import { Ruler, X, MapPin } from 'lucide-react'
import './MeasurementTools.css'

interface MeasurementPoint {
  lat: number
  lng: number
}

const MeasurementTools: React.FC = () => {
  const map = useMap()
  const [waypoints] = useAtom(waypointsAtom)
  const [isActive, setIsActive] = useState(false)
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([])
  const [distance, setDistance] = useState<number | null>(null)
  const [area, setArea] = useState<number | null>(null)
  const [mode, setMode] = useState<'distance' | 'area' | null>(null)

  useEffect(() => {
    if (!isActive || !map) return

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (mode === 'distance') {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng }
        const newPoints = [...measurementPoints, newPoint]
        setMeasurementPoints(newPoints)

        if (newPoints.length >= 2) {
          let totalDistance = 0
          for (let i = 0; i < newPoints.length - 1; i++) {
            totalDistance += calculateDistance(
              newPoints[i].lat,
              newPoints[i].lng,
              newPoints[i + 1].lat,
              newPoints[i + 1].lng
            )
          }
          setDistance(totalDistance)
        }
      } else if (mode === 'area') {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng }
        const newPoints = [...measurementPoints, newPoint]
        setMeasurementPoints(newPoints)

        if (newPoints.length >= 3) {
          // Convert to LatLng format for area calculation
          const latlngs = newPoints.map(p => ({ lat: p.lat, lng: p.lng }))
          const calculatedArea = calculatePolygonArea(latlngs as any)
          setArea(calculatedArea)
        }
      }
    }

    map.on('click', handleMapClick)
    return () => {
      map.off('click', handleMapClick)
    }
  }, [map, isActive, mode, measurementPoints])

  const startDistance = () => {
    setMode('distance')
    setIsActive(true)
    setMeasurementPoints([])
    setDistance(null)
    setArea(null)
  }

  const startArea = () => {
    setMode('area')
    setIsActive(true)
    setMeasurementPoints([])
    setDistance(null)
    setArea(null)
  }

  const clearMeasurement = () => {
    setMeasurementPoints([])
    setDistance(null)
    setArea(null)
    setMode(null)
    setIsActive(false)
  }

  const calculateWaypointDistance = () => {
    if (waypoints.length < 2) return null
    
    let totalDistance = 0
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += calculateDistance(
        waypoints[i].latitude,
        waypoints[i].longitude,
        waypoints[i + 1].latitude,
        waypoints[i + 1].longitude
      )
    }
    return totalDistance
  }

  const waypointDistance = calculateWaypointDistance()

  if (!isActive && !waypointDistance) {
    return (
      <div className="measurement-tools">
        <button
          className="measurement-btn"
          onClick={startDistance}
          title="Measure Distance"
        >
          <Ruler size={18} />
          <span>Distance</span>
        </button>
        <button
          className="measurement-btn"
          onClick={startArea}
          title="Measure Area"
        >
          <MapPin size={18} />
          <span>Area</span>
        </button>
      </div>
    )
  }

  return (
    <div className="measurement-tools active">
      {isActive && (
        <>
          <div className="measurement-info">
            {mode === 'distance' && (
              <>
                <p>Click on map to measure distance</p>
                {distance !== null && (
                  <p className="measurement-result">Total Distance: {formatDistance(distance)}</p>
                )}
                {measurementPoints.length > 0 && (
                  <p className="measurement-points">Points: {measurementPoints.length}</p>
                )}
              </>
            )}
            {mode === 'area' && (
              <>
                <p>Click on map to create polygon for area measurement</p>
                {area !== null && (
                  <p className="measurement-result">Area: {formatArea(area)}</p>
                )}
                {measurementPoints.length > 0 && (
                  <p className="measurement-points">Points: {measurementPoints.length}</p>
                )}
              </>
            )}
          </div>
          <button
            className="measurement-btn clear"
            onClick={clearMeasurement}
            title="Clear Measurement"
          >
            <X size={18} />
            <span>Clear</span>
          </button>
        </>
      )}
      {waypointDistance && !isActive && (
        <div className="waypoint-distance-info">
          <p>Flight Path Distance: {formatDistance(waypointDistance)}</p>
        </div>
      )}
    </div>
  )
}

export default MeasurementTools

