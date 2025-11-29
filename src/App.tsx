import React from 'react'
import { Provider, useAtom } from 'jotai'
import MainLayout from './components/MainLayout'
import WelcomePage from './components/WelcomePage'
import ErrorBoundary from './components/ErrorBoundary'
import { projectLoadedAtom } from './store/flightPlanStore'
import './App.css'

const AppContent: React.FC = () => {
  const [projectLoaded, setProjectLoaded] = useAtom(projectLoadedAtom)

  const handleProjectLoaded = () => {
    setProjectLoaded(true)
  }

  if (!projectLoaded) {
    return <WelcomePage onProjectLoaded={handleProjectLoaded} />
  }

  return <MainLayout />
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

