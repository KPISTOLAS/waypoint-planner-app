import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { waypointsAtom, selectedWaypointAtom, flightSettingsAtom } from '../store/flightPlanStore'
import { addToHistoryAtom, undoAtom, redoAtom, canUndoAtom, canRedoAtom } from '../store/historyStore'
import { Waypoint, WaypointAction } from '../types'
import { MapPin, Trash2, Edit, Plus, Camera, Video, RotateCcw, ChevronDown, ChevronUp, Copy, Clipboard, Layers, FileStack, Undo2, Redo2, GripVertical } from 'lucide-react'
import { WAYPOINT_TEMPLATES, generateWaypointsFromTemplate } from '../utils/waypointTemplates'
import './WaypointPanel.css'

const WAYPOINT_ROW_HEIGHT = 86
const WAYPOINT_OVERSCAN = 6

const WaypointPanel: React.FC = () => {
  const [waypoints, setWaypoints] = useAtom(waypointsAtom)
  const [selectedWaypoint, setSelectedWaypoint] = useAtom(selectedWaypointAtom)
  const [settings] = useAtom(flightSettingsAtom)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [selectedWaypoints, setSelectedWaypoints] = useState<Set<string>>(new Set())
  const [copiedWaypoints, setCopiedWaypoints] = useState<Waypoint[]>([])
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [bulkEditValues, setBulkEditValues] = useState<Partial<Waypoint>>({})
  const [showTemplates, setShowTemplates] = useState(false)
  const [listScrollTop, setListScrollTop] = useState(0)
  const [listViewportHeight, setListViewportHeight] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  
  // Undo/Redo
  const addToHistory = useSetAtom(addToHistoryAtom)
  const undo = useSetAtom(undoAtom)
  const redo = useSetAtom(redoAtom)
  const [canUndo] = useAtom(canUndoAtom)
  const [canRedo] = useAtom(canRedoAtom)
  
  // Drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // Track if we should save to history (avoid saving during undo/redo)
  const isUndoRedoRef = useRef(false)
  const isInitializedRef = useRef(false)
  
  // Initialize history with current waypoints (only once on mount)
  useEffect(() => {
    if (!isInitializedRef.current && waypoints.length > 0) {
      addToHistory(waypoints)
      isInitializedRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount
  
  // Don't auto-save to history on every change - only save when explicit actions occur
  // This prevents saving on every keystroke or minor update

  useEffect(() => {
    const listElement = listRef.current
    if (!listElement) return

    const updateHeight = () => setListViewportHeight(listElement.clientHeight)
    updateHeight()

    const resizeObserver = new ResizeObserver(updateHeight)
    resizeObserver.observe(listElement)

    return () => resizeObserver.disconnect()
  }, [isCollapsed])

  const visibleWaypointRange = useMemo(() => {
    if (waypoints.length === 0) {
      return { start: 0, end: 0 }
    }

    const visibleCount = Math.ceil((listViewportHeight || WAYPOINT_ROW_HEIGHT * 10) / WAYPOINT_ROW_HEIGHT)
    const start = Math.max(0, Math.floor(listScrollTop / WAYPOINT_ROW_HEIGHT) - WAYPOINT_OVERSCAN)
    const end = Math.min(waypoints.length, start + visibleCount + WAYPOINT_OVERSCAN * 2)

    return { start, end }
  }, [listScrollTop, listViewportHeight, waypoints.length])

  const visibleWaypoints = useMemo(
    () => waypoints.slice(visibleWaypointRange.start, visibleWaypointRange.end),
    [visibleWaypointRange.end, visibleWaypointRange.start, waypoints]
  )

  const handleAddWaypoint = () => {
    const newWaypoint: Waypoint = {
      id: Date.now().toString(),
      latitude: 0,
      longitude: 0,
      altitude: settings.altitude,
      speed: settings.speed,
      gimbalPitch: settings.gimbalAngle,
      heading: 0,
      actions: settings.autoTakePhoto ? [{ type: 'takePhoto' }] : [],
      dynamicAltitude: settings.dynamicAltitude,
    }
    addToHistory(waypoints) // Save before change
    setWaypoints([...waypoints, newWaypoint])
    setSelectedWaypoint(newWaypoint.id)
  }

  const handleDeleteWaypoint = (id: string) => {
    addToHistory(waypoints) // Save before change
    setWaypoints(waypoints.filter((wp) => wp.id !== id))
    if (selectedWaypoint === id) {
      setSelectedWaypoint(null)
    }
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
  
  const handleUndo = () => {
    if (!canUndo) return
    
    const restored = undo()
    if (restored) {
      isUndoRedoRef.current = true
      setWaypoints(restored)
    }
  }
  
  const handleRedo = () => {
    if (!canRedo) return
    
    const restored = redo()
    if (restored) {
      isUndoRedoRef.current = true
      setWaypoints(restored)
    }
  }
  
  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }
    
    addToHistory(waypoints) // Save before change
    
    const newWaypoints = [...waypoints]
    const [draggedItem] = newWaypoints.splice(draggedIndex, 1)
    newWaypoints.splice(dropIndex, 0, draggedItem)
    
    setWaypoints(newWaypoints)
    setDraggedIndex(null)
  }

  const handleAddAction = (waypointId: string, action: WaypointAction) => {
    const waypoint = waypoints.find((wp) => wp.id === waypointId)
    if (waypoint) {
      handleUpdateWaypoint(waypointId, {
        actions: [...(waypoint.actions || []), action],
      })
    }
  }

  const handleDuplicateWaypoint = (id: string) => {
    const waypoint = waypoints.find((wp) => wp.id === id)
    if (waypoint) {
      addToHistory(waypoints) // Save before change
      const duplicated: Waypoint = {
        ...waypoint,
        id: Date.now().toString(),
      }
      const index = waypoints.findIndex((wp) => wp.id === id)
      const newWaypoints = [...waypoints]
      newWaypoints.splice(index + 1, 0, duplicated)
      setWaypoints(newWaypoints)
      setSelectedWaypoint(duplicated.id)
    }
  }

  const handleCopyWaypoint = (id: string) => {
    const waypoint = waypoints.find((wp) => wp.id === id)
    if (waypoint) {
      setCopiedWaypoints([waypoint])
    }
  }

  const handlePasteWaypoints = () => {
    if (copiedWaypoints.length > 0) {
      addToHistory(waypoints) // Save before change
      const newWaypoints = copiedWaypoints.map((wp) => ({
        ...wp,
        id: Date.now().toString() + Math.random(),
      }))
      setWaypoints([...waypoints, ...newWaypoints])
      if (newWaypoints.length === 1) {
        setSelectedWaypoint(newWaypoints[0].id)
      }
    }
  }

  const handleBulkEdit = () => {
    if (selectedWaypoints.size === 0) return
    
    const updates: Partial<Waypoint> = {}
    if (bulkEditValues.altitude !== undefined && bulkEditValues.altitude !== null && !isNaN(bulkEditValues.altitude)) {
      updates.altitude = bulkEditValues.altitude
    }
    if (bulkEditValues.speed !== undefined && bulkEditValues.speed !== null && !isNaN(bulkEditValues.speed)) {
      updates.speed = bulkEditValues.speed
    }
    if (bulkEditValues.gimbalPitch !== undefined && bulkEditValues.gimbalPitch !== null && !isNaN(bulkEditValues.gimbalPitch)) {
      updates.gimbalPitch = bulkEditValues.gimbalPitch
    }
    if (bulkEditValues.heading !== undefined && bulkEditValues.heading !== null && !isNaN(bulkEditValues.heading)) {
      updates.heading = bulkEditValues.heading
    }

    if (Object.keys(updates).length > 0) {
      addToHistory(waypoints) // Save before change
      setWaypoints(
        waypoints.map((wp) =>
          selectedWaypoints.has(wp.id) ? { ...wp, ...updates } : wp
        )
      )
      setShowBulkEdit(false)
      setBulkEditValues({})
      setSelectedWaypoints(new Set())
    }
  }

  const toggleWaypointSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedWaypoints)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedWaypoints(newSelected)
  }

  // Keyboard shortcuts for copy/paste and undo/redo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+Z or Cmd+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) {
          handleUndo()
        }
      }

      // Ctrl+Shift+Z or Cmd+Shift+Z - Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (canRedo) {
          handleRedo()
        }
      }

      // Ctrl+Y or Cmd+Y - Redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (canRedo) {
          handleRedo()
        }
      }

      // Ctrl+C or Cmd+C - Copy selected waypoint
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedWaypoint) {
        e.preventDefault()
        handleCopyWaypoint(selectedWaypoint)
      }

      // Ctrl+V or Cmd+V - Paste waypoint
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedWaypoints.length > 0) {
        e.preventDefault()
        handlePasteWaypoints()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedWaypoint, copiedWaypoints, canUndo, canRedo])

  const selectedWp = waypoints.find((wp) => wp.id === selectedWaypoint)

  return (
    <div className="waypoint-panel">
      <div className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <MapPin size={18} />
          <h2>Waypoints ({waypoints.length})</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isCollapsed && (
            <>
              <button
                className={`waypoint-action-btn ${!canUndo ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleUndo()
                }}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button
                className={`waypoint-action-btn ${!canRedo ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRedo()
                }}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={16} />
              </button>
            </>
          )}
          {!isCollapsed && copiedWaypoints.length > 0 && (
            <button
              className="waypoint-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                handlePasteWaypoints()
              }}
              title="Paste Waypoint (Ctrl+V)"
            >
              <Clipboard size={16} />
            </button>
          )}
          {!isCollapsed && selectedWaypoints.size > 0 && (
            <button
              className="waypoint-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowBulkEdit(true)
              }}
              title="Bulk Edit Selected"
            >
              <Layers size={16} />
            </button>
          )}
          {!isCollapsed && (
            <button
              className="waypoint-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowTemplates(!showTemplates)
              }}
              title="Waypoint Templates"
            >
              <FileStack size={16} />
            </button>
          )}
          <button 
            className="add-waypoint-btn" 
            onClick={(e) => {
              e.stopPropagation()
              handleAddWaypoint()
            }} 
            title="Add Waypoint (N)"
          >
            <Plus size={16} />
          </button>
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </div>
      
      {!isCollapsed && (
      <div className="waypoint-panel-content">
      <div
        className="waypoint-list"
        ref={listRef}
        onScroll={(e) => setListScrollTop(e.currentTarget.scrollTop)}
      >
        {waypoints.length === 0 ? (
          <div className="empty-state">
            <MapPin size={48} strokeWidth={1} />
            <p>No waypoints yet</p>
            <p className="empty-hint">Click "Add Waypoint" or click on the map to create one</p>
          </div>
        ) : (
          <div
            className="waypoint-list-spacer"
            style={{ height: `${waypoints.length * WAYPOINT_ROW_HEIGHT}px` }}
          >
            {visibleWaypoints.map((waypoint, visibleIndex) => {
              const index = visibleWaypointRange.start + visibleIndex

              return (
                <div
                  key={waypoint.id}
                  className={`waypoint-item ${selectedWaypoint === waypoint.id ? 'selected' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  onClick={() => setSelectedWaypoint(waypoint.id)}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  style={{
                    cursor: 'move',
                    left: 0,
                    position: 'absolute',
                    right: 0,
                    top: `${index * WAYPOINT_ROW_HEIGHT}px`,
                  }}
                >
                  <div className="waypoint-number" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <GripVertical size={14} style={{ cursor: 'grab', color: '#999' }} />
                    <input
                      type="checkbox"
                      checked={selectedWaypoints.has(waypoint.id)}
                      onChange={(e) => toggleWaypointSelection(waypoint.id, e as any)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginRight: '8px' }}
                    />
                    {index + 1}
                  </div>
                  <div className="waypoint-info">
                    <div className="waypoint-coords">
                      {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                    </div>
                    <div className="waypoint-details">
                      Alt: {waypoint.altitude}m | Speed: {waypoint.speed || settings.speed}m/s
                    </div>
                    {waypoint.actions && waypoint.actions.length > 0 && (
                      <div className="waypoint-actions">
                        {waypoint.actions.length} action(s)
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="waypoint-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyWaypoint(waypoint.id)
                      }}
                      title="Copy Waypoint (Ctrl+C)"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="waypoint-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDuplicateWaypoint(waypoint.id)
                      }}
                      title="Duplicate Waypoint"
                    >
                      <Layers size={14} />
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteWaypoint(waypoint.id)
                      }}
                      title="Delete Waypoint (D)"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedWp && (
        <div className="waypoint-editor">
          <div className="editor-header">
            <Edit size={16} />
            <span>Edit Waypoint {waypoints.findIndex((wp) => wp.id === selectedWp.id) + 1}</span>
          </div>
          <div className="editor-content">
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
      )}

      {showTemplates && !isCollapsed && (
        <div className="templates-menu">
          <div className="templates-header">
            <h4>Waypoint Templates</h4>
            <button onClick={() => setShowTemplates(false)}>×</button>
          </div>
          <div className="templates-list">
            {WAYPOINT_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="template-item"
                onClick={() => {
                  // Generate waypoints at map center (0,0) - user can adjust
                  const generated = generateWaypointsFromTemplate(template, 0, 0, 100)
                  setWaypoints([...waypoints, ...generated])
                  setShowTemplates(false)
                }}
              >
                <div className="template-name">{template.name}</div>
                <div className="template-description">{template.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBulkEdit && (
        <div className="bulk-edit-dialog">
          <div className="bulk-edit-header">
            <h3>Bulk Edit {selectedWaypoints.size} Waypoint(s)</h3>
            <button onClick={() => {
              setShowBulkEdit(false)
              setBulkEditValues({})
            }}>×</button>
          </div>
          <div className="bulk-edit-content">
            <div className="editor-field">
              <label>Altitude (m) - Leave empty to keep current</label>
              <input
                type="number"
                value={bulkEditValues.altitude || ''}
                onChange={(e) => setBulkEditValues({ ...bulkEditValues, altitude: parseFloat(e.target.value) || undefined })}
                placeholder="Keep current"
                step="0.1"
              />
            </div>
            <div className="editor-field">
              <label>Speed (m/s) - Leave empty to keep current</label>
              <input
                type="number"
                value={bulkEditValues.speed || ''}
                onChange={(e) => setBulkEditValues({ ...bulkEditValues, speed: parseFloat(e.target.value) || undefined })}
                placeholder="Keep current"
                step="0.1"
              />
            </div>
            <div className="editor-field">
              <label>Gimbal Pitch (°) - Leave empty to keep current</label>
              <input
                type="number"
                value={bulkEditValues.gimbalPitch || ''}
                onChange={(e) => setBulkEditValues({ ...bulkEditValues, gimbalPitch: parseFloat(e.target.value) || undefined })}
                placeholder="Keep current"
                min="-90"
                max="30"
                step="1"
              />
            </div>
            <div className="editor-field">
              <label>Heading (°) - Leave empty to keep current</label>
              <input
                type="number"
                value={bulkEditValues.heading || ''}
                onChange={(e) => setBulkEditValues({ ...bulkEditValues, heading: parseFloat(e.target.value) || undefined })}
                placeholder="Keep current"
                min="0"
                max="360"
                step="1"
              />
            </div>
          </div>
          <div className="bulk-edit-footer">
            <button onClick={() => {
              setShowBulkEdit(false)
              setBulkEditValues({})
            }}>Cancel</button>
            <button onClick={handleBulkEdit} className="primary">Apply</button>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  )
}

export default WaypointPanel

