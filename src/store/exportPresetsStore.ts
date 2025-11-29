import { atom } from 'jotai'

export interface ExportPreset {
  id: string
  name: string
  format: 'kmz' | 'csv' | 'json' | 'pdf' | 'djifh' | 'litchi'
  options?: Record<string, any>
}

const defaultPresets: ExportPreset[] = [
  { id: 'default-kmz', name: 'Standard KMZ', format: 'kmz' },
  { id: 'default-csv', name: 'Standard CSV', format: 'csv' },
  { id: 'default-json', name: 'Standard JSON', format: 'json' },
]

const loadPresets = (): ExportPreset[] => {
  try {
    const stored = localStorage.getItem('waypoint-planner-export-presets')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load export presets:', error)
  }
  return defaultPresets
}

export const exportPresetsAtom = atom<ExportPreset[]>(loadPresets())

export const addExportPresetAtom = atom(
  null,
  (get, set, preset: Omit<ExportPreset, 'id'>) => {
    const presets = get(exportPresetsAtom)
    const newPreset: ExportPreset = {
      ...preset,
      id: Date.now().toString(),
    }
    const updated = [...presets, newPreset]
    set(exportPresetsAtom, updated)
    try {
      localStorage.setItem('waypoint-planner-export-presets', JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save export presets:', error)
    }
  }
)

export const removeExportPresetAtom = atom(
  null,
  (get, set, id: string) => {
    const presets = get(exportPresetsAtom)
    const updated = presets.filter(p => p.id !== id)
    set(exportPresetsAtom, updated)
    try {
      localStorage.setItem('waypoint-planner-export-presets', JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save export presets:', error)
    }
  }
)

