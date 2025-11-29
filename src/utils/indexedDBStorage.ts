/**
 * IndexedDB Storage for Local-First Architecture
 * Provides persistent storage that works offline
 */

const DB_NAME = 'waypoint-planner-db'
const DB_VERSION = 1

interface FlightPlanRecord {
  id: string
  name: string
  data: any
  createdAt: Date
  updatedAt: Date
  synced: boolean
  syncPending: boolean
}

interface StorageRecord {
  key: string
  value: any
  updatedAt: Date
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Flight Plans store
        if (!db.objectStoreNames.contains('flightPlans')) {
          const flightPlansStore = db.createObjectStore('flightPlans', { keyPath: 'id' })
          flightPlansStore.createIndex('name', 'name', { unique: false })
          flightPlansStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          flightPlansStore.createIndex('synced', 'synced', { unique: false })
          flightPlansStore.createIndex('syncPending', 'syncPending', { unique: false })
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
          syncQueueStore.createIndex('type', 'type', { unique: false })
          syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  /**
   * Save flight plan locally
   */
  async saveFlightPlan(flightPlan: any): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const record: FlightPlanRecord = {
      id: flightPlan.id || Date.now().toString(),
      name: flightPlan.name,
      data: flightPlan,
      createdAt: flightPlan.createdAt ? new Date(flightPlan.createdAt) : new Date(),
      updatedAt: new Date(),
      synced: false,
      syncPending: true,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flightPlans'], 'readwrite')
      const store = transaction.objectStore('flightPlans')
      const request = store.put(record)

      request.onsuccess = () => {
        console.log('Flight plan saved to IndexedDB:', record.name)
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to save flight plan:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all flight plans
   */
  async getAllFlightPlans(): Promise<FlightPlanRecord[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flightPlans'], 'readonly')
      const store = transaction.objectStore('flightPlans')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Get flight plan by ID
   */
  async getFlightPlan(id: string): Promise<FlightPlanRecord | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flightPlans'], 'readonly')
      const store = transaction.objectStore('flightPlans')
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Delete flight plan
   */
  async deleteFlightPlan(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flightPlans'], 'readwrite')
      const store = transaction.objectStore('flightPlans')
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('Flight plan deleted from IndexedDB:', id)
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Save setting
   */
  async saveSetting(key: string, value: any): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const record: StorageRecord = {
      key,
      value,
      updatedAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      const request = store.put(record)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get setting
   */
  async getSetting(key: string): Promise<any | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly')
      const store = transaction.objectStore('settings')
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Get all pending sync items
   */
  async getPendingSyncItems(): Promise<FlightPlanRecord[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flightPlans'], 'readonly')
      const store = transaction.objectStore('flightPlans')
      const index = store.index('syncPending')
      const request = index.getAll(true)

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  /**
   * Mark flight plan as synced
   */
  async markAsSynced(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flightPlans'], 'readwrite')
      const store = transaction.objectStore('flightPlans')
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (record) {
          record.synced = true
          record.syncPending = false
          const putRequest = store.put(record)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }
}

export const dbStorage = new IndexedDBStorage()

