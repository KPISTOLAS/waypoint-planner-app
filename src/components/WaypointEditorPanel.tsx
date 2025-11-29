import React from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { waypointsAtom, selectedWaypointAtom, flightSettingsAtom } from '../store/flightPlanStore'
import { addToHistoryAtom } from '../store/historyStore'
import { Waypoint, WaypointAction } from '../types'
import { Edit, X, Camera, Video, RotateCcw } from 'lucide-react'
import './WaypointEditorPanel.css'

interface WaypointEditorPanelProps {
  onClose: () => void
}

const WaypointEditorPanel: React.FC<WaypointEditorPanelProps> = ({ onClose }) => {
  const [waypoints, setWaypoints] = useAtom(waypointsAtom)
  const [selectedWaypoint, setSelectedWaypoint] = useAtom(selectedWaypointAtom)
  const [settings] = useAtom(flightSettingsAtom)
  const addToHistory = useSetAtom(addToHistoryAtom)

  const selectedWp = waypoints.find((wp) => wp.id === selectedWaypoint)

  if (!selectedWp) {
    return null
  }

  const handleUpdateWaypoint = (id: string, updates: Partial<Waypoint>) => {
    // Only save to history if this is a significant change (not just typing)
    const shouldSave = Object.keys(updates).some(key => 
      ['latitude', 'longitude', 'altitude'].includes(key)
    )
    if (shouldSave) {
      addToHistory(waypoints)
    }
    setWaypoints(
      waypoints.map((wp) => (wp.id === id ? { ...wp, ...updates } : wp))
    )
  }

  const handleAddAction = (waypointId: string, action: WaypointAction) => {
    const waypoint = waypoints.find((wp) => wp.id === waypointId)
    if (waypoint) {
      handleUpdateWaypoint(waypointId, {
        actions: [...(waypoint.actions || []), action],
      })
    }
  }

  const waypointIndex = waypoints.findIndex((wp) => wp.id === selectedWp.id) + 1

  return (
    <div className="waypoint-editor-panel">
      <div className="editor-panel-header">
        <div className="editor-panel-title">
          <Edit size={18} />
          <span>Edit Waypoint {waypointIndex}</span>
        </div>
        <button className="editor-panel-close" onClick={onClose} title="Close Editor">
          <X size={18} />
        </button>
      </div>
      <div className="editor-panel-content">
        <div className="editor-field">
          <label>Latitude</label>
          <input
            type="number"
            value={selectedWp.latitude}
            onChange={(e) =>
              handleUpdateWaypoint(selectedWp.id, {
                latitude: parseFloat(e.target.value) || 0,
              })
            }
            step="0.000001"
          />
        </div>
        <div className="editor-field">
          <label>Longitude</label>
          <input
            type="number"
            value={selectedWp.longitude}
            onChange={(e) =>
              handleUpdateWaypoint(selectedWp.id, {
                longitude: parseFloat(e.target.value) || 0,
              })
            }
            step="0.000001"
          />
        </div>
        <div className="editor-field">
          <label>Altitude (m)</label>
          <input
            type="number"
            value={selectedWp.altitude}
            onChange={(e) =>
              handleUpdateWaypoint(selectedWp.id, {
                altitude: parseFloat(e.target.value) || 0,
              })
            }
            step="0.1"
          />
        </div>
        <div className="editor-field">
          <label>Speed (m/s)</label>
          <input
            type="number"
            value={selectedWp.speed || settings.speed}
            onChange={(e) =>
              handleUpdateWaypoint(selectedWp.id, {
                speed: parseFloat(e.target.value) || settings.speed,
              })
            }
            step="0.1"
          />
        </div>
        <div className="editor-field">
          <label>Gimbal Pitch (°)</label>
          <input
            type="number"
            value={selectedWp.gimbalPitch || settings.gimbalAngle}
            onChange={(e) =>
              handleUpdateWaypoint(selectedWp.id, {
                gimbalPitch: parseFloat(e.target.value) || settings.gimbalAngle,
              })
            }
            min="-90"
            max="30"
            step="1"
          />
        </div>
        <div className="editor-field">
          <label>Heading (°)</label>
          <input
            type="number"
            value={selectedWp.heading || 0}
            onChange={(e) =>
              handleUpdateWaypoint(selectedWp.id, {
                heading: parseFloat(e.target.value) || 0,
              })
            }
            min="0"
            max="360"
            step="1"
          />
        </div>

        <div className="editor-section">
          <label>Waypoint Actions</label>
          <div className="action-buttons">
            <button
              className="action-btn"
              onClick={() =>
                handleAddAction(selectedWp.id, { type: 'takePhoto' })
              }
            >
              <Camera size={16} />
              Take Photo
            </button>
            <button
              className="action-btn"
              onClick={() =>
                handleAddAction(selectedWp.id, { type: 'startRecord' })
              }
            >
              <Video size={16} />
              Start Record
            </button>
            <button
              className="action-btn"
              onClick={() =>
                handleAddAction(selectedWp.id, { type: 'stopRecord' })
              }
            >
              <Video size={16} />
              Stop Record
            </button>
            <button
              className="action-btn"
              onClick={() =>
                handleAddAction(selectedWp.id, {
                  type: 'rotateGimbal',
                  params: { angle: -45 },
                })
              }
            >
              <RotateCcw size={16} />
              Rotate Gimbal
            </button>
          </div>
          {selectedWp.actions && selectedWp.actions.length > 0 && (
            <div className="actions-list">
              {selectedWp.actions.map((action, idx) => (
                <div key={idx} className="action-item">
                  {action.type}
                  <button
                    onClick={() => {
                      const newActions = selectedWp.actions?.filter((_, i) => i !== idx) || []
                      handleUpdateWaypoint(selectedWp.id, { actions: newActions })
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WaypointEditorPanel

