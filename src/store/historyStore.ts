import { atom } from 'jotai'
import { Waypoint } from '../types'

// Simplified history: only track the last action
// previousState: the state before the last action
// currentState: the current state (after last action)
// isUndone: true if we're currently in an undone state (can redo)
export const historyAtom = atom<{
  previousState: Waypoint[] | null
  currentState: Waypoint[] | null
  isUndone: boolean
}>({
  previousState: null,
  currentState: null,
  isUndone: false,
})

// Helper to deep clone waypoints
const cloneWaypoints = (waypoints: Waypoint[]): Waypoint[] => {
  return JSON.parse(JSON.stringify(waypoints))
}

// Undo atom - restore previous state
export const undoAtom = atom(
  null,
  (get, set) => {
    const history = get(historyAtom)
    if (!history.previousState) return null // Nothing to undo

    // Swap: current becomes previous, previous becomes current
    const restored = history.previousState
    set(historyAtom, {
      previousState: history.currentState, // Current becomes the new previous
      currentState: restored, // Previous becomes the new current
      isUndone: true, // Mark that we're in an undone state
    })

    return cloneWaypoints(restored)
  }
)

// Redo atom - restore the state we just undid
export const redoAtom = atom(
  null,
  (get, set) => {
    const history = get(historyAtom)
    
    // Can only redo if we're in an undone state
    if (!history.isUndone || !history.previousState || !history.currentState) {
      return null // Not in an undone state, can't redo
    }

    // After undo, we swap states. To redo, we swap them back.
    // The state we want to restore is in previousState (which was the current before undo)
    const restored = history.previousState
    set(historyAtom, {
      previousState: history.currentState, // Current becomes previous
      currentState: restored, // Previous becomes current (redo back to latest)
      isUndone: false, // No longer in undone state
    })

    return cloneWaypoints(restored)
  }
)

// Add to history atom - saves current state as the new state, previous becomes old current
export const addToHistoryAtom = atom(
  null,
  (get, set, waypoints: Waypoint[]) => {
    const history = get(historyAtom)
    const newState = cloneWaypoints(waypoints)

    // Only save if the state actually changed
    if (history.currentState && 
        JSON.stringify(history.currentState) === JSON.stringify(newState)) {
      return // No change, don't update history
    }

    // When a new action occurs, save the current state as previous
    // If we were in an undone state, the current state is what we want to save as previous
    set(historyAtom, {
      previousState: history.currentState, // Move current to previous
      currentState: newState, // New state becomes current
      isUndone: false, // New action clears undone state (can't redo after new action)
    })
  }
)

// Check if undo is available
export const canUndoAtom = atom((get) => {
  const history = get(historyAtom)
  return history.previousState !== null
})

// Check if redo is available
export const canRedoAtom = atom((get) => {
  const history = get(historyAtom)
  // Can redo only if we're in an undone state
  return history.isUndone && history.previousState !== null && history.currentState !== null
})

