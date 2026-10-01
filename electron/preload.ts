import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  selectProject: () => ipcRenderer.invoke('dialog:selectProject'),
  selectImageFile: () => ipcRenderer.invoke('dialog:selectImageFile'),
  readImageFile: (filePath: string) => ipcRenderer.invoke('fs:readImageFile', filePath),
  showPrompt: (title: string, label: string, defaultValue?: string) => ipcRenderer.invoke('dialog:prompt', title, label, defaultValue),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  writeBuffer: (filePath: string, base64: string) => ipcRenderer.invoke('fs:writeBuffer', filePath, base64),
  exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  mkdir: (dirPath: string) => ipcRenderer.invoke('fs:mkdir', dirPath),
  readdir: (dirPath: string) => ipcRenderer.invoke('fs:readdir', dirPath),
  scanProject: (projectPath: string) => ipcRenderer.invoke('project:scan', projectPath),
})
