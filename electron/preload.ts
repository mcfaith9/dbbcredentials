import { ipcRenderer, contextBridge } from 'electron'

// Define the exposed API
const electronAPI = {
  isElectron: true,
  platform: process.platform,

  // Window Controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowStateChange: (callback: (state: { isMaximized: boolean }) => void) => {
    const handler = (_event: any, state: { isMaximized: boolean }) => callback(state)
    ipcRenderer.on('window:state-change', handler)
    return () => ipcRenderer.removeListener('window:state-change', handler)
  },

  // Native File Dialogs & Filesystem
  saveVaultFile: (payload: { defaultPath?: string; data: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:saveVaultFile', payload),
  openVaultFile: (payload?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:openVaultFile', payload),

  // Notifications
  notify: (title: string, body: string) =>
    ipcRenderer.invoke('app:notify', { title, body }),

  // External Links
  openExternal: (url: string) =>
    ipcRenderer.invoke('app:openExternal', url),

  // System & Platform Info
  getPlatformInfo: () =>
    ipcRenderer.invoke('app:getPlatformInfo'),
}

// Expose safe API to the Renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Also keep standard ipcRenderer for flexibility
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})
