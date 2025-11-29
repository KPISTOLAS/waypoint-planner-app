/**
 * Storage Adapter - Local-First Storage
 * Provides unified interface for storage that works offline
 */

import { dbStorage } from './indexedDBStorage'
import { FlightPlan } from '../types'

/**
 * Save flight plan (local-first)
 */
export async function saveFlightPlanLocal(flightPlan: FlightPlan): Promise<void> {
  try {
    // Save to IndexedDB first (always works offline)
    await dbStorage.saveFlightPlan(flightPlan)
    
    // If Electron API is available, also save to file system
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateProject(flightPlan.name, flightPlan)
        // Mark as synced if file save succeeds
        await dbStorage.markAsSynced(flightPlan.id)
      } catch (error) {
        console.warn('File system save failed, but saved to local storage:', error)
        // Continue - data is saved locally
      }
    }
  } catch (error) {
    console.error('Failed to save flight plan:', error)
    throw error
  }
}

/**
 * Load all flight plans (from local storage)
 */
export async function loadAllFlightPlansLocal(): Promise<FlightPlan[]> {
  try {
    const records = await dbStorage.getAllFlightPlans()
    return records.map(record => record.data)
  } catch (error) {
    console.error('Failed to load flight plans:', error)
    return []
  }
}

/**
 * Load flight plan by ID (from local storage)
 */
export async function loadFlightPlanLocal(id: string): Promise<FlightPlan | null> {
  try {
    const record = await dbStorage.getFlightPlan(id)
    return record ? record.data : null
  } catch (error) {
    console.error('Failed to load flight plan:', error)
    return null
  }
}

/**
 * Delete flight plan (local-first)
 */
export async function deleteFlightPlanLocal(id: string): Promise<void> {
  try {
    await dbStorage.deleteFlightPlan(id)
    
    // If Electron API is available, also delete from file system
    if (window.electronAPI) {
      try {
        // Note: Electron API would need a delete method
        // For now, we'll just delete from IndexedDB
      } catch (error) {
        console.warn('File system delete failed, but deleted from local storage:', error)
      }
    }
  } catch (error) {
    console.error('Failed to delete flight plan:', error)
    throw error
  }
}

/**
 * Initialize local storage
 */
export async function initializeLocalStorage(): Promise<void> {
  try {
    await dbStorage.init()
    console.log('Local storage initialized')
  } catch (error) {
    console.error('Failed to initialize local storage:', error)
  }
}

