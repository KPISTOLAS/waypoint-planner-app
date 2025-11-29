import { atom } from 'jotai'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
}

export const keyboardShortcutsAtom = atom<KeyboardShortcut[]>([])

export const registerShortcutAtom = atom(
  null,
  (get, set, shortcut: KeyboardShortcut) => {
    const shortcuts = get(keyboardShortcutsAtom)
    set(keyboardShortcutsAtom, [...shortcuts, shortcut])
  }
)

export const unregisterShortcutAtom = atom(
  null,
  (get, set, key: string) => {
    const shortcuts = get(keyboardShortcutsAtom)
    set(keyboardShortcutsAtom, shortcuts.filter(s => s.key !== key))
  }
)

