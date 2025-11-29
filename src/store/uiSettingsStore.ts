import { atom } from 'jotai'

export type Theme = 'light' | 'dark'
export type UILayout = 'default' | 'compact' | 'wide' | 'minimal'

export interface UISettings {
  theme: Theme
  layout: UILayout
  showKeyboardShortcuts: boolean
}

const defaultUISettings: UISettings = {
  theme: 'light',
  layout: 'default',
  showKeyboardShortcuts: true,
}

// Load from localStorage
const loadUISettings = (): UISettings => {
  try {
    const stored = localStorage.getItem('waypoint-planner-ui-settings')
    if (stored) {
      return { ...defaultUISettings, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Failed to load UI settings:', error)
  }
  return defaultUISettings
}

// Atom for UI settings
export const uiSettingsAtom = atom<UISettings>(loadUISettings())

// Helper atom to update settings
export const updateUISettingsAtom = atom(
  null,
  (get, set, updates: Partial<UISettings>) => {
    const current = get(uiSettingsAtom)
    const newSettings = { ...current, ...updates }
    set(uiSettingsAtom, newSettings)
    try {
      localStorage.setItem('waypoint-planner-ui-settings', JSON.stringify(newSettings))
    } catch (error) {
      console.error('Failed to save UI settings:', error)
    }
  }
)

// Individual setting atoms for convenience
export const themeAtom = atom(
  (get) => get(uiSettingsAtom).theme,
  (get, set, theme: Theme) => {
    set(updateUISettingsAtom, { theme })
  }
)

export const layoutAtom = atom(
  (get) => get(uiSettingsAtom).layout,
  (get, set, layout: UILayout) => {
    set(updateUISettingsAtom, { layout })
  }
)

