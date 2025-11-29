import { atom } from 'jotai'

export interface PanelPosition {
  x: number
  y: number
  width?: number
  height?: number
}

export interface PanelState {
  id: string
  isOpen: boolean
  isMinimized: boolean
  position: PanelPosition
  zIndex: number
}

const getDefaultPanels = (): Record<string, PanelState> => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080
  
  return {
    'flight-settings': {
      id: 'flight-settings',
      isOpen: false,
      isMinimized: false,
      position: { x: 20, y: 80, width: 380, height: 500 },
      zIndex: 1000,
    },
    'waypoints': {
      id: 'waypoints',
      isOpen: false,
      isMinimized: false,
      position: { x: 20, y: 80, width: 400, height: 600 },
      zIndex: 1001,
    },
    'drawing-tools': {
      id: 'drawing-tools',
      isOpen: true,
      isMinimized: false,
      position: { x: width - 220, y: 80 },
      zIndex: 2000,
    },
    'measurement-tools': {
      id: 'measurement-tools',
      isOpen: true,
      isMinimized: false,
      position: { x: 20, y: height - 200 },
      zIndex: 1000,
    },
    'photogrammetry-tools': {
      id: 'photogrammetry-tools',
      isOpen: false,
      isMinimized: false,
      position: { x: 420, y: 80, width: 450, height: 600 },
      zIndex: 1002,
    },
  }
}

const loadPanels = (): Record<string, PanelState> => {
  try {
    const stored = localStorage.getItem('waypoint-planner-panels')
    if (stored) {
      const parsed = JSON.parse(stored)
      const defaults = getDefaultPanels()
      // Merge stored panels with defaults, preserving stored positions
      const merged: Record<string, PanelState> = { ...defaults }
      for (const [key, value] of Object.entries(parsed)) {
        if (defaults[key] && typeof value === 'object' && value !== null) {
          merged[key] = { ...defaults[key], ...(value as Partial<PanelState>) }
        }
      }
      return merged
    }
  } catch (error) {
    console.error('Failed to load panel states:', error)
  }
  return getDefaultPanels()
}

export const panelsAtom = atom<Record<string, PanelState>>(loadPanels())

export const updatePanelAtom = atom(
  null,
  (get, set, panelId: string, updates: Partial<PanelState>) => {
    const panels = get(panelsAtom)
    const defaults = getDefaultPanels()
    const currentPanel = panels[panelId] || defaults[panelId]
    if (!currentPanel) {
      // Create new panel if it doesn't exist
      const newPanel: PanelState = {
        id: panelId,
        isOpen: true,
        isMinimized: false,
        position: { x: 100, y: 100, width: 400, height: 500 },
        zIndex: 1000,
        ...updates,
      }
      const updatedPanels = { ...panels, [panelId]: newPanel }
      set(panelsAtom, updatedPanels)
      try {
        localStorage.setItem('waypoint-planner-panels', JSON.stringify(updatedPanels))
      } catch (error) {
        console.error('Failed to save panel states:', error)
      }
      return
    }

    const updatedPanel = { ...currentPanel, ...updates }
    const updatedPanels = { ...panels, [panelId]: updatedPanel }
    set(panelsAtom, updatedPanels)
    
    try {
      localStorage.setItem('waypoint-planner-panels', JSON.stringify(updatedPanels))
    } catch (error) {
      console.error('Failed to save panel states:', error)
    }
  }
)

export const togglePanelAtom = atom(
  null,
  (get, set, panelId: string) => {
    const panels = get(panelsAtom)
    const panel = panels[panelId]
    if (!panel) return
    
    set(updatePanelAtom, panelId, { isOpen: !panel.isOpen })
  }
)

export const getPanelAtom = (panelId: string) => atom(
  (get) => {
    const panels = get(panelsAtom)
    const defaults = getDefaultPanels()
    return panels[panelId] || defaults[panelId]
  }
)

