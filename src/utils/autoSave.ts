/**
 * Auto-save utility
 * Periodically saves the flight plan to prevent data loss
 */

import { FlightPlan, Waypoint, FlightSettings } from '../types'

export interface AutoSaveConfig {
  enabled: boolean
  interval: number // in milliseconds (default: 30 seconds)
}

const DEFAULT_CONFIG: AutoSaveConfig = {
  enabled: true,
  interval: 30000, // 30 seconds
}

let autoSaveInterval: NodeJS.Timeout | null = null
let currentConfig: AutoSaveConfig = DEFAULT_CONFIG
let saveCallback: (() => Promise<void>) | null = null

/**
 * Initialize auto-save
 */
export const initAutoSave = (
  callback: () => Promise<void>,
  config: Partial<AutoSaveConfig> = {}
) => {
  currentConfig = { ...DEFAULT_CONFIG, ...config }
  saveCallback = callback

  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
  }

  if (currentConfig.enabled) {
    autoSaveInterval = setInterval(async () => {
      if (saveCallback) {
        try {
          await saveCallback()
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }
    }, currentConfig.interval)
  }
}

/**
 * Stop auto-save
 */
export const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
    autoSaveInterval = null
  }
}

/**
 * Update auto-save configuration
 */
export const updateAutoSaveConfig = (config: Partial<AutoSaveConfig>) => {
  currentConfig = { ...currentConfig, ...config }
  
  if (saveCallback) {
    initAutoSave(saveCallback, currentConfig)
  }
}

/**
 * Get current auto-save configuration
 */
export const getAutoSaveConfig = (): AutoSaveConfig => {
  return { ...currentConfig }
}

