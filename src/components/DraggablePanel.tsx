import React, { useRef, useEffect } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { panelsAtom, updatePanelAtom, PanelState } from '../store/panelStore'
import { X, Minus, Maximize2, GripVertical } from 'lucide-react'
import './DraggablePanel.css'

interface DraggablePanelProps {
  panelId: string
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultPosition?: { x: number; y: number; width?: number; height?: number }
  minWidth?: number
  minHeight?: number
  resizable?: boolean
  onClose?: () => void
}

const DraggablePanel: React.FC<DraggablePanelProps> = ({
  panelId,
  title,
  icon,
  children,
  defaultPosition,
  minWidth = 300,
  minHeight = 200,
  resizable = true,
  onClose,
}) => {
  const [panels] = useAtom(panelsAtom)
  const updatePanel = useSetAtom(updatePanelAtom)
  
  const panelRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 })

  // Get panel state or use default
  const currentState: PanelState = panels[panelId] || {
    id: panelId,
    isOpen: true,
    isMinimized: false,
    position: defaultPosition || { x: 100, y: 100, width: 400, height: 500 },
    zIndex: 1000,
  }

  // Initialize panel if it doesn't exist
  useEffect(() => {
    if (!panels[panelId] && defaultPosition) {
      updatePanel(panelId, {
        id: panelId,
        isOpen: true,
        isMinimized: false,
        position: defaultPosition,
        zIndex: 1000,
      })
    }
  }, [panelId, defaultPosition, panels, updatePanel])

  if (!currentState.isOpen) {
    return null
  }

  const handleMouseUp = React.useCallback(() => {
    isDraggingRef.current = false
    isResizingRef.current = false
  }, [])

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) {
      const newX = e.clientX - dragStartRef.current.x
      const newY = e.clientY - dragStartRef.current.y
      
      // Get current state from atom
      const currentPanels = panels
      const currentPanelState = currentPanels[panelId]
      if (!currentPanelState) return
      
      // Keep panel within viewport
      const panelWidth = currentPanelState.position.width || minWidth
      const maxX = window.innerWidth - panelWidth
      const maxY = window.innerHeight - 50
      
      const x = Math.max(0, Math.min(newX, maxX))
      const y = Math.max(0, Math.min(newY, maxY))
      
      updatePanel(panelId, {
        position: { ...currentPanelState.position, x, y },
      })
    } else if (isResizingRef.current) {
      const deltaX = e.clientX - resizeStartRef.current.x
      const deltaY = e.clientY - resizeStartRef.current.y
      
      const newWidth = Math.max(minWidth, resizeStartRef.current.width + deltaX)
      const newHeight = Math.max(minHeight, resizeStartRef.current.height + deltaY)
      
      const currentPanels = panels
      const currentPanelState = currentPanels[panelId]
      if (!currentPanelState) return
      
      updatePanel(panelId, {
        position: {
          ...currentPanelState.position,
          width: newWidth,
          height: newHeight,
        },
      })
    }
  }, [panelId, minWidth, minHeight, panels, updatePanel])

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (e.target !== headerRef.current && !headerRef.current?.contains(e.target as Node)) {
      return
    }
    isDraggingRef.current = true
    const currentPanels = panels
    const currentPanelState = currentPanels[panelId]
    if (!currentPanelState) return
    
    dragStartRef.current = {
      x: e.clientX - currentPanelState.position.x,
      y: e.clientY - currentPanelState.position.y,
    }
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e)
    const mouseUpHandler = () => {
      handleMouseUp()
      document.removeEventListener('mousemove', mouseMoveHandler)
      document.removeEventListener('mouseup', mouseUpHandler)
    }
    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
    e.preventDefault()
  }, [panelId, panels, handleMouseMove, handleMouseUp])

  const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
    if (!resizable) return
    isResizingRef.current = true
    const currentPanels = panels
    const currentPanelState = currentPanels[panelId]
    if (!currentPanelState) return
    
    resizeStartRef.current = {
      width: currentPanelState.position.width || minWidth,
      height: currentPanelState.position.height || minHeight,
      x: e.clientX,
      y: e.clientY,
    }
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e)
    const mouseUpHandler = () => {
      handleMouseUp()
      document.removeEventListener('mousemove', mouseMoveHandler)
      document.removeEventListener('mouseup', mouseUpHandler)
    }
    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
    e.preventDefault()
    e.stopPropagation()
  }, [resizable, panelId, panels, minWidth, minHeight, handleMouseMove, handleMouseUp])

  const handleMinimize = () => {
    const updated = {
      ...currentState,
      isMinimized: !currentState.isMinimized,
    }
    updatePanel(panelId, updated)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      const updated = {
        ...currentState,
        isOpen: false,
      }
      updatePanel(panelId, updated)
    }
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${currentState.position.x}px`,
    top: `${currentState.position.y}px`,
    width: currentState.isMinimized ? 'auto' : `${currentState.position.width || minWidth}px`,
    height: currentState.isMinimized ? 'auto' : `${currentState.position.height || minHeight}px`,
    zIndex: currentState.zIndex,
  }

  return (
    <div
      ref={panelRef}
      className="draggable-panel"
      style={style}
      onMouseDown={() => {
        // Bring to front on click
        const updated = {
          ...currentState,
          zIndex: Date.now(),
        }
        updatePanel(panelId, updated)
      }}
    >
      <div
        ref={headerRef}
        className="draggable-panel-header"
        onMouseDown={handleMouseDown}
      >
        <div className="draggable-panel-title">
          <GripVertical size={16} className="drag-handle" />
          {icon && <span className="panel-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="draggable-panel-actions">
          <button
            className="panel-action-btn"
            onClick={handleMinimize}
            title={currentState.isMinimized ? 'Restore' : 'Minimize'}
          >
            {currentState.isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
          </button>
          <button
            className="panel-action-btn"
            onClick={handleClose}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      {!currentState.isMinimized && (
        <div className="draggable-panel-content">
          {children}
        </div>
      )}
      {resizable && !currentState.isMinimized && (
        <div
          className="draggable-panel-resizer"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  )
}

export default DraggablePanel

