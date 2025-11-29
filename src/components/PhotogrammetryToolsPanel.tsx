import React from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { panelsAtom, togglePanelAtom } from '../store/panelStore'
import DraggablePanel from './DraggablePanel'
import PhotogrammetryTools from './PhotogrammetryTools'
import { Camera } from 'lucide-react'

const PhotogrammetryToolsPanel: React.FC = () => {
  const [panels] = useAtom(panelsAtom)
  const togglePanel = useSetAtom(togglePanelAtom)
  const panel = panels['photogrammetry-tools']

  if (!panel || !panel.isOpen) {
    return null
  }

  return (
    <DraggablePanel
      panelId="photogrammetry-tools"
      title="Photogrammetry Tools"
      icon={<Camera size={16} />}
      defaultPosition={panel.position}
      minWidth={400}
      minHeight={500}
      resizable={true}
      onClose={() => togglePanel('photogrammetry-tools')}
    >
      <div style={{ padding: '0', height: '100%', overflow: 'auto' }}>
        <PhotogrammetryTools />
      </div>
    </DraggablePanel>
  )
}

export default PhotogrammetryToolsPanel

