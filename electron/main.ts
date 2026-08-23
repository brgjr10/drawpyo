import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { startServer, stopServer } from './server'

let mainWindow: BrowserWindow | null = null
let apiServer: ReturnType<typeof startServer> | null = null

const isDev = !app.isPackaged
const ENABLE_LOCAL_API = true

function createWindow() {
  const appPath = app.getAppPath()
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Drawpyo',
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(appPath, 'dist-electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(appPath, 'dist', 'index.html')
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html:', indexPath, err)
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  if (ENABLE_LOCAL_API) {
    apiServer = startServer()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (apiServer) {
      stopServer(apiServer)
      apiServer = null
    }
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:selectProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Open Drawpyo Project',
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:selectImageFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    title: 'Select Image',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
    ],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('fs:readImageFile', async (_event, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    const mime = mimeMap[ext] || 'image/png'
    const base64 = buffer.toString('base64')
    return `data:${mime};base64,${base64}`
  } catch (e) {
    return null
  }
})

ipcMain.handle('dialog:prompt', async (_event, title: string, label: string, defaultValue: string) => {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'none',
    title,
    message: label,
    buttons: ['OK', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    input: defaultValue ? { type: 'text', value: defaultValue } : undefined,
  })
  if (result.response === 0 && result.input) {
    return result.input.value
  }
  return null
})

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return data
  } catch (e) {
    return null
  }
})

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})

ipcMain.handle('fs:exists', async (_event, filePath: string) => {
  return fs.existsSync(filePath)
})

ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true })
  return true
})

ipcMain.handle('fs:readdir', async (_event, dirPath: string) => {
  return fs.readdirSync(dirPath)
})
