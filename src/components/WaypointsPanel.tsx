import React from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { panelsAtom, togglePanelAtom } from '../store/panelStore'
import DraggablePanel from './DraggablePanel'
import WaypointPanel from './WaypointPanel'
import { MapPin } from 'lucide-react'

const WaypointsPanel: React.FC = () => {
  const [panels] = useAtom(panelsAtom)
  const togglePanel = useSetAtom(togglePanelAtom)
  const panel = panels['waypoints']

  if (!panel || !panel.isOpen) {
    return null
  }

  return (
    <DraggablePanel
      panelId="waypoints"
      title="Waypoints"
      icon={<MapPin size={16} />}
      defaultPosition={panel.position}
      minWidth={400}
      minHeight={400}
      resizable={true}
      onClose={() => togglePanel('waypoints')}
    >
      <div style={{ padding: '0', height: '100%', overflow: 'auto' }}>
        <WaypointPanel />
      </div>
    </DraggablePanel>
  )
}

export default WaypointsPanel

