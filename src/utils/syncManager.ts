/**
 * Background Sync Manager
 * Handles syncing local data when online
 */

import { dbStorage } from './indexedDBStorage'

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: Date | null
  pendingItems: number
  errors: string[]
}

class SyncManager {
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingItems: 0,
    errors: [],
  }
  private listeners: Set<(status: SyncStatus) => void> = new Set()
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.setupOnlineListener()
    this.startPeriodicSync()
  }

  /**
   * Setup online/offline listeners
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored, starting sync...')
      this.syncStatus.isOnline = true
      this.notifyListeners()
      this.sync()
    })

    window.addEventListener('offline', () => {
      console.log('Connection lost')
      this.syncStatus.isOnline = false
      this.notifyListeners()
    })
  }

  /**
   * Start periodic sync check
   */
  private startPeriodicSync(): void {
    // Check for pending items every 30 seconds
    this.syncInterval = setInterval(async () => {
      if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
        const pending = await dbStorage.getPendingSyncItems()
        if (pending.length > 0) {
          this.sync()
        }
      }
    }, 30000)
  }

  /**
   * Sync pending items
   */
  async sync(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) {
      return
    }

    this.syncStatus.isSyncing = true
    this.syncStatus.errors = []
    this.notifyListeners()

    try {
      const pendingItems = await dbStorage.getPendingSyncItems()
      this.syncStatus.pendingItems = pendingItems.length

      console.log(`Syncing ${pendingItems.length} pending items...`)

      // In a real implementation, this would sync to a cloud service
      // For now, we'll simulate sync by marking items as synced
      for (const item of pendingItems) {
        try {
          // Simulate sync delay
          await new Promise(resolve => setTimeout(resolve, 100))

          // If Electron API is available, sync to file system
          if (window.electronAPI) {
            try {
              await window.electronAPI.updateProject(item.name, item.data)
              await dbStorage.markAsSynced(item.id)
              console.log(`Synced: ${item.name}`)
            } catch (error) {
              console.error(`Failed to sync ${item.name}:`, error)
              this.syncStatus.errors.push(`Failed to sync ${item.name}`)
            }
          } else {
            // In browser, mark as synced (local-only mode)
            await dbStorage.markAsSynced(item.id)
          }
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error)
          this.syncStatus.errors.push(`Error syncing ${item.id}`)
        }
      }

      this.syncStatus.lastSyncTime = new Date()
      this.syncStatus.pendingItems = 0
      console.log('Sync completed')
    } catch (error) {
      console.error('Sync error:', error)
      this.syncStatus.errors.push('Sync failed')
    } finally {
      this.syncStatus.isSyncing = false
      this.notifyListeners()
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener)
    // Immediately call with current status
    listener(this.getStatus())

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const status = this.getStatus()
    this.listeners.forEach(listener => listener(status))
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    await this.sync()
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.listeners.clear()
  }
}

export const syncManager = new SyncManager()

