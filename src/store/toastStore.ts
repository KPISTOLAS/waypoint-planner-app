import { atom } from 'jotai'
import { Toast, ToastType } from '../components/Toast'

export const toastsAtom = atom<Toast[]>([])

// Add a toast notification
export const addToastAtom = atom(
  null,
  (get, set, message: string, type: ToastType = 'info', duration?: number) => {
    const toasts = get(toastsAtom)
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    
    const newToast: Toast = {
      id,
      message,
      type,
      duration,
    }
    
    set(toastsAtom, [...toasts, newToast])
  }
)

// Remove a toast notification
export const removeToastAtom = atom(
  null,
  (get, set, id: string) => {
    const toasts = get(toastsAtom)
    set(toastsAtom, toasts.filter((toast) => toast.id !== id))
  }
)

// Helper functions for convenience
export const showSuccessToast = (message: string, duration?: number) => {
  return { type: 'success' as ToastType, message, duration }
}

export const showErrorToast = (message: string, duration?: number) => {
  return { type: 'error' as ToastType, message, duration }
}

export const showInfoToast = (message: string, duration?: number) => {
  return { type: 'info' as ToastType, message, duration }
}

export const showWarningToast = (message: string, duration?: number) => {
  return { type: 'warning' as ToastType, message, duration }
}

