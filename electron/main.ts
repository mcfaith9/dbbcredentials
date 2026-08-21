import { app, BrowserWindow, ipcMain, dialog, shell, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
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

// Updater state tracker
interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'dev-mode'
  info: any | null
  error: string | null
  progress: {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  } | null
  lastChecked: string | null
}

const updateState: UpdateState = {
  status: 'idle',
  info: null,
  error: null,
  progress: null,
  lastChecked: null,
}

function broadcastUpdateStatus() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:status', {
      ...updateState,
      currentVersion: app.getVersion() || '1.0.0',
      isPackaged: app.isPackaged,
    })
  }
}

function broadcastUpdateProgress(progress: any) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:progress', progress)
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    updateState.status = 'checking'
    updateState.error = null
    broadcastUpdateStatus()
  })

  autoUpdater.on('update-available', (info) => {
    updateState.status = 'available'
    updateState.info = info
    updateState.error = null
    updateState.lastChecked = new Date().toISOString()
    broadcastUpdateStatus()
  })

  autoUpdater.on('update-not-available', (info) => {
    updateState.status = 'not-available'
    updateState.info = info
    updateState.error = null
    updateState.lastChecked = new Date().toISOString()
    broadcastUpdateStatus()
  })

  autoUpdater.on('error', (err) => {
    updateState.status = 'error'
    updateState.error = err?.message || 'Failed to check for updates'
    updateState.lastChecked = new Date().toISOString()
    broadcastUpdateStatus()
  })

  autoUpdater.on('download-progress', (progressObj) => {
    updateState.status = 'downloading'
    updateState.progress = {
      percent: Math.round(progressObj.percent || 0),
      bytesPerSecond: progressObj.bytesPerSecond || 0,
      transferred: progressObj.transferred || 0,
      total: progressObj.total || 0,
    }
    broadcastUpdateStatus()
    broadcastUpdateProgress(updateState.progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateState.status = 'downloaded'
    updateState.info = info
    broadcastUpdateStatus()
  })
}

function createWindow() {
  win = new BrowserWindow({
    title: 'DBB Credentials Vault',
    icon: path.join(process.env.VITE_PUBLIC, 'icon1.ico'),
    width: 1000,
    height: 720,
    minWidth: 1000,
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

  // Background update check after window load in packaged mode
  win.webContents.on('did-finish-load', () => {
    if (app.isPackaged) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => {
          // Silent fallback on startup
        })
      }, 4000)
    }
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

// Auto-Updater IPC Handlers
ipcMain.handle('updater:check', async () => {
  if (!app.isPackaged) {
    updateState.status = 'dev-mode'
    updateState.lastChecked = new Date().toISOString()
    broadcastUpdateStatus()
    return {
      status: 'dev-mode',
      currentVersion: app.getVersion() || '1.0.0',
      message: 'Running in development environment. Auto-updater is active in packaged builds.',
      isPackaged: false,
    }
  }

  try {
    updateState.status = 'checking'
    broadcastUpdateStatus()
    const result = await autoUpdater.checkForUpdates()
    return {
      success: true,
      updateInfo: result?.updateInfo,
      currentVersion: app.getVersion(),
      isPackaged: true,
    }
  } catch (err: any) {
    updateState.status = 'error'
    updateState.error = err?.message || 'Failed to check for updates'
    broadcastUpdateStatus()
    return {
      success: false,
      error: err?.message || 'Failed to check for updates',
      currentVersion: app.getVersion(),
      isPackaged: true,
    }
  }
})

ipcMain.handle('updater:download', async () => {
  if (!app.isPackaged) {
    return { success: false, error: 'Cannot download updates in development mode' }
  }
  try {
    updateState.status = 'downloading'
    broadcastUpdateStatus()
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err: any) {
    updateState.status = 'error'
    updateState.error = err?.message || 'Download failed'
    broadcastUpdateStatus()
    return { success: false, error: err?.message || 'Failed to download update' }
  }
})

ipcMain.handle('updater:install', () => {
  if (!app.isPackaged) {
    return { success: false, error: 'Cannot install updates in development mode' }
  }
  try {
    autoUpdater.quitAndInstall()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to install update' }
  }
})

ipcMain.handle('updater:getStatus', () => {
  return {
    ...updateState,
    currentVersion: app.getVersion() || '1.0.0',
    isPackaged: app.isPackaged,
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

app.whenReady().then(() => {
  setupAutoUpdater()
  createWindow()
})
