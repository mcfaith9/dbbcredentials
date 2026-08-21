/// <reference types="vite/client" />

export interface ElectronAPI {
  isElectron: boolean
  platform: string
  minimize: () => Promise<boolean>
  maximize: () => Promise<boolean>
  close: () => Promise<boolean>
  isMaximized: () => Promise<boolean>
  onWindowStateChange: (callback: (state: { isMaximized: boolean }) => void) => () => void
  saveVaultFile: (payload: { defaultPath?: string; data: string; filters?: { name: string; extensions: string[] }[] }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
  openVaultFile: (payload?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{ success: boolean; filePath?: string; content?: string; fileName?: string; canceled?: boolean; error?: string }>
  notify: (title: string, body: string) => Promise<boolean>
  openExternal: (url: string) => Promise<boolean>
  getPlatformInfo: () => Promise<{
    isElectron: boolean
    platform: string
    arch: string
    electronVersion: string
    chromeVersion: string
    nodeVersion: string
    appVersion: string
  }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    ipcRenderer?: any
  }
}
