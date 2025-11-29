import React, { useEffect, useState } from 'react'
import { syncManager, SyncStatus } from '../utils/syncManager'
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import './OfflineIndicator.css'

const OfflineIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus())
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleForceSync = async () => {
    await syncManager.forceSync()
  }

  if (syncStatus.isOnline && !syncStatus.isSyncing && syncStatus.pendingItems === 0) {
    return null // Don't show when everything is synced
  }

  return (
    <div className={`offline-indicator ${!syncStatus.isOnline ? 'offline' : ''}`}>
      <div 
        className="offline-indicator-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="offline-indicator-status">
          {syncStatus.isOnline ? (
            syncStatus.isSyncing ? (
              <RefreshCw size={16} className="spinning" />
            ) : syncStatus.pendingItems > 0 ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )
          ) : (
            <WifiOff size={16} />
          )}
          <span>
            {syncStatus.isOnline
              ? syncStatus.isSyncing
                ? 'Syncing...'
                : syncStatus.pendingItems > 0
                ? `${syncStatus.pendingItems} pending`
                : 'Online'
              : 'Offline'}
          </span>
        </div>
        {syncStatus.pendingItems > 0 && syncStatus.isOnline && !syncStatus.isSyncing && (
          <button
            className="offline-indicator-sync-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleForceSync()
            }}
            title="Sync now"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="offline-indicator-details">
          <div className="offline-indicator-detail">
            <strong>Status:</strong>{' '}
            {syncStatus.isOnline ? (
              <span className="status-online">Online</span>
            ) : (
              <span className="status-offline">Offline</span>
            )}
          </div>
          {syncStatus.lastSyncTime && (
            <div className="offline-indicator-detail">
              <strong>Last sync:</strong>{' '}
              {syncStatus.lastSyncTime.toLocaleTimeString()}
            </div>
          )}
          {syncStatus.pendingItems > 0 && (
            <div className="offline-indicator-detail">
              <strong>Pending items:</strong> {syncStatus.pendingItems}
            </div>
          )}
          {syncStatus.errors.length > 0 && (
            <div className="offline-indicator-errors">
              <strong>Errors:</strong>
              <ul>
                {syncStatus.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default OfflineIndicator

