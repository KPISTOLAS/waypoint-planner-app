import React from 'react'
import { useAtom } from 'jotai'
import { toastsAtom, removeToastAtom } from '../store/toastStore'
import { selectedWaypointAtom } from '../store/flightPlanStore'
import Toolbar from './Toolbar'
import MapView from './MapView'
import FlightSettingsPanel from './FlightSettingsPanel'
import WaypointsPanel from './WaypointsPanel'
import PhotogrammetryToolsPanel from './PhotogrammetryToolsPanel'
import WaypointEditorPanel from './WaypointEditorPanel'
import OfflineIndicator from './OfflineIndicator'
import { ToastContainer } from './Toast'
import './MainLayout.css'

const MainLayout: React.FC = () => {
  console.log('MainLayout rendering...')
  const [toasts] = useAtom(toastsAtom)
  const removeToast = useAtom(removeToastAtom)[1]
  const [selectedWaypoint, setSelectedWaypoint] = useAtom(selectedWaypointAtom)

  // Flight plan should already be loaded from WelcomePage
  // No need to auto-create here

  const handleCloseEditor = () => {
    setSelectedWaypoint(null)
  }

  return (
    <div className="main-layout">
      <Toolbar />
      <div className="main-content">
        <div className="map-container">
          <MapView />
        </div>
      </div>
      <FlightSettingsPanel />
      <WaypointsPanel />
      <PhotogrammetryToolsPanel />
      {selectedWaypoint && (
        <WaypointEditorPanel onClose={handleCloseEditor} />
      )}
      <OfflineIndicator />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default MainLayout

