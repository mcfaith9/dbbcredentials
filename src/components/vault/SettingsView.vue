<script setup lang="ts">
import { ref, reactive } from 'vue'
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
} from '@lucide/vue'

const { lock, changePassword, user } = useAuth()
const { settings, updateSettings, exportVault, importVault, resetVault } = useVault()
const { success, error, warning } = useToast()
const {
  isElectron,
  platform,
  platformInfo,
  saveFileNative,
  openFileNative,
  sendNotification,
} = useElectron()

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
