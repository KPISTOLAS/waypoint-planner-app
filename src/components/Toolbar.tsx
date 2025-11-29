import React, { useState, useCallback, useEffect } from 'react'
import { useAtom, useSetAtom } from 'jotai'
import { currentFlightPlanAtom, waypointsAtom, flightSettingsAtom, droneModelAtom } from '../store/flightPlanStore'
import { addToastAtom } from '../store/toastStore'
import { exportPresetsAtom } from '../store/exportPresetsStore'
import { panelsAtom, togglePanelAtom } from '../store/panelStore'
import { FlightPlan } from '../types'
import { exportToKMZ, importFromKMZ, parseKMLPolygon, parseWGS84, generateWaypointsFromPolygonCoords } from '../utils/kmzHandler'
import { splitMission, getRecommendedSplit } from '../utils/missionSplitter'
import { calculateFlightPath } from '../utils/flightPathCalculator'
import { estimateBatteryUsage, calculateMaxSafeDistance } from '../utils/batteryCalculator'
import { exportToCSV, exportToDJIFlightHub, exportToLitchi, generatePDFReport } from '../utils/exportFormats'
import { initAutoSave, stopAutoSave } from '../utils/autoSave'
import JSZip from 'jszip'
import { Save, FolderOpen, Download, Upload, Trash2, Scissors, HelpCircle, FileText, FileSpreadsheet, FileJson, Battery, Clock, AlertTriangle, Printer, Bookmark, Sliders, MapPin, Camera } from 'lucide-react'
import './Toolbar.css'

const Toolbar: React.FC = () => {
  const [flightPlan, setFlightPlan] = useAtom(currentFlightPlanAtom)
  const [waypoints, setWaypoints] = useAtom(waypointsAtom)
  const [settings] = useAtom(flightSettingsAtom)
  const [droneModel] = useAtom(droneModelAtom)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [waypointsPerMission, setWaypointsPerMission] = useState(50)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showFlightStats, setShowFlightStats] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [exportPresets] = useAtom(exportPresetsAtom)
  const [panels] = useAtom(panelsAtom)
  const togglePanel = useSetAtom(togglePanelAtom)
  const exportMenuRef = React.useRef<HTMLDivElement>(null)
  const statsMenuRef = React.useRef<HTMLDivElement>(null)
  const addToast = useSetAtom(addToastAtom)

  // Close menus when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close if clicking inside the menu containers
      if (exportMenuRef.current?.contains(target) || statsMenuRef.current?.contains(target)) {
        return
      }
      setShowExportMenu(false)
      setShowFlightStats(false)
    }
    if (showExportMenu || showFlightStats) {
      // Use a small delay to allow button click to process first
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu, showFlightStats])

  // Flight plan should already be loaded from WelcomePage
  // Note: We don't auto-update the flight plan on every change to avoid infinite loops
  // The flight plan is updated when explicitly saved (Ctrl+S or Save button)

  const handleSave = useCallback(async () => {
    if (!flightPlan) {
      addToast('No flight plan to save. Please create or load a project first.', 'warning')
      return
    }
    
    const planToSave = {
      ...flightPlan,
      waypoints,
      settings,
      updatedAt: new Date(),
    }
    
    if (window.electronAPI) {
      try {
        // Try to update existing project first
        await window.electronAPI.updateProject(flightPlan.name, planToSave)
        setFlightPlan({ ...planToSave, updatedAt: new Date() })
        console.log('Project saved successfully')
        // Show success message
        addToast(`Project "${flightPlan.name}" saved successfully!`, 'success')
      } catch (error: any) {
        console.error('Update project error:', error)
        // If update fails, try to create new project
        try {
          await window.electronAPI.createProject(flightPlan.name, planToSave)
          setFlightPlan({ ...planToSave, updatedAt: new Date() })
          console.log('Project created successfully')
          addToast(`Project "${flightPlan.name}" created successfully!`, 'success')
        } catch (createError: any) {
          console.error('Failed to save project:', createError)
          const errorMessage = createError?.message || 'Unknown error occurred'
          addToast(`Failed to save project: ${errorMessage}`, 'error')
        }
      }
    } else {
      // Fallback for browser
      const data = JSON.stringify(planToSave, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${flightPlan.name}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast(`Project "${flightPlan.name}" downloaded!`, 'success')
    }
  }, [flightPlan, waypoints, settings, setFlightPlan, addToast])

  // Keyboard shortcut: Ctrl+S to save
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Ctrl+S or Cmd+S - Save project
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (flightPlan) {
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flightPlan, handleSave])

  // Auto-save setup
  useEffect(() => {
    if (flightPlan) {
      // Initialize auto-save with handleSave callback
      initAutoSave(handleSave, { enabled: true, interval: 30000 }) // 30 seconds
      
      return () => {
        stopAutoSave()
      }
    }
  }, [flightPlan, handleSave])

  // Drag and drop file import
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return

      const file = files[0]
      const fileName = file.name.toLowerCase()

      try {
        if (fileName.endsWith('.json')) {
          const text = await file.text()
          const data = JSON.parse(text)
          if (data.waypoints && data.settings) {
            setWaypoints(data.waypoints)
            setFlightPlan(data)
            addToast(`Flight plan "${data.name || 'Untitled'}" loaded from ${file.name}`, 'success')
          }
        } else if (fileName.endsWith('.kmz') || fileName.endsWith('.kml')) {
          await handleImportFile(file)
        } else if (fileName.endsWith('.txt') || fileName.endsWith('.wgs84')) {
          await handleImportFile(file)
        } else {
          addToast('Unsupported file type. Please use JSON, KMZ, KML, or WGS84 files.', 'error')
        }
      } catch (error) {
        console.error('Error importing file:', error)
        addToast('Failed to import file. Please check the file format.', 'error')
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [setWaypoints, setFlightPlan, addToast])

  const handleImportFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.split('.').pop() || ''
    
    try {
      if (fileExtension === 'kmz') {
        const kmzData = await importFromKMZ(file)
        if (kmzData.waypoints.length > 0) {
          const newPlan: FlightPlan = {
            id: Date.now().toString(),
            name: kmzData.name || 'Imported Flight Plan',
            droneModel,
            waypoints: kmzData.waypoints,
            settings,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          setFlightPlan(newPlan)
          setWaypoints(kmzData.waypoints)
          addToast(`Successfully imported ${kmzData.waypoints.length} waypoints from KMZ file.`, 'success')
        } else {
          addToast('KMZ file contains no waypoints.', 'warning')
        }
      } else if (fileExtension === 'kml') {
        const content = await file.text()
        const polygonData = parseKMLPolygon(content)
        
        if (polygonData.coordinates.length >= 3) {
          const generatedWaypoints = generateWaypointsFromPolygonCoords(polygonData.coordinates, settings)
          
          if (generatedWaypoints.length > 0) {
            const newPlan: FlightPlan = {
              id: Date.now().toString(),
              name: polygonData.name || 'Imported Polygon Plan',
              droneModel,
              waypoints: generatedWaypoints,
              settings,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            setFlightPlan(newPlan)
            setWaypoints(generatedWaypoints)
            addToast(`Successfully created polygon plan with ${generatedWaypoints.length} waypoints from KML file.`, 'success')
          } else {
            addToast('Failed to generate waypoints from polygon.', 'error')
          }
        } else {
          addToast('KML file does not contain a valid polygon (needs at least 3 coordinates).', 'warning')
        }
      } else if (fileExtension === 'wgs84' || fileExtension === 'txt') {
        const content = await file.text()
        const wgs84Data = parseWGS84(content)
        
        if (wgs84Data.coordinates.length >= 3) {
          const generatedWaypoints = generateWaypointsFromPolygonCoords(wgs84Data.coordinates, settings)
          
          if (generatedWaypoints.length > 0) {
            const newPlan: FlightPlan = {
              id: Date.now().toString(),
              name: wgs84Data.name || 'Imported WGS84 Plan',
              droneModel,
              waypoints: generatedWaypoints,
              settings,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            setFlightPlan(newPlan)
            setWaypoints(generatedWaypoints)
            addToast(`Successfully created polygon plan with ${generatedWaypoints.length} waypoints from WGS84 file.`, 'success')
          } else {
            addToast('Failed to generate waypoints from coordinates.', 'error')
          }
        } else {
          addToast('WGS84 file must contain at least 3 coordinate pairs.', 'warning')
        }
      } else if (fileExtension === 'json') {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.waypoints && data.settings) {
          setFlightPlan(data)
          setWaypoints(data.waypoints)
          addToast(`Flight plan "${data.name || 'Untitled'}" loaded from ${file.name}`, 'success')
        }
      } else {
        addToast('Unsupported file type. Please use JSON, KMZ, KML, or WGS84 files.', 'error')
      }
    } catch (error) {
      console.error('Error importing file:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addToast(`Failed to import file: ${errorMessage}`, 'error')
    }
  }

  const handlePrint = () => {
    if (!flightPlan || waypoints.length === 0) {
      addToast('No flight plan to print. Please create or load a project first.', 'warning')
      return
    }

    // Generate print-friendly HTML
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      addToast('Please allow popups to print the flight plan.', 'warning')
      return
    }

    const flightPath = calculateFlightPath(waypoints, settings)
    const batteryEstimate = estimateBatteryUsage(waypoints, settings, droneModel)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Flight Plan - ${flightPlan.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .stats { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>${flightPlan.name}</h1>
          <div class="stats">
            <h2>Flight Statistics</h2>
            <p><strong>Total Waypoints:</strong> ${waypoints.length}</p>
            <p><strong>Total Distance:</strong> ${(flightPath.totalDistance / 1000).toFixed(2)} km</p>
            <p><strong>Estimated Flight Time:</strong> ${flightPath.estimatedTime.toFixed(1)} minutes</p>
            <p><strong>Battery Usage:</strong> ${batteryEstimate.batteryUsage.toFixed(1)}%</p>
            <p><strong>Drone Model:</strong> ${droneModel}</p>
          </div>
          <h2>Waypoints</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Altitude (m)</th>
                <th>Speed (m/s)</th>
                <th>Gimbal (°)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${waypoints.map((wp, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${wp.latitude.toFixed(6)}</td>
                  <td>${wp.longitude.toFixed(6)}</td>
                  <td>${wp.altitude}</td>
                  <td>${wp.speed || settings.speed}</td>
                  <td>${wp.gimbalPitch || settings.gimbalAngle}</td>
                  <td>${wp.actions?.map(a => a.type).join(', ') || 'None'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleOpen = async () => {
    try {
      let result: { path: string; content: string; isBinary?: boolean } | null = null
      let file: File | null = null

      if (window.electronAPI) {
        // Use Electron file dialog
        result = await window.electronAPI.openFile()
        if (result && result.isBinary) {
          // Convert base64 back to binary and create File object
          const binaryString = atob(result.content)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: 'application/vnd.google-earth.kmz' })
          file = new File([blob], result.path.split(/[/\\]/).pop() || 'file.kmz', { type: 'application/vnd.google-earth.kmz' })
        }
      } else {
        // Fallback for browser - use file input
        result = await new Promise<{ path: string; content: string } | null>((resolve) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.json,.kmz'
          input.onchange = async (e) => {
            const selectedFile = (e.target as HTMLInputElement).files?.[0]
            if (selectedFile) {
              file = selectedFile
              try {
                if (selectedFile.name.toLowerCase().endsWith('.kmz')) {
                  // For KMZ, we'll use the File object directly
                  resolve({ path: selectedFile.name, content: '' })
                } else {
                  // For JSON, read as text
                  const content = await selectedFile.text()
                  resolve({ path: selectedFile.name, content })
                }
              } catch (error) {
                console.error('Failed to read file:', error)
                addToast('Failed to read file. Please try again.', 'error')
                resolve(null)
              }
            } else {
              resolve(null)
            }
          }
          input.oncancel = () => resolve(null)
          input.click()
        })
      }

      if (!result) {
        return // User cancelled
      }

      const filePath = result.path.toLowerCase()
      
      // Check if it's a KMZ file
      if (filePath.endsWith('.kmz')) {
        try {
          if (!file) {
            throw new Error('File object not available for KMZ import')
          }
          
          const kmzData = await importFromKMZ(file)
          
          if (kmzData.waypoints.length > 0) {
            const newPlan: FlightPlan = {
              id: Date.now().toString(),
              name: kmzData.name || 'Imported Flight Plan',
              droneModel: droneModel,
              waypoints: kmzData.waypoints,
              settings: settings,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            setFlightPlan(newPlan)
            setWaypoints(kmzData.waypoints)
            addToast(`Successfully imported ${kmzData.waypoints.length} waypoints from KMZ file.`, 'success')
          } else {
            addToast('KMZ file contains no waypoints.', 'warning')
          }
        } catch (error) {
          console.error('Failed to import KMZ:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          addToast(`Failed to import KMZ file: ${errorMessage}`, 'error')
        }
      } else {
        // JSON file
        try {
          if (!result.content) {
            throw new Error('File content is empty')
          }
          
          const plan = JSON.parse(result.content) as FlightPlan
          
          // Validate the plan structure
          if (!plan.waypoints || !Array.isArray(plan.waypoints)) {
            throw new Error('Invalid flight plan format: missing waypoints array')
          }
          
          setFlightPlan(plan)
          setWaypoints(plan.waypoints || [])
          
          addToast(`Successfully loaded flight plan "${plan.name}" with ${plan.waypoints.length} waypoints.`, 'success')
        } catch (error) {
          console.error('Failed to parse file:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          addToast(`Failed to open file: ${errorMessage}`, 'error')
        }
      }
    } catch (error) {
      console.error('Error opening file:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addToast(`An error occurred while opening the file: ${errorMessage}`, 'error')
    }
  }

  // Calculate flight statistics
  const flightStats = React.useMemo(() => {
    if (waypoints.length < 2) {
      return null
    }
    const path = calculateFlightPath(waypoints, settings)
    const battery = estimateBatteryUsage(waypoints, settings, droneModel)
    const maxDistance = calculateMaxSafeDistance(settings, droneModel)
    
    return {
      ...path,
      battery,
      maxDistance,
      warnings: [] as string[],
    }
  }, [waypoints, settings, droneModel])

  // Warnings are calculated in flightStats and displayed in the UI

  const handleExportCSV = () => {
    if (!flightPlan || waypoints.length === 0) return
    
    const csv = exportToCSV(waypoints)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flightPlan.name}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    if (!flightPlan || waypoints.length === 0) return
    
    const battery = estimateBatteryUsage(waypoints, settings, droneModel)
    const path = calculateFlightPath(waypoints, settings)
    const html = generatePDFReport(flightPlan, battery, path)
    
    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      // Wait a bit then trigger print dialog
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const handleExportDJIFlightHub = () => {
    if (!flightPlan || waypoints.length === 0) return
    
    const data = exportToDJIFlightHub(flightPlan)
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flightPlan.name}_flightHub.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportLitchi = () => {
    if (!flightPlan || waypoints.length === 0) return
    
    const csv = exportToLitchi(waypoints, settings)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flightPlan.name}_litchi.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportKMZ = async () => {
    // Ensure flight plan exists (should be auto-created, but just in case)
    const planToUse = flightPlan || {
      id: Date.now().toString(),
      name: 'New Flight Plan',
      droneModel,
      waypoints: [],
      settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    // Check for waypoints
    if (waypoints.length === 0) {
      addToast('Please add at least one waypoint before exporting to KMZ.', 'warning')
      return
    }
    
    try {
      const kmzBlob = await exportToKMZ({
        ...planToUse,
        waypoints,
        settings,
        updatedAt: new Date(),
      })
      
      // Use browser download method (works in both Electron and browser)
      const url = URL.createObjectURL(kmzBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${planToUse.name}.kmz`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log('KMZ file exported successfully:', `${planToUse.name}.kmz`)
      addToast(`KMZ file "${planToUse.name}.kmz" exported successfully!`, 'success')
    } catch (error) {
      console.error('Failed to export KMZ:', error)
      addToast('Failed to export KMZ file. Please check the console for details.', 'error')
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.kmz,.kml,.wgs84,.txt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      const fileName = file.name.toLowerCase()
      const fileExtension = fileName.split('.').pop() || ''
      
      try {
        if (fileExtension === 'kmz') {
          // Import KMZ - show the plan
          const kmzData = await importFromKMZ(file)
          if (kmzData.waypoints.length > 0) {
            const newPlan: FlightPlan = {
              id: Date.now().toString(),
              name: kmzData.name || 'Imported Flight Plan',
              droneModel,
              waypoints: kmzData.waypoints,
              settings,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            setFlightPlan(newPlan)
            setWaypoints(kmzData.waypoints)
            addToast(`Successfully imported ${kmzData.waypoints.length} waypoints from KMZ file.`, 'success')
          } else {
            addToast('KMZ file contains no waypoints.', 'warning')
          }
        } else if (fileExtension === 'kml') {
          // Import KML - create polygon plan
          const content = await file.text()
          const polygonData = parseKMLPolygon(content)
          
          if (polygonData.coordinates.length >= 3) {
            // Generate waypoints from polygon
            const generatedWaypoints = generateWaypointsFromPolygonCoords(polygonData.coordinates, settings)
            
            if (generatedWaypoints.length > 0) {
              const newPlan: FlightPlan = {
                id: Date.now().toString(),
                name: polygonData.name || 'Imported Polygon Plan',
                droneModel,
                waypoints: generatedWaypoints,
                settings,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
              setFlightPlan(newPlan)
              setWaypoints(generatedWaypoints)
              addToast(`Successfully created polygon plan with ${generatedWaypoints.length} waypoints from KML file.`, 'success')
            } else {
              addToast('Failed to generate waypoints from polygon.', 'error')
            }
          } else {
            addToast('KML file does not contain a valid polygon (needs at least 3 coordinates).', 'warning')
          }
        } else if (fileExtension === 'wgs84' || fileExtension === 'txt') {
          // Import WGS84 - create polygon plan
          const content = await file.text()
          const wgs84Data = parseWGS84(content)
          
          if (wgs84Data.coordinates.length >= 3) {
            // Generate waypoints from polygon
            const generatedWaypoints = generateWaypointsFromPolygonCoords(wgs84Data.coordinates, settings)
            
            if (generatedWaypoints.length > 0) {
              const newPlan: FlightPlan = {
                id: Date.now().toString(),
                name: wgs84Data.name || 'Imported WGS84 Plan',
                droneModel,
                waypoints: generatedWaypoints,
                settings,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
              setFlightPlan(newPlan)
              setWaypoints(generatedWaypoints)
              addToast(`Successfully created polygon plan with ${generatedWaypoints.length} waypoints from WGS84 file.`, 'success')
            } else {
              addToast('Failed to generate waypoints from coordinates.', 'error')
            }
          } else {
            addToast('WGS84 file must contain at least 3 coordinate pairs.', 'warning')
          }
        } else {
          addToast('Unsupported file type. Please select a KMZ, KML, or WGS84 file.', 'warning')
        }
      } catch (error) {
        console.error('Failed to import file:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        addToast(`Failed to import file: ${errorMessage}`, 'error')
      }
    }
    input.click()
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all waypoints?')) {
      setWaypoints([])
    }
  }

  const handleHelp = () => {
    const helpUrl = 'https://kpistolas.github.io/Waypoint-PlannerWeb/guide.html'
    if (window.electronAPI) {
      // Use Electron's shell.openExternal if available
      window.electronAPI.openExternal?.(helpUrl).catch(() => {
        // Fallback to window.open if openExternal fails
        window.open(helpUrl, '_blank')
      })
    } else {
      // Browser fallback
      window.open(helpUrl, '_blank')
    }
  }

  const handleSplitMission = () => {
    if (!flightPlan || waypoints.length === 0) {
      addToast('Please create a flight plan with waypoints before splitting.', 'warning')
      return
    }

    const recommended = getRecommendedSplit(waypoints.length)
    if (waypoints.length <= recommended) {
      addToast(`This mission only has ${waypoints.length} waypoints. Recommended split size is ${recommended}. No need to split.`, 'info')
      return
    }

    // Set recommended value when opening dialog
    setWaypointsPerMission(recommended)
    setShowSplitDialog(true)
  }

  const handleConfirmSplit = async () => {
    if (!flightPlan) return

    const recommended = getRecommendedSplit(waypoints.length)
    const splitOptions = {
      waypointsPerMission: waypointsPerMission || recommended,
      baseName: flightPlan.name,
    }

    const result = splitMission(
      {
        ...flightPlan,
        waypoints,
        settings,
        updatedAt: new Date(),
      },
      splitOptions
    )

    try {
      // Create a zip file containing all split missions
      const zip = new JSZip()
      
      // Export all split missions as KMZ files and add them to the zip
      for (const mission of result.missions) {
        try {
          const kmzBlob = await exportToKMZ(mission)
          // Sanitize filename by removing invalid characters
          const sanitizedName = mission.name.replace(/[<>:"/\\|?*]/g, '_')
          zip.file(`${sanitizedName}.kmz`, kmzBlob)
        } catch (error) {
          console.error(`Failed to export mission "${mission.name}":`, error)
          throw error
        }
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Download the zip file
      const sanitizedBaseName = flightPlan.name.replace(/[<>:"/\\|?*]/g, '_')
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sanitizedBaseName}_split_${result.totalMissions}_parts.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast(`Mission split into ${result.totalMissions} parts. All files have been packaged in a zip file.`, 'success')
      setShowSplitDialog(false)
    } catch (error) {
      console.error('Failed to create zip file:', error)
      addToast('Failed to create zip file. Please check the console for details.', 'error')
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">Waypoint Planner</h1>
        <div className="toolbar-separator"></div>
        <button
          className={`toolbar-btn ${panels['flight-settings']?.isOpen ? 'active' : ''}`}
          onClick={() => togglePanel('flight-settings')}
          title="Toggle Flight Settings Panel"
        >
          <Sliders size={18} />
          <span>Settings</span>
        </button>
        <button
          className={`toolbar-btn ${panels['waypoints']?.isOpen ? 'active' : ''}`}
          onClick={() => togglePanel('waypoints')}
          title="Toggle Waypoints Panel"
        >
          <MapPin size={18} />
          <span>Waypoints</span>
        </button>
        <button
          className={`toolbar-btn ${panels['photogrammetry-tools']?.isOpen ? 'active' : ''}`}
          onClick={() => togglePanel('photogrammetry-tools')}
          title="Toggle Photogrammetry Tools Panel"
        >
          <Camera size={18} />
          <span>Photogrammetry</span>
        </button>
      </div>
      <div className="toolbar-right">
        <button className="toolbar-btn" onClick={handleOpen} title="Open Flight Plan">
          <FolderOpen size={18} />
          <span>Open</span>
        </button>
        <button 
          className="toolbar-btn" 
          onClick={handleSave} 
          disabled={!flightPlan}
          title="Save Flight Plan"
        >
          <Save size={18} />
          <span>Save</span>
        </button>
        <button 
          className="toolbar-btn" 
          onClick={handleImport}
          title="Import KMZ, KML, or WGS84 files"
        >
          <Upload size={18} />
          <span>Import</span>
        </button>
        <div style={{ position: 'relative', zIndex: 10000 }} ref={exportMenuRef}>
          <button 
            className="toolbar-btn" 
            onClick={(e) => {
              e.stopPropagation()
              setShowExportMenu(!showExportMenu)
              setShowFlightStats(false) // Close stats menu when opening export
            }}
            disabled={!flightPlan || waypoints.length === 0}
            title="Export Flight Plan"
          >
            <Download size={18} />
            <span>Export</span>
          </button>
          {showExportMenu && (
            <div className="export-menu" onClick={(e) => e.stopPropagation()}>
              <div className="export-menu-section">
                <div className="export-menu-header">Standard Exports</div>
                <button className="export-menu-item" onClick={() => { handleExportKMZ(); setShowExportMenu(false); }}>
                  <Download size={16} />
                  <span>Export KMZ</span>
                </button>
                <button className="export-menu-item" onClick={() => { handleExportCSV(); setShowExportMenu(false); }}>
                  <FileSpreadsheet size={16} />
                  <span>Export CSV</span>
                </button>
                <button className="export-menu-item" onClick={() => { handleExportPDF(); setShowExportMenu(false); }}>
                  <FileText size={16} />
                  <span>Export PDF Report</span>
                </button>
                <button className="export-menu-item" onClick={() => { handleExportDJIFlightHub(); setShowExportMenu(false); }}>
                  <FileJson size={16} />
                  <span>Export DJI FlightHub</span>
                </button>
                <button className="export-menu-item" onClick={() => { handleExportLitchi(); setShowExportMenu(false); }}>
                  <FileSpreadsheet size={16} />
                  <span>Export Litchi CSV</span>
                </button>
              </div>
              {exportPresets.length > 3 && (
                <div className="export-menu-section">
                  <div className="export-menu-header">Saved Presets</div>
                  {exportPresets.slice(3).map((preset) => (
                    <button
                      key={preset.id}
                      className="export-menu-item"
                      onClick={() => {
                        if (preset.format === 'kmz') handleExportKMZ()
                        else if (preset.format === 'csv') handleExportCSV()
                        else if (preset.format === 'pdf') handleExportPDF()
                        else if (preset.format === 'djifh') handleExportDJIFlightHub()
                        else if (preset.format === 'litchi') handleExportLitchi()
                        setShowExportMenu(false)
                      }}
                    >
                      <Bookmark size={16} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {flightStats && (
          <div style={{ position: 'relative', zIndex: 10000 }} ref={statsMenuRef}>
            <button
              className="toolbar-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowFlightStats(!showFlightStats)
                setShowExportMenu(false) // Close export menu when opening stats
              }}
              title="Flight Statistics"
            >
              <Battery size={18} />
              <span>Stats</span>
            </button>
            {showFlightStats && (
              <div className="flight-stats-menu" onClick={(e) => e.stopPropagation()}>
                <div className="stats-item">
                  <Clock size={16} />
                  <div>
                    <div className="stats-label">Flight Time</div>
                    <div className="stats-value">{(flightStats.estimatedTime / 60).toFixed(1)} min</div>
                  </div>
                </div>
                <div className="stats-item">
                  <Battery size={16} />
                  <div>
                    <div className="stats-label">Battery Usage</div>
                    <div className="stats-value">{flightStats.battery.batteryUsage.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="stats-item">
                  <span style={{ width: '16px' }}>📏</span>
                  <div>
                    <div className="stats-label">Total Distance</div>
                    <div className="stats-value">{(flightStats.totalDistance / 1000).toFixed(2)} km</div>
                  </div>
                </div>
                {flightStats.battery.warnings.length > 0 && (
                  <div className="stats-warnings">
                    <AlertTriangle size={16} />
                    <div>
                      {flightStats.battery.warnings.map((w, i) => (
                        <div key={i} className="warning-text">{w}</div>
                      ))}
                    </div>
                  </div>
                )}
                {flightStats.totalDistance > flightStats.maxDistance && (
                  <div className="stats-warnings">
                    <AlertTriangle size={16} />
                    <div>
                      <div className="warning-text">
                        Distance exceeds safe maximum: {(flightStats.maxDistance / 1000).toFixed(2)} km
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <button 
          className="toolbar-btn" 
          onClick={handleSplitMission}
          disabled={!flightPlan || waypoints.length === 0}
          title={waypoints.length > 0 ? `Split mission (${waypoints.length} waypoints)` : "Split Mission"}
        >
          <Scissors size={18} />
          <span>Split Mission</span>
        </button>
        <button 
          className="toolbar-btn danger" 
          onClick={handleClear}
          disabled={waypoints.length === 0}
          title="Clear All Waypoints"
        >
          <Trash2 size={18} />
          <span>Clear</span>
        </button>
        <div className="toolbar-separator"></div>
        <button 
          className="toolbar-btn" 
          onClick={handlePrint}
          disabled={!flightPlan || waypoints.length === 0}
          title="Print Flight Plan"
        >
          <Printer size={18} />
          <span>Print</span>
        </button>
        <button 
          className="toolbar-btn" 
          onClick={handleHelp}
          title="Open User Guide"
        >
          <HelpCircle size={18} />
          <span>Help</span>
        </button>
      </div>

      {/* Drag and Drop Overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <Upload size={48} />
            <p>Drop file to import</p>
            <p className="drag-hint">Supports: JSON, KMZ, KML, WGS84</p>
          </div>
        </div>
      )}

      {showSplitDialog && (
        <div className="split-dialog-overlay" onClick={() => setShowSplitDialog(false)}>
          <div className="split-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Split Mission</h3>
            <p>This mission has <strong>{waypoints.length}</strong> waypoints.</p>
            <p>Recommended: <strong>{getRecommendedSplit(waypoints.length)}</strong> waypoints per mission</p>
            <div className="split-dialog-input">
              <label>
                Waypoints per mission:
                <input
                  type="number"
                  min="10"
                  max={waypoints.length}
                  value={waypointsPerMission}
                  onChange={(e) => setWaypointsPerMission(parseInt(e.target.value) || 50)}
                />
              </label>
            </div>
            <p className="split-dialog-info">
              This will create <strong>{Math.ceil(waypoints.length / (waypointsPerMission || 50))}</strong> separate mission files.
            </p>
            <div className="split-dialog-buttons">
              <button className="toolbar-btn" onClick={handleConfirmSplit}>
                Split & Export All
              </button>
              <button className="toolbar-btn" onClick={() => setShowSplitDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Toolbar

