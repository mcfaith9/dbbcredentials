import { ref, onMounted, onUnmounted } from 'vue'

const isElectron = ref(false)
const platform = ref('browser')
const isMaximized = ref(false)
const platformInfo = ref<{
  isElectron: boolean
  platform: string
  arch: string
  electronVersion: string
  chromeVersion?: string
  nodeVersion?: string
  appVersion?: string
}>({
  isElectron: false,
  platform: 'web',
  arch: 'x64',
  electronVersion: 'N/A (Web Container)',
  chromeVersion: 'N/A',
  nodeVersion: 'N/A',
  appVersion: '1.0.0',
})

export function useElectron() {
  let cleanupStateListener: (() => void) | null = null

  async function checkEnvironment() {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      isElectron.value = true
      platform.value = window.electronAPI.platform || 'electron'

      try {
        const info = await window.electronAPI.getPlatformInfo()
        platformInfo.value = {
          isElectron: true,
          platform: info.platform,
          arch: info.arch,
          electronVersion: info.electronVersion,
          chromeVersion: info.chromeVersion,
          nodeVersion: info.nodeVersion,
          appVersion: info.appVersion || '1.0.0',
        }
      } catch {
        // fallback
      }

      try {
        isMaximized.value = await window.electronAPI.isMaximized()
      } catch {
        // ignore
      }

      if (window.electronAPI.onWindowStateChange) {
        cleanupStateListener = window.electronAPI.onWindowStateChange((state) => {
          isMaximized.value = state.isMaximized
        })
      }
    } else {
      isElectron.value = false
      // Detect browser OS
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) {
        platform.value = 'darwin'
      } else if (userAgent.includes('Windows')) {
        platform.value = 'win32'
      } else if (userAgent.includes('Linux')) {
        platform.value = 'linux'
      } else {
        platform.value = 'browser'
      }
    }
  }

  async function minimizeWindow() {
    if (isElectron.value && window.electronAPI?.minimize) {
      await window.electronAPI.minimize()
    }
  }

  async function toggleMaximizeWindow() {
    if (isElectron.value && window.electronAPI?.maximize) {
      const state = await window.electronAPI.maximize()
      isMaximized.value = state
    } else {
      isMaximized.value = !isMaximized.value
    }
  }

  async function closeWindow() {
    if (isElectron.value && window.electronAPI?.close) {
      await window.electronAPI.close()
    } else {
      // In browser preview, lock or reload
      sessionStorage.removeItem('dbb_vault_unlocked')
      window.location.reload()
    }
  }

  async function saveFileNative(defaultPath: string, data: string): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> {
    if (isElectron.value && window.electronAPI?.saveVaultFile) {
      return await window.electronAPI.saveVaultFile({ defaultPath, data })
    }
    // Web Fallback: download via anchor tag
    try {
      const blob = new Blob([data], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = defaultPath
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return { success: true, filePath: defaultPath }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Download failed' }
    }
  }

  async function openFileNative(): Promise<{ success: boolean; content?: string; fileName?: string; canceled?: boolean; error?: string }> {
    if (isElectron.value && window.electronAPI?.openVaultFile) {
      return await window.electronAPI.openVaultFile()
    }
    // Return indicate using browser file picker
    return { success: false, canceled: false }
  }

  async function sendNotification(title: string, body: string) {
    if (isElectron.value && window.electronAPI?.notify) {
      await window.electronAPI.notify(title, body)
      return
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          new Notification(title, { body })
        }
      }
    }
  }

  function openExternal(url: string) {
    if (isElectron.value && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  onMounted(() => {
    checkEnvironment()
  })

  onUnmounted(() => {
    if (cleanupStateListener) {
      cleanupStateListener()
    }
  })

  return {
    isElectron,
    platform,
    isMaximized,
    platformInfo,
    checkEnvironment,
    minimizeWindow,
    toggleMaximizeWindow,
    closeWindow,
    saveFileNative,
    openFileNative,
    sendNotification,
    openExternal,
  }
}
