<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import { useElectron } from '@/composables/useElectron'
import { encryptVault, decryptVault } from '@/services/crypto'
import {
  Shield,
  Moon,
  Sun,
  Laptop,
  Database,
  Download,
  Upload,
  KeyRound,
  Lock,
  Clock,
  Clipboard,
  HardDrive,
  Cpu,
  Bell,
  Terminal,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowDownCircle,
  Package,
} from '@lucide/vue'

const { lock, changePassword, user } = useAuth()
const { settings, updateSettings, exportVault, importVault, resetVault } = useVault()
const { success, error, warning } = useToast()
const {
  isElectron,
  platform,
  platformInfo,
  updateState,
  checkUpdates,
  downloadUpdate,
  installUpdate,
  saveFileNative,
  openFileNative,
  sendNotification,
  openExternal,
} = useElectron()

const isCheckingUpdates = ref(false)
const showReleaseNotes = ref(false)

async function handleCheckForUpdates() {
  isCheckingUpdates.value = true
  try {
    const res = await checkUpdates(true)
    if (res.status === 'available') {
      success('Update Available', `Version ${res.info?.version || ''} is available for download.`)
    } else if (res.status === 'not-available') {
      success('Up to Date', 'You are running the latest version of DBB Credentials Vault.')
    } else if (res.status === 'error') {
      error('Update Check Failed', res.error || 'Could not verify latest version.')
    }
  } catch (err: any) {
    error('Update Error', err?.message || 'Failed to check updates')
  } finally {
    isCheckingUpdates.value = false
  }
}

async function handleDownloadUpdate() {
  const ok = await downloadUpdate()
  if (ok && isElectron.value) {
    success('Downloading Update', 'Update download started in background.')
  }
}

async function handleInstallUpdate() {
  await installUpdate()
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formattedLastChecked = computed(() => {
  if (!updateState.value.lastChecked) return 'Never checked'
  try {
    const d = new Date(updateState.value.lastChecked)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + d.toLocaleDateString()
  } catch {
    return updateState.value.lastChecked
  }
})

// Password change form
const pwdForm = reactive({
  current: '',
  newPwd: '',
  confirm: '',
  loading: false,
})

// Backup / Export password prompt
const backupPassword = ref('')
const isExporting = ref(false)
const isImporting = ref(false)
const restoreFileRef = ref<HTMLInputElement | null>(null)

// Test native desktop notification
async function handleTestNotification() {
  await sendNotification(
    'DBB Credentials Desktop',
    'Vault integrity verified. Local encrypted storage is active and healthy.'
  )
  success('Notification Sent', 'Desktop notification has been triggered.')
}

// Password change handler
async function handleChangePassword() {
  if (!pwdForm.current || !pwdForm.newPwd) {
    error('Fields required', 'Please enter your current and new password.')
    return
  }

  if (pwdForm.newPwd !== pwdForm.confirm) {
    error('Mismatch', 'New passwords do not match.')
    return
  }

  if (pwdForm.newPwd.length < 6) {
    error('Too short', 'New password must be at least 6 characters.')
    return
  }

  pwdForm.loading = true
  const res = await changePassword(pwdForm.current, pwdForm.newPwd)
  pwdForm.loading = false

  if (res.success) {
    success('Master Password Updated', 'Your local login credentials have been changed successfully.')
    pwdForm.current = ''
    pwdForm.newPwd = ''
    pwdForm.confirm = ''
  } else {
    error('Update Failed', res.error || 'Current password incorrect.')
  }
}

// Auto-lock setting handler
function setAutoLock(minutes: number) {
  updateSettings({ autoLockMinutes: minutes })
  success('Setting Saved', `Auto-lock set to ${minutes === 0 ? 'Never' : `${minutes} minutes`}.`)
}

// Clipboard clear handler
function setClipboardTimeout(seconds: number) {
  updateSettings({ clipboardClearSeconds: seconds })
  success('Setting Saved', `Clipboard auto-clear set to ${seconds === 0 ? 'Never' : `${seconds} seconds`}.`)
}

// Theme handler
function setTheme(theme: 'light' | 'dark' | 'system') {
  updateSettings({ theme })
}

// Export Vault File
async function handleExportBackup(encrypted = true) {
  try {
    isExporting.value = true
    const rawData = exportVault()
    let contentToDownload: string
    let filename: string

    if (encrypted && backupPassword.value) {
      contentToDownload = await encryptVault(JSON.stringify(rawData), backupPassword.value)
      filename = `dbb-vault-backup-encrypted-${new Date().toISOString().slice(0, 10)}.dbb`
    } else {
      contentToDownload = JSON.stringify(rawData, null, 2)
      filename = `dbb-vault-export-${new Date().toISOString().slice(0, 10)}.json`
    }

    const res = await saveFileNative(filename, contentToDownload)
    if (res.canceled) {
      return
    }

    if (res.success) {
      success('Backup Exported', `Saved ${filename} successfully.`)
      backupPassword.value = ''
    } else {
      error('Export Failed', res.error || 'Failed to export backup.')
    }
  } catch (err: any) {
    error('Export Failed', err?.message || 'Failed to export backup.')
  } finally {
    isExporting.value = false
  }
}

// Trigger file input for restore
async function triggerRestore() {
  if (isElectron.value) {
    const res = await openFileNative()
    if (res.canceled) return
    if (res.success && res.content) {
      await processImportedText(res.content)
      return
    }
  }
  restoreFileRef.value?.click()
}

async function processImportedText(text: string) {
  try {
    isImporting.value = true
    let parsedData: any

    try {
      const json = JSON.parse(text)
      if (json.version && json.salt && json.iv && json.data) {
        // Encrypted format
        const pwd = prompt('Enter the backup encryption password:')
        if (!pwd) {
          warning('Cancelled', 'Password is required to decrypt backup.')
          return
        }
        const decryptedStr = await decryptVault(text, pwd)
        parsedData = JSON.parse(decryptedStr)
      } else {
        parsedData = json
      }
    } catch {
      throw new Error('Unsupported or corrupted backup file format.')
    }

    const res = importVault(parsedData)
    success('Vault Restored', `Successfully imported ${res.importedCount} items.`)
  } catch (err: any) {
    error('Restore Failed', err?.message || 'Could not parse backup file.')
  } finally {
    isImporting.value = false
  }
}

// Handle file import
async function handleFileRestore(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    await processImportedText(text)
  } catch (err: any) {
    error('Restore Failed', err?.message || 'Could not parse backup file.')
  } finally {
    if (target) target.value = ''
  }
}

function handleResetVault() {
  if (confirm('Are you sure you want to reset your vault? This will revert items to initial default demonstration records.')) {
    resetVault()
    warning('Vault Reset', 'Vault items have been reset to default records.')
  }
}
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-border">
      <div>
        <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield class="w-6 h-6 text-primary" />
          <span>Application Settings</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Configure offline security, appearance, and local database storage.
        </p>
      </div>

      <button
        @click="lock()"
        class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border transition shadow-sm"
      >
        <Lock class="w-4 h-4 text-primary" />
        <span>Lock Vault Now</span>
      </button>
    </div>

    <!-- Hidden file input for restore -->
    <input
      type="file"
      ref="restoreFileRef"
      @change="handleFileRestore"
      accept=".json,.dbb"
      class="hidden"
    />

    <!-- ================= SECTION 0: APPLICATION UPDATES ================= -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
          <RefreshCw class="w-4 h-4 text-primary" />
          <span>Updates</span>
        </h3>
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
            v{{ platformInfo.appVersion || updateState.currentVersion }}
          </span>
        </div>
      </div>

      <div class="p-5 rounded-2xl border border-border bg-card space-y-5 shadow-sm">
        <!-- Main Update Status Row -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-start gap-3.5">
            <!-- Dynamic Status Icon -->
            <div
              class="p-2.5 rounded-xl shrink-0 flex items-center justify-center transition-colors"
              :class="{
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': updateState.status === 'not-available' || updateState.status === 'idle' || updateState.status === 'dev-mode',
                'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse': updateState.status === 'available',
                'bg-primary/10 text-primary animate-spin': updateState.status === 'checking',
                'bg-blue-500/10 text-blue-600 dark:text-blue-400': updateState.status === 'downloading',
                'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300': updateState.status === 'downloaded',
                'bg-rose-500/10 text-rose-600 dark:text-rose-400': updateState.status === 'error',
              }"
            >
              <CheckCircle2 v-if="updateState.status === 'not-available' || updateState.status === 'idle' || updateState.status === 'dev-mode'" class="w-5 h-5" />
              <ArrowDownCircle v-else-if="updateState.status === 'available'" class="w-5 h-5" />
              <RefreshCw v-else-if="updateState.status === 'checking'" class="w-5 h-5" />
              <Package v-else-if="updateState.status === 'downloading'" class="w-5 h-5 animate-bounce" />
              <Sparkles v-else-if="updateState.status === 'downloaded'" class="w-5 h-5" />
              <AlertTriangle v-else-if="updateState.status === 'error'" class="w-5 h-5" />
            </div>

            <div class="space-y-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-semibold text-foreground">
                  <span v-if="updateState.status === 'checking'">Checking for Updates...</span>
                  <span v-else-if="updateState.status === 'available'">Update Available: {{ updateState.info?.version || 'New Release' }}</span>
                  <span v-else-if="updateState.status === 'downloading'">Downloading Update...</span>
                  <span v-else-if="updateState.status === 'downloaded'">Update Downloaded & Ready to Install</span>
                  <span v-else-if="updateState.status === 'error'">Update Check Encountered an Error</span>
                  <span v-else>DBB Credentials Vault is Up to Date</span>
                </h4>
              </div>

              <p class="text-xs text-muted-foreground">
                <span v-if="updateState.status === 'checking'">Querying GitHub Releases for new updates...</span>
                <span v-else-if="updateState.status === 'available'">
                  A new release is available from the repository ({{ updateState.info?.version || 'latest' }}).
                </span>
                <span v-else-if="updateState.status === 'downloading'">
                  {{ updateState.progress ? `${updateState.progress.percent}% completed (${formatBytes(updateState.progress.transferred)} / ${formatBytes(updateState.progress.total)})` : 'Downloading update package in background...' }}
                </span>
                <span v-else-if="updateState.status === 'downloaded'">
                  Update package is verified. Restart the application to finalize installation.
                </span>
                <span v-else-if="updateState.status === 'error'">
                  {{ updateState.error || 'Failed to connect to update feed.' }}
                </span>
                <span v-else>
                  Current version {{ platformInfo.appVersion || updateState.currentVersion }} is the latest release. Last checked: {{ formattedLastChecked }}.
                </span>
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <!-- Download Button when available -->
            <button
              v-if="updateState.status === 'available'"
              @click="handleDownloadUpdate"
              class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Download Update</span>
            </button>

            <!-- Install Button when downloaded -->
            <button
              v-else-if="updateState.status === 'downloaded'"
              @click="handleInstallUpdate"
              class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm animate-pulse"
            >
              <Sparkles class="w-3.5 h-3.5" />
              <span>Restart & Install</span>
            </button>

            <!-- Check for Updates Button -->
            <button
              @click="handleCheckForUpdates"
              :disabled="isCheckingUpdates || updateState.status === 'checking' || updateState.status === 'downloading'"
              class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isCheckingUpdates || updateState.status === 'checking' }" />
              <span>{{ isCheckingUpdates || updateState.status === 'checking' ? 'Checking...' : 'Check for Updates' }}</span>
            </button>

            <!-- View on GitHub Releases -->
            <button
              @click="openExternal('https://github.com/mcfaith9/dbbcredentials/releases')"
              class="p-2 text-xs rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition"
              title="View all releases on GitHub (mcfaith9/dbbcredentials)"
            >
              <ExternalLink class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Download Progress Bar (When Downloading) -->
        <div v-if="updateState.status === 'downloading' && updateState.progress" class="space-y-1.5 pt-2">
          <div class="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Progress: {{ updateState.progress.percent }}%</span>
            <span>Speed: {{ formatBytes(updateState.progress.bytesPerSecond) }}/s</span>
          </div>
          <div class="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full bg-primary transition-all duration-300 rounded-full"
              :style="{ width: `${updateState.progress.percent}%` }"
            />
          </div>
        </div>

        <!-- Release Notes Accordion if available -->
        <div v-if="updateState.info?.releaseNotes" class="pt-3 border-t border-border space-y-2">
          <button
            @click="showReleaseNotes = !showReleaseNotes"
            class="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <span class="flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-primary" />
              <span>Release Notes for {{ updateState.info.version || updateState.info.name || 'Latest Version' }}</span>
            </span>
            <span class="text-[10px] text-primary underline">{{ showReleaseNotes ? 'Hide Notes' : 'View Notes' }}</span>
          </button>

          <div
            v-if="showReleaseNotes"
            class="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground space-y-1.5 max-h-48 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed"
          >
            {{ updateState.info.releaseNotes }}
          </div>
        </div>
      </div>
    </div>

    <!-- ================= SECTION 1: SECURITY ================= -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
        <Lock class="w-4 h-4 text-primary" />
        <span>Vault Security</span>
      </h3>

      <div class="p-5 rounded-2xl border border-border bg-card space-y-6 shadow-sm">
        <!-- Auto-lock Inactivity -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
          <div>
            <span class="text-sm font-semibold text-foreground block flex items-center gap-1.5">
              <Clock class="w-4 h-4 text-muted-foreground" /> Auto-Lock Vault on Inactivity
            </span>
            <span class="text-xs text-muted-foreground">
              Automatically locks the application after a period of user inactivity.
            </span>
          </div>

          <div class="flex items-center gap-1 bg-muted p-1 rounded-xl shrink-0">
            <button
              v-for="m in [1, 5, 15, 30, 60, 0]"
              :key="m"
              @click="setAutoLock(m)"
              class="px-2.5 py-1 text-xs font-semibold rounded-lg transition"
              :class="
                settings.autoLockMinutes === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
            >
              {{ m === 0 ? 'Never' : `${m}m` }}
            </button>
          </div>
        </div>

        <!-- Clipboard Auto-Clear -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
          <div>
            <span class="text-sm font-semibold text-foreground block flex items-center gap-1.5">
              <Clipboard class="w-4 h-4 text-muted-foreground" /> Clipboard Auto-Clear Timeout
            </span>
            <span class="text-xs text-muted-foreground">
              Wipes copied passwords from your clipboard after the timeout to prevent accidental paste leaks.
            </span>
          </div>

          <div class="flex items-center gap-1 bg-muted p-1 rounded-xl shrink-0">
            <button
              v-for="s in [15, 30, 60, 0]"
              :key="s"
              @click="setClipboardTimeout(s)"
              class="px-2.5 py-1 text-xs font-semibold rounded-lg transition"
              :class="
                settings.clipboardClearSeconds === s
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              "
            >
              {{ s === 0 ? 'Never' : `${s}s` }}
            </button>
          </div>
        </div>

        <!-- Change Local Master Password -->
        <div class="space-y-4">
          <div>
            <span class="text-sm font-semibold text-foreground block flex items-center gap-1.5">
              <KeyRound class="w-4 h-4 text-muted-foreground" /> Change Local Login Password
            </span>
            <span class="text-xs text-muted-foreground">
              Update the local password for <strong class="text-foreground font-mono">{{ user?.username || 'dbadmin' }}</strong>.
            </span>
          </div>

          <form @submit.prevent="handleChangePassword" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              v-model="pwdForm.current"
              type="password"
              placeholder="Current password"
              required
              class="px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
            <input
              v-model="pwdForm.newPwd"
              type="password"
              placeholder="New password (min 6 chars)"
              required
              class="px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
            <div class="flex gap-2">
              <input
                v-model="pwdForm.confirm"
                type="password"
                placeholder="Confirm new password"
                required
                class="flex-1 px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <button
                type="submit"
                :disabled="pwdForm.loading"
                class="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-sm shrink-0"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- ================= SECTION 2: APPEARANCE ================= -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
        <Sun class="w-4 h-4 text-primary" />
        <span>Appearance & Theme</span>
      </h3>

      <div class="p-5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span class="text-sm font-semibold text-foreground block">Application Theme</span>
          <span class="text-xs text-muted-foreground">Select your visual interface preference.</span>
        </div>

        <div class="grid grid-cols-3 gap-2 bg-muted p-1 rounded-xl">
          <button
            @click="setTheme('light')"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
            :class="settings.theme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          >
            <Sun class="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            @click="setTheme('dark')"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
            :class="settings.theme === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          >
            <Moon class="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
          <button
            @click="setTheme('system')"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
            :class="settings.theme === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
          >
            <Laptop class="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================= SECTION 3: DATABASE & BACKUP ================= -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
        <Database class="w-4 h-4 text-primary" />
        <span>Local Database & Backup Management</span>
      </h3>

      <div class="p-5 rounded-2xl border border-border bg-card space-y-5 shadow-sm">
        <div class="flex items-center gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
          <HardDrive class="w-5 h-5 text-primary shrink-0" />
          <div class="space-y-0.5">
            <p class="font-semibold text-foreground">Embedded Offline Storage</p>
            <p>Database is stored locally on this machine using PBKDF2-SHA256 credentials.</p>
          </div>
        </div>

        <!-- Export & Backup Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Encrypted Backup -->
          <div class="p-4 rounded-xl border border-border bg-background space-y-3">
            <div>
              <span class="text-xs font-bold text-foreground block">Encrypted Backup (.dbb)</span>
              <span class="text-[11px] text-muted-foreground">
                Export an AES-256-GCM password-protected vault snapshot.
              </span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="backupPassword"
                type="password"
                placeholder="Set backup passphrase"
                class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
              />
              <button
                @click="handleExportBackup(true)"
                class="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm shrink-0"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Backup</span>
              </button>
            </div>
          </div>

          <!-- Restore Backup File -->
          <div class="p-4 rounded-xl border border-border bg-background space-y-3 flex flex-col justify-between">
            <div>
              <span class="text-xs font-bold text-foreground block">Restore from File</span>
              <span class="text-[11px] text-muted-foreground">
                Import and merge data from a previously created .dbb or .json backup.
              </span>
            </div>
            <button
              @click="triggerRestore"
              :disabled="isImporting"
              class="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-border hover:bg-muted text-xs font-semibold rounded-lg text-foreground transition"
            >
              <Upload class="w-3.5 h-3.5" />
              <span>Select File & Restore</span>
            </button>
          </div>
        </div>

        <!-- Danger Zone: Reset to Defaults -->
        <div class="pt-4 border-t border-border flex items-center justify-between">
          <div>
            <span class="text-xs font-bold text-rose-600 dark:text-rose-400 block">Reset Vault Data</span>
            <span class="text-[11px] text-muted-foreground">Revert vault to default sample items.</span>
          </div>

          <button
            @click="handleResetVault"
            class="px-3 py-1.5 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition"
          >
            Reset Database
          </button>
        </div>
      </div>
    </div>

    <!-- ================= SECTION 4: ELECTRON DESKTOP ARCHITECTURE & ABOUT ================= -->
    <div class="space-y-4">
      <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
        <Laptop class="w-4 h-4 text-primary" />
        <span>Electron Desktop Platform & System</span>
      </h3>

      <div class="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm text-xs leading-relaxed">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-primary text-primary-foreground font-bold">
              <Cpu class="w-5 h-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-foreground">DBB Credentials Desktop</h4>
              <p class="text-[11px] text-muted-foreground">Standalone Electron Application Shell</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="handleTestNotification"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition"
              title="Test OS Desktop Notification"
            >
              <Bell class="w-3.5 h-3.5 text-primary" />
              <span>Test Notification</span>
            </button>

            <span
              class="px-2.5 py-1 rounded-md text-[11px] font-mono border"
              :class="isElectron ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40'"
            >
              {{ isElectron ? '⚡ Electron Active' : '🌐 Desktop Ready' }}
            </span>
          </div>
        </div>

        <!-- Runtime Platform Specs Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div class="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <span class="text-[10px] text-muted-foreground uppercase tracking-wider block">Target OS</span>
            <span class="font-semibold text-foreground font-mono">{{ platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform === 'linux' ? 'Linux' : 'Cross-Platform' }}</span>
          </div>

          <div class="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <span class="text-[10px] text-muted-foreground uppercase tracking-wider block">Architecture</span>
            <span class="font-semibold text-foreground font-mono">{{ platformInfo.arch || 'x64' }}</span>
          </div>

          <div class="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <span class="text-[10px] text-muted-foreground uppercase tracking-wider block">Electron Engine</span>
            <span class="font-semibold text-foreground font-mono">{{ isElectron ? platformInfo.electronVersion : 'v30.0.1 (Configured)' }}</span>
          </div>

          <div class="p-3 rounded-xl bg-muted/40 border border-border space-y-1">
            <span class="text-[10px] text-muted-foreground uppercase tracking-wider block">Security Isolation</span>
            <span class="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Context Isolated</span>
          </div>
        </div>

        <!-- Desktop Packaging Scripts & Commands -->
        <div class="p-3.5 rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-[11px] space-y-2">
          <div class="flex items-center justify-between text-zinc-400 border-b border-zinc-800/80 pb-1.5">
            <span class="flex items-center gap-1.5 text-zinc-200">
              <Terminal class="w-3.5 h-3.5 text-emerald-400" />
              <span>Electron Build & Package Commands</span>
            </span>
            <span class="text-[10px]">electron-builder</span>
          </div>
          <div class="space-y-1 text-zinc-400">
            <p><span class="text-emerald-400">$</span> npm run electron:dev <span class="text-zinc-500"># Launch with hot reload & Vite</span></p>
            <p><span class="text-emerald-400">$</span> npm run electron:build <span class="text-zinc-500"># Package native .dmg / .exe / .AppImage binaries</span></p>
          </div>
        </div>

        <div class="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Cryptographic Vault: PBKDF2-SHA256 & AES-GCM 256</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-semibold">● 100% Offline Vault</span>
        </div>
      </div>
    </div>
  </div>
</template>
