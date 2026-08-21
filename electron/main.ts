import { app, BrowserWindow, ipcMain, dialog, shell, Notification } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    title: 'DBB Credentials Vault',
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#09090b',
    // Custom framing for desktop titlebar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#09090b',
      symbolColor: '#a1a1aa',
      height: 38,
    } : false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  // Window state notification to renderer
  win.on('maximize', () => {
    win?.webContents.send('window:state-change', { isMaximized: true })
  })

  win.on('unmaximize', () => {
    win?.webContents.send('window:state-change', { isMaximized: false })
  })

  // Prevent opening untrusted external web pages inside Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ---------------- IPC Handlers ----------------

// Window Controls
ipcMain.handle('window:minimize', () => {
  if (win && !win.isDestroyed()) {
    win.minimize()
    return true
  }
  return false
})

ipcMain.handle('window:maximize', () => {
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize()
      return false
    } else {
      win.maximize()
      return true
    }
  }
  return false
})

ipcMain.handle('window:close', () => {
  if (win && !win.isDestroyed()) {
    win.close()
    return true
  }
  return false
})

ipcMain.handle('window:isMaximized', () => {
  return win && !win.isDestroyed() ? win.isMaximized() : false
})

// Native Save Vault Dialog & File Write
ipcMain.handle('dialog:saveVaultFile', async (_event, payload: { defaultPath?: string; data: string; filters?: { name: string; extensions: string[] }[] }) => {
  if (!win) return { success: false, error: 'No active window' }
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export DBB Encrypted Vault',
      defaultPath: payload.defaultPath || `dbb-vault-backup-${new Date().toISOString().slice(0, 10)}.dbb`,
      filters: payload.filters || [
        { name: 'DBB Encrypted Vault (*.dbb)', extensions: ['dbb'] },
        { name: 'JSON Vault Backup (*.json)', extensions: ['json'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    })

    if (canceled || !filePath) {
      return { success: false, canceled: true }
    }

    await fs.writeFile(filePath, payload.data, 'utf-8')
    return { success: true, filePath }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save file' }
  }
})

// Native Open Vault Dialog & File Read
ipcMain.handle('dialog:openVaultFile', async (_event, payload?: { filters?: { name: string; extensions: string[] }[] }) => {
  if (!win) return { success: false, error: 'No active window' }
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import DBB Vault Backup',
      properties: ['openFile'],
      filters: payload?.filters || [
        { name: 'DBB Encrypted Vault (*.dbb)', extensions: ['dbb'] },
        { name: 'JSON Vault Backup (*.json)', extensions: ['json'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ],
    })

    if (canceled || !filePaths || filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    const filePath = filePaths[0]
    const content = await fs.readFile(filePath, 'utf-8')
    return { success: true, filePath, content, fileName: path.basename(filePath) }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to open file' }
  }
})

// Native Desktop Notification
ipcMain.handle('app:notify', (_event, payload: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: payload.title || 'DBB Credentials',
      body: payload.body || '',
    }).show()
    return true
  }
  return false
})

// Open External URL
ipcMain.handle('app:openExternal', (_event, url: string) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url)
    return true
  }
  return false
})

// Get Platform Information
ipcMain.handle('app:getPlatformInfo', () => {
  return {
    isElectron: true,
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    appVersion: app.getVersion(),
  }
})

// App Lifecycle
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
