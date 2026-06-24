import React from 'react'
import { useAtom } from 'jotai'
import { waypointsAtom } from '../store/flightPlanStore'

// Simple test component to see if basic rendering works
const MapViewSimple: React.FC = () => {
  const [waypoints] = useAtom(waypointsAtom)
  
  return (
    <div className="map-view" style={{ 
      height: '100%', 
      width: '100%', 
      background: '#e8e8e8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Map View</div>
      <div>Waypoints: {waypoints.length}</div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        Click on the map to add waypoints
      </div>
    </div>
  )
}

export default MapViewSimple

