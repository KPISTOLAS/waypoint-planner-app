import React from 'react'
import { useAtom } from 'jotai'
import { toastsAtom, removeToastAtom } from '../store/toastStore'
import Toolbar from './Toolbar'
import MapView from './MapView'
import WaypointPanel from './WaypointPanel'
import SettingsPanel from './SettingsPanel'
import { ToastContainer } from './Toast'
import './MainLayout.css'

const MainLayout: React.FC = () => {
  console.log('MainLayout rendering...')
  const [toasts] = useAtom(toastsAtom)
  const removeToast = useAtom(removeToastAtom)[1]

  // Flight plan should already be loaded from WelcomePage
  // No need to auto-create here

  return (
    <div className="main-layout">
      <Toolbar />
      <div className="main-content">
        <div className="left-panel">
          <SettingsPanel />
          <WaypointPanel />
        </div>
        <div className="map-container">
          <MapView />
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

export default MainLayout

