import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { exec } from 'child_process'
import os from 'os'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  
  // Set Content Security Policy
  // Note: In dev mode, we need 'unsafe-eval' for Vite HMR, which is why the warning appears
  // This is expected and safe for development. In production builds, the CSP will be stricter.
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' data: blob: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; font-src 'self' data: https:;"
          ],
        },
      })
    })
  }
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function createDesktopShortcut() {
  // Only create shortcut on Windows and when app is packaged
  if (process.platform !== 'win32' || !app.isPackaged) {
    return
  }

  try {
    const desktopPath = path.join(os.homedir(), 'Desktop')
    const shortcutPath = path.join(desktopPath, 'Waypoint Planner.lnk')
    const exePath = process.execPath

    // Always create/update shortcut to ensure it points to the correct location
    // Create shortcut using PowerShell with temp file for reliability
    const tempScriptPath = path.join(os.tmpdir(), `create-shortcut-${Date.now()}.ps1`)
    // Escape paths for PowerShell by doubling backslashes and escaping quotes
    const escapePath = (p: string) => p.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const psScript = `$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${escapePath(shortcutPath)}")
$Shortcut.TargetPath = "${escapePath(exePath)}"
$Shortcut.WorkingDirectory = "${escapePath(path.dirname(exePath))}"
$Shortcut.Description = "Waypoint Planner - DJI Drone Flight Planning Application"
$Shortcut.Save()`

    await fs.writeFile(tempScriptPath, psScript, 'utf-8')

    exec(
      `powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`,
      { windowsHide: true },
      async (error, stdout, stderr) => {
        // Clean up temp file
        try {
          await fs.unlink(tempScriptPath)
        } catch {
          // Ignore cleanup errors
        }
        if (error) {
          console.error('Failed to create desktop shortcut:', error)
        } else {
          console.log('Desktop shortcut created/updated successfully:', shortcutPath)
        }
      }
    )
  } catch (error) {
    console.error('Error creating desktop shortcut:', error)
  }
}

async function createProjectsFolder() {
  // Only create folder when app is packaged
  if (!app.isPackaged) {
    return
  }

  try {
    // Get Documents folder path
    const documentsPath = path.join(os.homedir(), 'Documents')
    const projectsFolderPath = path.join(documentsPath, 'Waypoint Planner Projects')

    // Check if folder already exists
    try {
      await fs.access(projectsFolderPath)
      // Folder exists, skip creation
      return
    } catch {
      // Folder doesn't exist, create it
    }

    // Create the projects folder
    await fs.mkdir(projectsFolderPath, { recursive: true })
    console.log('Created projects folder:', projectsFolderPath)
  } catch (error) {
    console.error('Error creating projects folder:', error)
  }
}

app.whenReady().then(() => {
  createWindow()
  createDesktopShortcut()
  createProjectsFolder()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
ipcMain.handle('save-file', async (_, data: string, filename: string) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: filename,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  })
  if (filePath) {
    await fs.writeFile(filePath, data, 'utf-8')
    return filePath
  }
  return null
})

ipcMain.handle('open-file', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow!, {
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'KMZ Files', extensions: ['kmz'] },
    ],
    properties: ['openFile'],
  })
  if (filePaths.length > 0) {
    const filePath = filePaths[0]
    const isKMZ = filePath.toLowerCase().endsWith('.kmz')
    
    if (isKMZ) {
      // Read KMZ as binary buffer
      const buffer = await fs.readFile(filePath)
      // Convert buffer to base64 for transmission
      const base64 = buffer.toString('base64')
      return { path: filePath, content: base64, isBinary: true }
    } else {
      // Read JSON as text
      const content = await fs.readFile(filePath, 'utf-8')
      return { path: filePath, content, isBinary: false }
    }
  }
  return null
})

ipcMain.handle('import-kmz', async (_, filePath: string) => {
  // KMZ import logic will be implemented
  return null
})

ipcMain.handle('export-kmz', async (_, data: any, filePath: string) => {
  // KMZ export logic will be implemented
  return null
})

ipcMain.handle('open-external', async (_, url: string) => {
  await shell.openExternal(url)
})

// Get projects folder path
ipcMain.handle('get-projects-folder', async () => {
  const documentsPath = path.join(os.homedir(), 'Documents')
  return path.join(documentsPath, 'Waypoint Planner Projects')
})

// List all project files in the projects folder
ipcMain.handle('list-projects', async () => {
  try {
    const documentsPath = path.join(os.homedir(), 'Documents')
    const projectsFolderPath = path.join(documentsPath, 'Waypoint Planner Projects')
    
    // Ensure folder exists
    try {
      await fs.access(projectsFolderPath)
    } catch {
      await fs.mkdir(projectsFolderPath, { recursive: true })
    }
    
    const files = await fs.readdir(projectsFolderPath)
    const projectFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file.replace('.json', ''),
        filename: file,
        path: path.join(projectsFolderPath, file),
      }))
    
    // Get file stats for sorting
    const projectsWithStats = await Promise.all(
      projectFiles.map(async (project) => {
        try {
          const stats = await fs.stat(project.path)
          return {
            ...project,
            modified: stats.mtime,
            size: stats.size,
          }
        } catch {
          return {
            ...project,
            modified: new Date(0),
            size: 0,
          }
        }
      })
    )
    
    // Sort by modified date (newest first)
    projectsWithStats.sort((a, b) => b.modified.getTime() - a.modified.getTime())
    
    return projectsWithStats
  } catch (error) {
    console.error('Error listing projects:', error)
    return []
  }
})

// Create new project file
ipcMain.handle('create-project', async (_, projectName: string, flightPlan: any) => {
  try {
    const documentsPath = path.join(os.homedir(), 'Documents')
    const projectsFolderPath = path.join(documentsPath, 'Waypoint Planner Projects')
    
    // Ensure folder exists
    try {
      await fs.access(projectsFolderPath)
    } catch {
      await fs.mkdir(projectsFolderPath, { recursive: true })
    }
    
    // Sanitize filename
    const sanitizedName = projectName.replace(/[<>:"/\\|?*]/g, '_')
    const filePath = path.join(projectsFolderPath, `${sanitizedName}.json`)
    
    // Check if file already exists
    try {
      await fs.access(filePath)
      throw new Error('A project with this name already exists')
    } catch (error: any) {
      if (error.code === 'EEXIST' || error.message.includes('already exists')) {
        throw error
      }
      // File doesn't exist, continue
    }
    
    // Save the flight plan
    await fs.writeFile(filePath, JSON.stringify(flightPlan, null, 2), 'utf-8')
    
    return filePath
  } catch (error) {
    console.error('Error creating project:', error)
    throw error
  }
})

// Update existing project file
ipcMain.handle('update-project', async (_, projectName: string, flightPlan: any) => {
  try {
    const documentsPath = path.join(os.homedir(), 'Documents')
    const projectsFolderPath = path.join(documentsPath, 'Waypoint Planner Projects')
    
    // Ensure folder exists
    try {
      await fs.access(projectsFolderPath)
    } catch {
      await fs.mkdir(projectsFolderPath, { recursive: true })
    }
    
    // Sanitize filename
    const sanitizedName = projectName.replace(/[<>:"/\\|?*]/g, '_')
    const filePath = path.join(projectsFolderPath, `${sanitizedName}.json`)
    
    // Update the flight plan (overwrite existing file)
    await fs.writeFile(filePath, JSON.stringify(flightPlan, null, 2), 'utf-8')
    
    return filePath
  } catch (error) {
    console.error('Error updating project:', error)
    throw error
  }
})

// Load project file
ipcMain.handle('load-project', async (_, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const flightPlan = JSON.parse(content)
    
    // Convert date strings back to Date objects
    if (flightPlan.createdAt) {
      flightPlan.createdAt = new Date(flightPlan.createdAt)
    }
    if (flightPlan.updatedAt) {
      flightPlan.updatedAt = new Date(flightPlan.updatedAt)
    }
    
    return flightPlan
  } catch (error) {
    console.error('Error loading project:', error)
    throw error
  }
})

