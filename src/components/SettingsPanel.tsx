import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { flightSettingsAtom, droneModelAtom, waypointsAtom } from '../store/flightPlanStore'
import { addToastAtom } from '../store/toastStore'
import { DJI_MODELS, DJI_CAMERA_SENSORS, FlightSettings, Waypoint } from '../types'
import { applyTerrainElevation } from '../utils/terrainElevation'
import { Settings, Radio, ChevronDown, ChevronUp, Box, Map, Scan, Eye, Sliders, Mountain } from 'lucide-react'
import './SettingsPanel.css'

// Preset configurations
const PRESETS: Record<string, { name: string; icon: React.ReactNode; settings: FlightSettings }> = {
  '3d-modeling': {
    name: '3D Modeling',
    icon: <Box size={16} />,
    settings: {
      altitude: 40,
      speed: 4,
      gimbalAngle: -90,
      pathSpacing: 15,
      imageOverlap: {
        forward: 80,
        side: 80,
      },
      reversePoints: false,
      lineOrientation: 0,
      straightenedPaths: true,
      dynamicAltitude: false,
      autoTakePhoto: true,
    },
  },
  'mapping': {
    name: 'Mapping',
    icon: <Map size={16} />,
    settings: {
      altitude: 60,
      speed: 6,
      gimbalAngle: -90,
      pathSpacing: 25,
      imageOverlap: {
        forward: 70,
        side: 70,
      },
      reversePoints: false,
      lineOrientation: 0,
      straightenedPaths: true,
      dynamicAltitude: false,
      autoTakePhoto: true,
    },
  },
  'scanning': {
    name: 'Scanning',
    icon: <Scan size={16} />,
    settings: {
      altitude: 50,
      speed: 5,
      gimbalAngle: -90,
      pathSpacing: 20,
      imageOverlap: {
        forward: 75,
        side: 75,
      },
      reversePoints: true,
      lineOrientation: 0,
      straightenedPaths: true,
      dynamicAltitude: true,
      autoTakePhoto: true,
    },
  },
  'inspection': {
    name: 'Inspection',
    icon: <Eye size={16} />,
    settings: {
      altitude: 30,
      speed: 3,
      gimbalAngle: -45,
      pathSpacing: 10,
      imageOverlap: {
        forward: 60,
        side: 60,
      },
      reversePoints: false,
      lineOrientation: 0,
      straightenedPaths: false,
      dynamicAltitude: false,
      autoTakePhoto: true,
    },
  },
}

// Calculate settings based on quality slider, area size, and camera sensor
const calculateSettingsFromQuality = (quality: number, area: number, sensorWidth: number) => {
  // Map quality (0-100) to overlap (25%-95%)
  const overlap = 25 + (quality / 100) * 70 // 25% to 95%
  
  // Reference sensor width (13.2mm - typical 1-inch sensor)
  const referenceSensorWidth = 13.2
  // Sensor ratio: larger sensors can fly higher for same ground coverage
  const sensorRatio = sensorWidth / referenceSensorWidth
  
  // Calculate suggested altitude based on area size (for display only, not applied)
  // Small area (< 10,000 m²): 30-50m
  // Medium area (10,000 - 100,000 m²): 50-80m
  // Large area (> 100,000 m²): 80-120m
  let baseAltitude = 50
  if (area < 10000) {
    baseAltitude = 30 + (quality / 100) * 20 // 30-50m
  } else if (area < 100000) {
    baseAltitude = 50 + (quality / 100) * 30 // 50-80m
  } else {
    baseAltitude = 80 + (quality / 100) * 40 // 80-120m
  }
  
  // Adjust altitude based on sensor size
  // Larger sensors can achieve same GSD at higher altitudes
  // Formula: optimal altitude = base altitude * sensor ratio
  const suggestedAltitude = baseAltitude * sensorRatio
  
  // Calculate path spacing based on sensor width, suggested altitude, and overlap
  // Ground coverage width is proportional to (altitude * sensor width)
  // For typical DJI cameras with ~24mm equivalent focal length:
  // Ground width ~= (altitude * sensor_width) / focal_length_equivalent
  const approximateFocalLength = 24 // mm
  const groundCoverageWidth = (suggestedAltitude * sensorWidth) / approximateFocalLength
  
  // Path spacing = ground coverage width * (1 - overlap/100)
  let pathSpacing = groundCoverageWidth * (1 - overlap / 100)
  
  // Enforce minimum path spacing to prevent too many waypoints
  // Minimum spacing: 5m for small areas, 8m for medium, 10m for large
  let minPathSpacing = 5
  if (area >= 100000) {
    minPathSpacing = 10
  } else if (area >= 10000) {
    minPathSpacing = 8
  }
  
  // Ensure path spacing is never too small
  pathSpacing = Math.max(pathSpacing, minPathSpacing)
  
  // Also enforce maximum reasonable spacing (to avoid too few waypoints)
  const maxPathSpacing = 50
  pathSpacing = Math.min(pathSpacing, maxPathSpacing)
  
  return {
    overlap: Math.round(overlap),
    suggestedAltitude: Math.round(suggestedAltitude),
    pathSpacing: Math.round(pathSpacing * 10) / 10, // Round to 1 decimal
  }
}

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useAtom(flightSettingsAtom)
  const [droneModel, setDroneModel] = useAtom(droneModelAtom)
  const [waypoints, setWaypoints] = useAtom(waypointsAtom)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isGeneralCollapsed, setIsGeneralCollapsed] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [qualityValue, setQualityValue] = useState(50) // Default to middle (60% overlap)
  const isQualityChangingRef = useRef(false)
  const previousAutoTakePhotoRef = useRef(settings.autoTakePhoto)
  const [isApplyingElevation, setIsApplyingElevation] = useState(false)
  const addToast = useSetAtom(addToastAtom)

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS[presetKey]
    if (preset) {
      setSettings(preset.settings)
      setSelectedPreset(presetKey)
    }
  }

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setSettings({ ...settings, [key]: value })
  }

  // Calculate area from waypoints (bounding box in square meters)
  const areaSize = useMemo(() => {
    if (waypoints.length < 2) return 0
    
    let minLat = waypoints[0].latitude
    let maxLat = waypoints[0].latitude
    let minLng = waypoints[0].longitude
    let maxLng = waypoints[0].longitude

    for (const waypoint of waypoints) {
      minLat = Math.min(minLat, waypoint.latitude)
      maxLat = Math.max(maxLat, waypoint.latitude)
      minLng = Math.min(minLng, waypoint.longitude)
      maxLng = Math.max(maxLng, waypoint.longitude)
    }
    
    // Calculate area in square meters using Haversine formula approximation
    const centerLat = (minLat + maxLat) / 2
    const metersPerDegreeLat = 111320
    const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180)
    
    const width = (maxLng - minLng) * metersPerDegreeLng
    const height = (maxLat - minLat) * metersPerDegreeLat
    
    return width * height
  }, [waypoints])

  const qualityDerived = useMemo(
    () => calculateSettingsFromQuality(qualityValue, areaSize, DJI_CAMERA_SENSORS[droneModel]),
    [areaSize, droneModel, qualityValue]
  )

  // Handle quality slider change
  const handleQualityChange = (value: number) => {
    isQualityChangingRef.current = true
    setQualityValue(value)
    const calculated = calculateSettingsFromQuality(value, areaSize, DJI_CAMERA_SENSORS[droneModel])
    
    // Only update pathSpacing and overlap, NOT altitude
    setSettings({
      ...settings,
      pathSpacing: calculated.pathSpacing,
      imageOverlap: {
        forward: calculated.overlap,
        side: calculated.overlap,
      },
    })
    
    // Reset flag after a short delay
    setTimeout(() => {
      isQualityChangingRef.current = false
    }, 100)
  }

  // Sync quality slider when settings change manually (if overlap matches calculated value)
  useEffect(() => {
    // Don't sync if quality is being changed by the slider
    if (isQualityChangingRef.current) return
    
    if (waypoints.length >= 2) {
      // Only sync if overlap matches (within 5% tolerance)
      const overlapMatches = 
        Math.abs(settings.imageOverlap.forward - qualityDerived.overlap) < 5 &&
        Math.abs(settings.imageOverlap.side - qualityDerived.overlap) < 5
      
      if (!overlapMatches) {
        // Settings were changed manually, try to find matching quality value
        const overlap = (settings.imageOverlap.forward + settings.imageOverlap.side) / 2
        const estimatedQuality = ((overlap - 25) / 70) * 100
        if (estimatedQuality >= 0 && estimatedQuality <= 100) {
          setQualityValue(Math.round(estimatedQuality))
        }
      }
    }
  }, [settings.imageOverlap, qualityDerived.overlap])

  // Recalculate path spacing when drone model or quality changes (but not altitude)
  useEffect(() => {
    if (waypoints.length >= 2 && !isQualityChangingRef.current) {
      setSettings(prev => (
        prev.pathSpacing === qualityDerived.pathSpacing
          ? prev
          : {
              ...prev,
              pathSpacing: qualityDerived.pathSpacing,
            }
      ))
    }
  }, [qualityDerived.pathSpacing, setSettings, waypoints.length])

  // Apply/remove takePhoto action to all waypoints when autoTakePhoto setting changes
  useEffect(() => {
    if (previousAutoTakePhotoRef.current === settings.autoTakePhoto) {
      return
    }

    previousAutoTakePhotoRef.current = settings.autoTakePhoto

    if (settings.autoTakePhoto) {
      // Add takePhoto action to all waypoints that don't have it
      setWaypoints(prevWaypoints => {
        let changed = false
        const nextWaypoints = prevWaypoints.map(wp => {
          const hasTakePhoto = wp.actions?.some(action => action.type === 'takePhoto')
          if (!hasTakePhoto) {
            changed = true
            return {
              ...wp,
              actions: [...(wp.actions || []), { type: 'takePhoto' }],
            }
          }
          return wp
        })
        return changed ? nextWaypoints : prevWaypoints
      })
    } else {
      // Remove takePhoto action from all waypoints
      setWaypoints(prevWaypoints => {
        let changed = false
        const nextWaypoints = prevWaypoints.map(wp => {
          const actions = wp.actions || []
          const nextActions = actions.filter(action => action.type !== 'takePhoto')
          if (nextActions.length !== actions.length) {
            changed = true
            return {
              ...wp,
              actions: nextActions,
            }
          }
          return wp
        })
        return changed ? nextWaypoints : prevWaypoints
      })
    }
  }, [settings.autoTakePhoto, setWaypoints])

  // Check if current settings match a preset
  useEffect(() => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      const matches = 
        settings.altitude === preset.settings.altitude &&
        settings.speed === preset.settings.speed &&
        settings.gimbalAngle === preset.settings.gimbalAngle &&
        settings.pathSpacing === preset.settings.pathSpacing &&
        settings.imageOverlap.forward === preset.settings.imageOverlap.forward &&
        settings.imageOverlap.side === preset.settings.imageOverlap.side &&
        settings.reversePoints === preset.settings.reversePoints &&
        settings.lineOrientation === preset.settings.lineOrientation &&
        settings.straightenedPaths === preset.settings.straightenedPaths &&
        settings.dynamicAltitude === preset.settings.dynamicAltitude &&
        settings.autoTakePhoto === preset.settings.autoTakePhoto

      if (matches) {
        setSelectedPreset(key)
        return
      }
    }
    setSelectedPreset(null)
  }, [settings])

  return (
    <div className="settings-panel">
      {/* Drone Model Section - At the top */}
      <div className="drone-model-section">
        <div className="setting-group">
          <label className="setting-label">
            <Radio size={16} />
            Drone Model
          </label>
          <select
            className="setting-input"
            value={droneModel}
            onChange={(e) => setDroneModel(e.target.value as any)}
          >
            {DJI_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* General Settings Section */}
      <div className="panel-header" onClick={() => setIsGeneralCollapsed(!isGeneralCollapsed)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} />
          <h2>General Settings</h2>
        </div>
        {isGeneralCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </div>
      
      {!isGeneralCollapsed && (
        <div className="settings-content">
          <div className="setting-group">
            <label className="setting-label">
              Quality Slider
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888' }}>
                {qualityValue === 0 ? 'Speed (25% overlap)' : 
                 qualityValue === 100 ? 'Quality (95% overlap)' : 
                 `${Math.round(25 + (qualityValue / 100) * 70)}% overlap`}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={qualityValue}
              onChange={(e) => handleQualityChange(parseInt(e.target.value))}
              className="quality-slider"
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                background: `linear-gradient(to right, #e74c3c 0%, #f39c12 25%, #3498db 50%, #2ecc71 75%, #27ae60 100%)`,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', marginTop: '4px' }}>
              <span>Speed</span>
              <span>Quality</span>
            </div>
          </div>

          {waypoints.length >= 2 && (
            <div style={{ marginTop: '12px', padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>Area Size:</span>
                <span style={{ fontWeight: '600' }}>
                  {areaSize < 10000 ? `${(areaSize / 1000).toFixed(2)}k m²` :
                   areaSize < 1000000 ? `${(areaSize / 10000).toFixed(2)} ha` :
                   `${(areaSize / 1000000).toFixed(2)} km²`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>Camera Sensor:</span>
                <span style={{ fontWeight: '600' }}>{DJI_CAMERA_SENSORS[droneModel]} mm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>Suggested Altitude:</span>
                <span style={{ fontWeight: '600', color: '#4a90e2' }}>{qualityDerived.suggestedAltitude} m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Path Spacing:</span>
                <span style={{ fontWeight: '600' }}>{qualityDerived.pathSpacing} m</span>
              </div>
            </div>
          )}
          {waypoints.length < 2 && (
            <div style={{ marginTop: '8px', padding: '8px', background: '#fff3cd', borderRadius: '6px', fontSize: '11px', color: '#856404' }}>
              Add waypoints to see area-based calculations
            </div>
          )}
        </div>
      )}

      {/* Presets Section */}
      <div className="presets-section">
        <div className="presets-header">
          <h3>Presets</h3>
        </div>
        <div className="presets-grid">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`preset-btn ${selectedPreset === key ? 'active' : ''}`}
              onClick={() => applyPreset(key)}
              title={preset.name}
            >
              {preset.icon}
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} />
          <h2>Advanced Settings</h2>
        </div>
        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
      </div>
      
      {!isCollapsed && (
      <div className="settings-content">

        <div className="setting-group">
          <label className="setting-label">Altitude (m)</label>
          <input
            type="number"
            className="setting-input"
            value={settings.altitude}
            onChange={(e) => updateSetting('altitude', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">Speed (m/s)</label>
          <input
            type="number"
            className="setting-input"
            value={settings.speed}
            onChange={(e) => updateSetting('speed', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">Gimbal Angle (°)</label>
          <input
            type="number"
            className="setting-input"
            value={settings.gimbalAngle}
            onChange={(e) => updateSetting('gimbalAngle', parseFloat(e.target.value) || 0)}
            min="-90"
            max="30"
            step="1"
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">Path Spacing (m)</label>
          <input
            type="number"
            className="setting-input"
            value={settings.pathSpacing}
            onChange={(e) => updateSetting('pathSpacing', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">Image Overlap - Forward (%)</label>
          <input
            type="number"
            className="setting-input"
            value={settings.imageOverlap.forward}
            onChange={(e) =>
              updateSetting('imageOverlap', {
                ...settings.imageOverlap,
                forward: parseFloat(e.target.value) || 0,
              })
            }
            min="0"
            max="100"
            step="1"
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">Image Overlap - Side (%)</label>
          <input
            type="number"
            className="setting-input"
            value={settings.imageOverlap.side}
            onChange={(e) =>
              updateSetting('imageOverlap', {
                ...settings.imageOverlap,
                side: parseFloat(e.target.value) || 0,
              })
            }
            min="0"
            max="100"
            step="1"
          />
        </div>

        <div className="setting-group">
          <label className="setting-label">Line Orientation (°)</label>
          <input
            type="number"
            className="setting-input"
            value={settings.lineOrientation}
            onChange={(e) => updateSetting('lineOrientation', parseFloat(e.target.value) || 0)}
            min="0"
            max="360"
            step="1"
          />
        </div>

        <div className="setting-group checkbox-group">
          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={settings.dynamicAltitude}
              onChange={(e) => updateSetting('dynamicAltitude', e.target.checked)}
            />
            <span>Dynamic Altitude Adjustment</span>
          </label>
        </div>

        <div className="setting-group">
          <button
            className="terrain-elevation-btn"
            onClick={async () => {
              if (waypoints.length === 0) {
                addToast('No waypoints to apply terrain elevation to.', 'warning')
                return
              }
              
              setIsApplyingElevation(true)
              try {
                const updated = await applyTerrainElevation(waypoints, settings.altitude)
                setWaypoints(updated as Waypoint[])
                addToast(`Terrain elevation applied to ${updated.length} waypoints.`, 'success')
              } catch (error) {
                console.error('Failed to apply terrain elevation:', error)
                addToast('Failed to apply terrain elevation. Please check your internet connection.', 'error')
              } finally {
                setIsApplyingElevation(false)
              }
            }}
            disabled={isApplyingElevation || waypoints.length === 0}
            title="Apply terrain elevation to all waypoints using free elevation API"
          >
            <Mountain size={16} />
            <span>{isApplyingElevation ? 'Applying...' : 'Apply Terrain Elevation'}</span>
          </button>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Adjusts waypoint altitudes based on actual terrain elevation (free API)
          </p>
        </div>

        <div className="setting-group checkbox-group">
          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={settings.reversePoints}
              onChange={(e) => updateSetting('reversePoints', e.target.checked)}
            />
            <span>Reverse Points</span>
          </label>
        </div>

        <div className="setting-group checkbox-group">
          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={settings.straightenedPaths}
              onChange={(e) => updateSetting('straightenedPaths', e.target.checked)}
            />
            <span>Straightened Flight Paths</span>
          </label>
        </div>

        <div className="setting-group checkbox-group">
          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={settings.autoTakePhoto}
              onChange={(e) => updateSetting('autoTakePhoto', e.target.checked)}
            />
            <span>Auto Take Photo at All Waypoints</span>
          </label>
        </div>
      </div>
      )}
    </div>
  )
}

export default SettingsPanel

