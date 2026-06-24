import React, { useState, useEffect } from 'react'
import { useAtom } from 'jotai'
import {
  currentFlightPlanAtom,
  droneModelAtom,
  flightSettingsAtom,
  normalizeFlightPlan,
  waypointsAtom,
} from '../store/flightPlanStore'
import { FlightPlan } from '../types'
import { FolderPlus, FolderOpen, HelpCircle, X, Calendar, FileText } from 'lucide-react'
import './WelcomePage.css'

interface Project {
  name: string
  filename: string
  path: string
  modified: Date
  size: number
}

const WelcomePage: React.FC<{ onProjectLoaded: () => void }> = ({ onProjectLoaded }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  
  const [, setFlightPlan] = useAtom(currentFlightPlanAtom)
  const [, setWaypoints] = useAtom(waypointsAtom)
  const [settings, setSettings] = useAtom(flightSettingsAtom)
  const [droneModel, setDroneModel] = useAtom(droneModelAtom)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      if (window.electronAPI) {
        const projectList = await window.electronAPI.listProjects()
        // Convert date strings to Date objects
        const projectsWithDates = projectList.map(project => ({
          ...project,
          modified: project.modified instanceof Date ? project.modified : new Date(project.modified),
        }))
        setProjects(projectsWithDates)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewProject = async () => {
    if (!newProjectName.trim()) {
      setError('Please enter a project name')
      return
    }

    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const newPlan: FlightPlan = {
        id: Date.now().toString(),
        name: newProjectName.trim(),
        droneModel,
        waypoints: [],
        settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await window.electronAPI.createProject(newProjectName.trim(), newPlan)
      
      setFlightPlan(newPlan)
      setWaypoints([])
      setShowNewProjectDialog(false)
      setNewProjectName('')
      setError(null)
      onProjectLoaded()
    } catch (error: any) {
      console.error('Error creating project:', error)
      setError(error.message || 'Failed to create project')
    }
  }

  const handleLoadProject = async (projectPath: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const flightPlan = normalizeFlightPlan(await window.electronAPI.loadProject(projectPath))
      
      setFlightPlan(flightPlan)
      setWaypoints(flightPlan.waypoints || [])
      setSettings(flightPlan.settings)
      setDroneModel(flightPlan.droneModel)
      setError(null)
      onProjectLoaded()
    } catch (error: any) {
      console.error('Error loading project:', error)
      setError(error.message || 'Failed to load project')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <div className="welcome-header">
          <h1 className="welcome-title">Waypoint Planner</h1>
          <p className="welcome-subtitle">DJI Drone Flight Planning Application</p>
        </div>

        <div className="welcome-actions">
          <button
            className="welcome-btn primary"
            onClick={() => setShowNewProjectDialog(true)}
          >
            <FolderPlus size={20} />
            <span>Create New Project</span>
          </button>

          <button
            className="welcome-btn help"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle size={20} />
            <span>Help</span>
          </button>
        </div>

        {error && (
          <div className="welcome-error">
            {error}
            <button onClick={() => setError(null)} className="error-close">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="projects-section">
          <h2 className="projects-title">Recent Projects</h2>
          {loading ? (
            <div className="projects-loading">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="projects-empty">
              <FileText size={48} />
              <p>No projects found</p>
              <p className="projects-empty-hint">Create a new project to get started</p>
            </div>
          ) : (
            <div className="projects-list">
              {projects.map((project) => (
                <div
                  key={project.path}
                  className="project-item"
                  onClick={() => handleLoadProject(project.path)}
                >
                  <div className="project-icon">
                    <FolderOpen size={24} />
                  </div>
                  <div className="project-info">
                    <div className="project-name">{project.name}</div>
                    <div className="project-meta">
                      <Calendar size={14} />
                      <span>{formatDate(project.modified)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showNewProjectDialog && (
          <div className="dialog-overlay" onClick={() => setShowNewProjectDialog(false)}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <h3>Create New Project</h3>
                <button
                  className="dialog-close"
                  onClick={() => {
                    setShowNewProjectDialog(false)
                    setNewProjectName('')
                    setError(null)
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="dialog-body">
                <label className="dialog-label">Project Name</label>
                <input
                  type="text"
                  className="dialog-input"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNewProject()
                    }
                    if (e.key === 'Escape') {
                      setShowNewProjectDialog(false)
                      setNewProjectName('')
                      setError(null)
                    }
                  }}
                  autoFocus
                />
                {error && <div className="dialog-error">{error}</div>}
              </div>
              <div className="dialog-footer">
                <button
                  className="dialog-btn secondary"
                  onClick={() => {
                    setShowNewProjectDialog(false)
                    setNewProjectName('')
                    setError(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className="dialog-btn primary"
                  onClick={handleCreateNewProject}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showHelp && (
          <div className="dialog-overlay" onClick={() => setShowHelp(false)}>
            <div className="dialog-content help-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-header">
                <h3>Help</h3>
                <button
                  className="dialog-close"
                  onClick={() => setShowHelp(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="dialog-body help-content">
                <h4>Getting Started</h4>
                <p>Create a new project to start planning your drone flight missions.</p>
                
                <h4>Projects</h4>
                <p>All projects are saved in your Documents folder under "Waypoint Planner Projects".</p>
                
                <h4>Keyboard Shortcuts</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <kbd>N</kbd>
                    <span>Add new waypoint at map center</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>D</kbd> or <kbd>Delete</kbd>
                    <span>Delete selected waypoint</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Esc</kbd>
                    <span>Deselect waypoint</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>C</kbd>
                    <span>Copy selected waypoint</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>V</kbd>
                    <span>Paste waypoint</span>
                  </div>
                </div>
                
                <h4>Features</h4>
                <ul>
                  <li>Create waypoints by clicking on the map or pressing N</li>
                  <li>Select multiple waypoints for bulk editing</li>
                  <li>Duplicate, copy, and paste waypoints</li>
                  <li>Use drawing tools for automated waypoint generation</li>
                  <li>Configure flight settings and drone model</li>
                  <li>Export flight plans in multiple formats (KMZ, CSV, PDF, DJI FlightHub, Litchi)</li>
                  <li>View battery usage and flight time estimates</li>
                  <li>Get warnings for maximum distance and battery limits</li>
                </ul>
              </div>
              <div className="dialog-footer">
                <button
                  className="dialog-btn primary"
                  onClick={() => setShowHelp(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WelcomePage

