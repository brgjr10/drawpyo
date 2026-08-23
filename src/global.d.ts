export interface ElectronAPI {
  openDirectory: () => Promise<string | null>
  selectProject: () => Promise<string | null>
  selectImageFile: () => Promise<string | null>
  readImageFile: (filePath: string) => Promise<string | null>
  showPrompt: (title: string, label: string, defaultValue?: string) => Promise<string | null>
  readFile: (filePath: string) => Promise<string | null>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  exists: (filePath: string) => Promise<boolean>
  mkdir: (dirPath: string) => Promise<boolean>
  readdir: (dirPath: string) => Promise<string[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
