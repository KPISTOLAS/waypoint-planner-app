import React, { useEffect } from 'react'
import { Provider, useAtom, useSetAtom } from 'jotai'
import MainLayout from './components/MainLayout'
import WelcomePage from './components/WelcomePage'
import ErrorBoundary from './components/ErrorBoundary'
import AppSettings from './components/AppSettings'
import { projectLoadedAtom } from './store/flightPlanStore'
import { themeAtom } from './store/uiSettingsStore'
import { registerShortcutAtom } from './store/keyboardShortcutsStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { initializeLocalStorage } from './utils/storageAdapter'
import { syncManager } from './utils/syncManager'
import './App.css'

const AppContent: React.FC = () => {
  const [projectLoaded, setProjectLoaded] = useAtom(projectLoadedAtom)
  const [theme] = useAtom(themeAtom)
  const registerShortcut = useSetAtom(registerShortcutAtom)
  
  // Initialize offline-first storage
  useEffect(() => {
    initializeLocalStorage().then(() => {
      console.log('Offline-first storage initialized')
      // Start sync if online
      if (navigator.onLine) {
        syncManager.sync()
      }
    })
  }, [])
  
  // Apply theme to body
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : ''
  }, [theme])

  // Register common keyboard shortcuts
  useEffect(() => {
    registerShortcut({
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => {
        // TODO: Show keyboard shortcuts dialog
        console.log('Keyboard shortcuts help')
      },
    })
  }, [registerShortcut])

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  const handleProjectLoaded = () => {
    setProjectLoaded(true)
  }

  if (!projectLoaded) {
    return (
      <>
        <WelcomePage onProjectLoaded={handleProjectLoaded} />
        <AppSettings />
      </>
    )
  }

  return (
    <>
      <MainLayout />
      <AppSettings />
    </>
  )
}

function App() {
  console.log('App component rendering...')
  
  return (
    <ErrorBoundary>
      <Provider>
        <AppContent />
      </Provider>
    </ErrorBoundary>
  )
}

export default App

