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

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface AppUpdateState {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'dev-mode'
  info: {
    version?: string
    releaseDate?: string
    releaseNotes?: string | any[]
    tag?: string
    html_url?: string
    name?: string
  } | null
  error: string | null
  progress: UpdateProgress | null
  lastChecked: string | null
  currentVersion: string
  isPackaged: boolean
}

const updateState = ref<AppUpdateState>({
  status: 'idle',
  info: null,
  error: null,
  progress: null,
  lastChecked: null,
  currentVersion: '1.0.0',
  isPackaged: false,
})

export function useElectron() {
  let cleanupStateListener: (() => void) | null = null
  let cleanupUpdaterListener: (() => void) | null = null
  let cleanupProgressListener: (() => void) | null = null

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
        updateState.value.currentVersion = info.appVersion || '1.0.0'
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

      // Hook into Updater events if available
      if (window.electronAPI.updater) {
        try {
          const initialStatus = await window.electronAPI.updater.getStatus()
          if (initialStatus) {
            updateState.value = {
              ...updateState.value,
              ...initialStatus,
            }
          }
        } catch {
          // ignore
        }

        cleanupUpdaterListener = window.electronAPI.updater.onStatusChange((status) => {
          if (status) {
            updateState.value = {
              ...updateState.value,
              ...status,
            }
          }
        })

        cleanupProgressListener = window.electronAPI.updater.onProgressChange((progress) => {
          if (progress) {
            updateState.value.progress = progress
            updateState.value.status = 'downloading'
          }
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

  async function checkUpdates(manual: boolean = false): Promise<AppUpdateState> {
    updateState.value.status = 'checking'
    updateState.value.error = null

    if (isElectron.value && window.electronAPI?.updater) {
      try {
        const res = await window.electronAPI.updater.check()
        if (res && res.status === 'dev-mode') {
          // In development mode, check GitHub API for real release info as a helpful preview
          await checkGitHubReleasesFallback(manual)
        }
        updateState.value.lastChecked = new Date().toISOString()
        return updateState.value
      } catch (err: any) {
        updateState.value.status = 'error'
        updateState.value.error = err?.message || 'Failed to check for updates'
        updateState.value.lastChecked = new Date().toISOString()
        return updateState.value
      }
    }

    // Web / Fallback mode: Check GitHub Releases directly
    return await checkGitHubReleasesFallback(manual)
  }

  async function checkGitHubReleasesFallback(manual: boolean = false): Promise<AppUpdateState> {
    try {
      const response = await fetch('https://api.github.com/repos/mcfaith9/dbbcredentials/releases/latest', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      })
      if (response.ok) {
        const release = await response.json()
        const latestTag = release.tag_name ? release.tag_name.replace(/^v/, '') : ''
        const currentVer = updateState.value.currentVersion.replace(/^v/, '')

        const isNewer = compareVersions(latestTag, currentVer) > 0
        if (isNewer) {
          updateState.value.status = 'available'
          updateState.value.info = {
            version: release.tag_name,
            name: release.name || release.tag_name,
            releaseDate: release.published_at,
            releaseNotes: release.body || 'No release notes provided.',
            html_url: release.html_url,
          }
        } else {
          updateState.value.status = 'not-available'
          updateState.value.info = {
            version: release.tag_name,
            name: release.name || release.tag_name,
            releaseDate: release.published_at,
            releaseNotes: release.body || '',
            html_url: release.html_url,
          }
        }
      } else if (response.status === 404) {
        // No releases published yet on the repo
        updateState.value.status = 'not-available'
        updateState.value.info = {
          version: updateState.value.currentVersion,
          name: `v${updateState.value.currentVersion}`,
          releaseDate: new Date().toISOString(),
          releaseNotes: 'You are using the latest version of DBB Credentials Vault.',
        }
      } else {
        updateState.value.status = manual ? 'not-available' : updateState.value.status
      }
    } catch {
      // In offline or restricted network environments
      updateState.value.status = 'not-available'
    }

    updateState.value.lastChecked = new Date().toISOString()
    return updateState.value
  }

  function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(n => parseInt(n, 10) || 0)
    const parts2 = v2.split('.').map(n => parseInt(n, 10) || 0)
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      if (p1 > p2) return 1
      if (p1 < p2) return -1
    }
    return 0
  }

  async function downloadUpdate(): Promise<boolean> {
    if (isElectron.value && window.electronAPI?.updater) {
      updateState.value.status = 'downloading'
      try {
        const res = await window.electronAPI.updater.download()
        return res?.success || false
      } catch (err: any) {
        updateState.value.status = 'error'
        updateState.value.error = err?.message || 'Failed to download update'
        return false
      }
    }

    // Web fallback: open github releases page
    if (updateState.value.info?.html_url) {
      openExternal(updateState.value.info.html_url)
    } else {
      openExternal('https://github.com/mcfaith9/dbbcredentials/releases')
    }
    return true
  }

  async function installUpdate(): Promise<boolean> {
    if (isElectron.value && window.electronAPI?.updater) {
      try {
        await window.electronAPI.updater.install()
        return true
      } catch (err: any) {
        updateState.value.status = 'error'
        updateState.value.error = err?.message || 'Failed to install update'
        return false
      }
    }
    return false
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
    if (cleanupUpdaterListener) {
      cleanupUpdaterListener()
    }
    if (cleanupProgressListener) {
      cleanupProgressListener()
    }
  })

  return {
    isElectron,
    platform,
    isMaximized,
    platformInfo,
    updateState,
    checkEnvironment,
    checkUpdates,
    downloadUpdate,
    installUpdate,
    minimizeWindow,
    toggleMaximizeWindow,
    closeWindow,
    saveFileNative,
    openFileNative,
    sendNotification,
    openExternal,
  }
}
