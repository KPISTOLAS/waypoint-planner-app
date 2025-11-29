import { Waypoint, FlightPlan, FlightSettings, DJIModel } from '../types'
import { calculateFlightPath } from './flightPathCalculator'
import { estimateBatteryUsage } from './batteryCalculator'

/**
 * Export waypoints to CSV format
 */
export const exportToCSV = (waypoints: Waypoint[]): string => {
  const headers = [
    'Index',
    'Latitude',
    'Longitude',
    'Altitude (m)',
    'Speed (m/s)',
    'Gimbal Pitch (°)',
    'Heading (°)',
    'Actions',
  ]
  
  const rows = waypoints.map((wp, index) => {
    const actions = wp.actions?.map(a => a.type).join('; ') || 'None'
    return [
      index + 1,
      wp.latitude.toFixed(8),
      wp.longitude.toFixed(8),
      wp.altitude,
      wp.speed || 0,
      wp.gimbalPitch || 0,
      wp.heading || 0,
      actions,
    ]
  })
  
  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

/**
 * Export to DJI FlightHub format (JSON)
 */
export const exportToDJIFlightHub = (flightPlan: FlightPlan): any => {
  const waypoints = flightPlan.waypoints.map((wp, index) => ({
    waypointIndex: index,
    latitude: wp.latitude,
    longitude: wp.longitude,
    altitude: wp.altitude,
    speed: wp.speed || flightPlan.settings.speed,
    gimbalPitch: wp.gimbalPitch || flightPlan.settings.gimbalAngle,
    heading: wp.heading || 0,
    actions: wp.actions?.map(a => ({
      actionType: a.type,
      actionParam: a.params || {},
    })) || [],
  }))
  
  return {
    version: '1.0',
    mission: {
      name: flightPlan.name,
      droneModel: flightPlan.droneModel,
      waypoints,
      settings: {
        altitude: flightPlan.settings.altitude,
        speed: flightPlan.settings.speed,
        gimbalAngle: flightPlan.settings.gimbalAngle,
        pathSpacing: flightPlan.settings.pathSpacing,
        imageOverlap: flightPlan.settings.imageOverlap,
      },
      createdAt: flightPlan.createdAt.toISOString(),
      updatedAt: flightPlan.updatedAt.toISOString(),
    },
  }
}

/**
 * Export to Litchi format (CSV)
 */
export const exportToLitchi = (waypoints: Waypoint[], settings: FlightSettings): string => {
  const headers = [
    'latitude',
    'longitude',
    'altitude(m)',
    'heading(deg)',
    'curvesize(m)',
    'rotationdir',
    'gimbalmode',
    'gimbalpitchangle',
    'actiontype1',
    'actionparam1',
    'actiontype2',
    'actionparam2',
    'actiontype3',
    'actionparam3',
    'altitudemode',
    'speed(m/s)',
    'poi_latitude',
    'poi_longitude',
    'poi_altitude(m)',
    'poi_altitudemode',
    'photo_timeinterval',
    'photo_distinterval',
  ]
  
  const rows = waypoints.map((wp) => {
    const actions = wp.actions || []
    const action1 = actions[0] || { type: '', params: {} }
    const action2 = actions[1] || { type: '', params: {} }
    const action3 = actions[2] || { type: '', params: {} }
    
    return [
      wp.latitude.toFixed(8),
      wp.longitude.toFixed(8),
      wp.altitude,
      wp.heading || 0,
      0, // curvesize
      0, // rotationdir
      0, // gimbalmode
      wp.gimbalPitch || settings.gimbalAngle,
      action1.type || '',
      JSON.stringify(action1.params || {}),
      action2.type || '',
      JSON.stringify(action2.params || {}),
      action3.type || '',
      JSON.stringify(action3.params || {}),
      wp.dynamicAltitude ? 1 : 0, // altitudemode
      wp.speed || settings.speed,
      '', // poi_latitude
      '', // poi_longitude
      '', // poi_altitude
      '', // poi_altitudemode
      '', // photo_timeinterval
      '', // photo_distinterval
    ]
  })
  
  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

/**
 * Generate PDF report content (HTML that can be converted to PDF)
 */
export const generatePDFReport = (
  flightPlan: FlightPlan,
  batteryEstimate: any,
  flightStats: any
): string => {
  const { totalDistance, estimatedTime } = calculateFlightPath(flightPlan.waypoints, flightPlan.settings)
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Flight Plan Report - ${flightPlan.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    h1 { color: #4a90e2; border-bottom: 3px solid #4a90e2; padding-bottom: 10px; }
    h2 { color: #2c3e50; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: 600; }
    .warning { color: #c33; font-weight: 600; }
    .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
  </style>
</head>
<body>
  <h1>Flight Plan Report</h1>
  <div class="info-box">
    <h2>Mission Overview</h2>
    <p><strong>Project Name:</strong> ${flightPlan.name}</p>
    <p><strong>Drone Model:</strong> ${flightPlan.droneModel}</p>
    <p><strong>Created:</strong> ${flightPlan.createdAt.toLocaleString()}</p>
    <p><strong>Last Updated:</strong> ${flightPlan.updatedAt.toLocaleString()}</p>
  </div>
  
  <h2>Flight Statistics</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Waypoints</td><td>${flightPlan.waypoints.length}</td></tr>
    <tr><td>Total Distance</td><td>${(totalDistance / 1000).toFixed(2)} km</td></tr>
    <tr><td>Estimated Flight Time</td><td>${(estimatedTime / 60).toFixed(1)} minutes</td></tr>
    <tr><td>Average Speed</td><td>${flightPlan.settings.speed} m/s</td></tr>
    <tr><td>Flight Altitude</td><td>${flightPlan.settings.altitude} m</td></tr>
  </table>
  
  <h2>Battery Estimation</h2>
  <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Estimated Battery Usage</td><td>${batteryEstimate.batteryUsage.toFixed(1)}%</td></tr>
    <tr><td>Remaining Battery</td><td>${batteryEstimate.remainingBattery.toFixed(1)}%</td></tr>
    <tr><td>Safety Status</td><td>${batteryEstimate.isSafe ? '✓ Safe' : '<span class="warning">⚠ Warning</span>'}</td></tr>
  </table>
  ${batteryEstimate.warnings.length > 0 ? `
    <div class="info-box">
      <strong>Warnings:</strong>
      <ul>
        ${batteryEstimate.warnings.map((w: string) => `<li class="warning">${w}</li>`).join('')}
      </ul>
    </div>
  ` : ''}
  
  <h2>Flight Settings</h2>
  <table>
    <tr><th>Setting</th><th>Value</th></tr>
    <tr><td>Altitude</td><td>${flightPlan.settings.altitude} m</td></tr>
    <tr><td>Speed</td><td>${flightPlan.settings.speed} m/s</td></tr>
    <tr><td>Gimbal Angle</td><td>${flightPlan.settings.gimbalAngle}°</td></tr>
    <tr><td>Path Spacing</td><td>${flightPlan.settings.pathSpacing} m</td></tr>
    <tr><td>Image Overlap (Forward)</td><td>${flightPlan.settings.imageOverlap.forward}%</td></tr>
    <tr><td>Image Overlap (Side)</td><td>${flightPlan.settings.imageOverlap.side}%</td></tr>
    <tr><td>Dynamic Altitude</td><td>${flightPlan.settings.dynamicAltitude ? 'Yes' : 'No'}</td></tr>
    <tr><td>Auto Take Photo</td><td>${flightPlan.settings.autoTakePhoto ? 'Yes' : 'No'}</td></tr>
  </table>
  
  <h2>Waypoints</h2>
  <table>
    <tr>
      <th>#</th>
      <th>Latitude</th>
      <th>Longitude</th>
      <th>Altitude (m)</th>
      <th>Speed (m/s)</th>
      <th>Actions</th>
    </tr>
    ${flightPlan.waypoints.map((wp, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${wp.latitude.toFixed(6)}</td>
        <td>${wp.longitude.toFixed(6)}</td>
        <td>${wp.altitude}</td>
        <td>${wp.speed || flightPlan.settings.speed}</td>
        <td>${wp.actions?.map(a => a.type).join(', ') || 'None'}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>
  `.trim()
}

