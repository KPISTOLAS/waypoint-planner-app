export interface ElectronAPI {
  saveFile: (data: string, filename: string) => Promise<string | null>
  openFile: () => Promise<{ path: string; content: string; isBinary?: boolean } | null>
  exportKMZ: (data: any, filePath: string) => Promise<void>
  importKMZ: (filePath: string) => Promise<any>
  openExternal?: (url: string) => Promise<void>
  getProjectsFolder: () => Promise<string>
  listProjects: () => Promise<Array<{ name: string; filename: string; path: string; modified: Date; size: number }>>
  createProject: (projectName: string, flightPlan: any) => Promise<string>
  updateProject: (projectName: string, flightPlan: any) => Promise<string>
  loadProject: (filePath: string) => Promise<any>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

