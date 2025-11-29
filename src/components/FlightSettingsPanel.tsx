import React from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { panelsAtom, togglePanelAtom } from '../store/panelStore'
import DraggablePanel from './DraggablePanel'
import SettingsPanel from './SettingsPanel'
import { Sliders } from 'lucide-react'

const FlightSettingsPanel: React.FC = () => {
  const [panels] = useAtom(panelsAtom)
  const togglePanel = useSetAtom(togglePanelAtom)
  const panel = panels['flight-settings']

  if (!panel || !panel.isOpen) {
    return null
  }

  return (
    <DraggablePanel
      panelId="flight-settings"
      title="Flight Settings"
      icon={<Sliders size={16} />}
      defaultPosition={panel.position}
      minWidth={380}
      minHeight={500}
      resizable={true}
      onClose={() => togglePanel('flight-settings')}
    >
      <div style={{ padding: '0' }}>
        <SettingsPanel />
      </div>
    </DraggablePanel>
  )
}

export default FlightSettingsPanel

