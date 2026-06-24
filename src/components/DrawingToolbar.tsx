import React from 'react'
import { useAtom } from 'jotai'
import { Square, Hexagon, MousePointer2, ChevronDown, ChevronUp, Circle } from 'lucide-react'
import { DrawingMode, drawingToolbarVisibleAtom } from '../store/drawingModeStore'
import './DrawingToolbar.css'

interface DrawingToolbarProps {
  mode: DrawingMode
  onModeChange: (mode: DrawingMode) => void
}

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({ mode, onModeChange }) => {
  const [isVisible, setIsVisible] = useAtom(drawingToolbarVisibleAtom)

  const handleModeChange = (newMode: DrawingMode) => {
    onModeChange(newMode)
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  return (
    <div className={`drawing-toolbar ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="drawing-toolbar-header">
        <div className="drawing-toolbar-title">Drawing Tools</div>
        <button
          className="drawing-toolbar-toggle"
          onClick={toggleVisibility}
          title={isVisible ? 'Hide Drawing Tools' : 'Show Drawing Tools'}
        >
          {isVisible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {isVisible && (
        <div className="drawing-toolbar-buttons">
          <button
            className={`drawing-btn cursor-btn ${mode === 'cursor' ? 'active' : ''}`}
            onClick={() => handleModeChange('cursor')}
            title="Cursor Mode (Navigate map, no waypoint creation)"
          >
            <MousePointer2 size={18} />
            <span>Cursor</span>
          </button>
          <button
            className={`drawing-btn ${mode === 'none' ? 'active' : ''}`}
            onClick={() => handleModeChange('none')}
            title="Waypoints Mode (Click to add waypoints)"
          >
            <MousePointer2 size={18} />
            <span>Waypoints</span>
          </button>
          <button
            className={`drawing-btn ${mode === 'rectangle' ? 'active' : ''}`}
            onClick={() => handleModeChange('rectangle')}
            title="Draw Rectangle"
          >
            <Square size={18} />
            <span>Rectangle</span>
          </button>
          <button
            className={`drawing-btn ${mode === 'polygon' ? 'active' : ''}`}
            onClick={() => handleModeChange('polygon')}
            title="Draw Polygon"
          >
            <Hexagon size={18} />
            <span>Polygon</span>
          </button>
          <button
            className={`drawing-btn ${mode === 'poi' ? 'active' : ''}`}
            onClick={() => handleModeChange('poi')}
            title="Point Of Interest (POI) - Draw circle, waypoints on perimeter facing center"
          >
            <Circle size={18} />
            <span>POI</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default DrawingToolbar

