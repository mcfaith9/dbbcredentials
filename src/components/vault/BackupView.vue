<script setup lang="ts">
import { ref } from 'vue'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import type { ImportConflictStrategy } from '@/types'
import {
  Download,
  Upload,
  Shield,
  ShieldCheck,
  AlertTriangle,
  FileJson,
  CheckCircle2,
  Lock,
} from '@lucide/vue'

const {
  activeItems,
  exportVault,
  exportEncryptedBackup,
  decryptBackupPayload,
  importVault,
} = useVault()

const { success, error, warning } = useToast()

// Export state
const exportPassphrase = ref('')
const confirmExportPassphrase = ref('')
const isExporting = ref(false)
const exportSuccess = ref(false)

// Import state
const importFileInput = ref<HTMLInputElement | null>(null)
const importRawContent = ref<string | null>(null)
const importFileName = ref('')
const importPassphrase = ref('')
const importRequiresPassphrase = ref(false)
const importStrategy = ref<ImportConflictStrategy>('update')
const isAnalyzing = ref(false)
const isImporting = ref(false)
const previewData = ref<any | null>(null)
const importResult = ref<{ importedCount: number; updatedCount: number; skippedCount: number } | null>(null)

// Handle Export
async function handleExport() {
  if (!exportPassphrase.value) {
    error('Passphrase Required', 'Please provide a master encryption passphrase for your backup.')
    return
  }

  if (exportPassphrase.value !== confirmExportPassphrase.value) {
    error('Passphrase Mismatch', 'The confirmation passphrase does not match.')
    return
  }

  isExporting.value = true
  try {
    const backupPayload = await exportEncryptedBackup(exportPassphrase.value)
    const jsonStr = JSON.stringify(backupPayload, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `dbb-company-vault-backup-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportSuccess.value = true
    success('Vault Exported', 'Encrypted backup downloaded successfully.')
    exportPassphrase.value = ''
    confirmExportPassphrase.value = ''
  } catch (err: any) {
    error('Export Failed', err.message || 'Failed to generate encrypted backup.')
  } finally {
    isExporting.value = false
  }
}

// Handle Plaintext JSON Export with extra warning confirmation
function handlePlaintextExport() {
  if (
    !confirm(
      'Security Warning: Exporting unencrypted plaintext contains all company passwords and credentials. Never commit this file to Git or public storage. Proceed?'
    )
  ) {
    return
  }

  try {
    const rawData = exportVault()
    const jsonStr = JSON.stringify(rawData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `dbb-company-vault-unencrypted-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    warning('Plaintext Exported', 'Keep this unencrypted backup file strictly secure.')
  } catch (err: any) {
    error('Export Failed', err.message || 'Failed to export vault.')
  }
}

// Handle File Selection
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  importFileName.value = file.name
  previewData.value = null
  importResult.value = null

  const reader = new FileReader()
  reader.onload = async (e) => {
    importRawContent.value = e.target?.result as string
    await analyzeImportFile()
  }
  reader.readAsText(file)
}

// Analyze File Content
async function analyzeImportFile() {
  if (!importRawContent.value) return

  isAnalyzing.value = true
  try {
    let parsed: any
    try {
      parsed = JSON.parse(importRawContent.value)
    } catch {
      throw new Error('Selected file is not valid JSON.')
    }

    if (parsed.encrypted || (parsed.version && parsed.salt && parsed.iv && parsed.data)) {
      importRequiresPassphrase.value = true
      if (!importPassphrase.value) {
        // Need user to input password first
        previewData.value = null
        isAnalyzing.value = false
        return
      }

      const decrypted = await decryptBackupPayload(importRawContent.value, importPassphrase.value)
      previewData.value = decrypted
    } else {
      importRequiresPassphrase.value = false
      previewData.value = parsed
    }
  } catch (err: any) {
    error('Analysis Error', err.message || 'Failed to inspect backup file.')
    previewData.value = null
  } finally {
    isAnalyzing.value = false
  }
}

// Run Decrypt on Passphrase Submit
async function handleUnlockBackup() {
  if (!importPassphrase.value) {
    error('Password Required', 'Please enter the backup decryption password.')
    return
  }
  await analyzeImportFile()
}

// Perform Import
function handleExecuteImport() {
  if (!previewData.value || !Array.isArray(previewData.value.items)) {
    error('Import Failed', 'No valid items found to import.')
    return
  }

  isImporting.value = true
  try {
    const res = importVault(previewData.value, importStrategy.value)
    importResult.value = res
    success(
      'Import Completed',
      `Imported: ${res.importedCount}, Updated: ${res.updatedCount}, Skipped: ${res.skippedCount}`
    )
  } catch (err: any) {
    error('Import Error', err.message || 'Failed to complete vault import.')
  } finally {
    isImporting.value = false
  }
}

function resetImportState() {
  importRawContent.value = null
  importFileName.value = ''
  importPassphrase.value = ''
  importRequiresPassphrase.value = false
  previewData.value = null
  importResult.value = null
  if (importFileInput.value) importFileInput.value.value = ''
}
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-border">
      <div>
        <h2 class="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield class="w-6 h-6 text-primary" />
          <span>Backup & Restore</span>
        </h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Export and restore AES-256-GCM encrypted company credential backups.
        </p>
      </div>
    </div>

    <!-- Security Warning Banner -->
    <div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400 space-y-1 shadow-sm">
      <div class="flex items-center gap-2 font-bold text-sm">
        <AlertTriangle class="w-4 h-4 shrink-0" />
        <span>Important Security Warning</span>
      </div>
      <p class="leading-relaxed">
        Never commit plaintext credential exports to Git, public repositories, or cloud notes. Only encrypted backups protected by a strong passphrase should be stored outside the local vault.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- ================= SECTION: EXPORT BACKUP ================= -->
      <div class="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5 flex flex-col justify-between">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-foreground flex items-center gap-2">
              <Download class="w-5 h-5 text-primary" />
              <span>Export Encrypted Vault</span>
            </h3>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {{ activeItems.length }} Company Items
            </span>
          </div>

          <p class="text-xs text-muted-foreground leading-relaxed">
            Generates a tamper-proof JSON backup file encrypted using AES-256-GCM with PBKDF2-SHA256 key derivation.
          </p>

          <form @submit.prevent="handleExport" class="space-y-3 pt-2">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Backup Encryption Passphrase</label>
              <input
                v-model="exportPassphrase"
                type="password"
                required
                placeholder="Enter strong encryption passphrase"
                class="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Confirm Passphrase</label>
              <input
                v-model="confirmExportPassphrase"
                type="password"
                required
                placeholder="Re-enter encryption passphrase"
                class="w-full px-3.5 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="isExporting || !exportPassphrase || exportPassphrase !== confirmExportPassphrase"
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
              >
                <Lock class="w-4 h-4" />
                <span v-if="isExporting">Encrypting Vault...</span>
                <span v-else>Download Encrypted Backup (.json)</span>
              </button>
            </div>
          </form>
        </div>

        <div class="pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Unencrypted export (Advanced):</span>
          <button
            type="button"
            @click="handlePlaintextExport"
            class="text-rose-500 hover:text-rose-600 font-semibold hover:underline"
          >
            Export Plaintext JSON
          </button>
        </div>
      </div>

      <!-- ================= SECTION: IMPORT / RESTORE ================= -->
      <div class="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-5 flex flex-col justify-between">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-foreground flex items-center gap-2">
              <Upload class="w-5 h-5 text-primary" />
              <span>Restore from Backup</span>
            </h3>
            <button
              v-if="previewData || importResult"
              @click="resetImportState"
              class="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Reset
            </button>
          </div>

          <p class="text-xs text-muted-foreground leading-relaxed">
            Select a DBB company vault JSON backup file. Supports encrypted payloads and legacy JSON exports.
          </p>

          <!-- File Upload Zone -->
          <div
            v-if="!previewData && !importResult"
            @click="importFileInput?.click()"
            class="p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 cursor-pointer text-center space-y-2 transition"
          >
            <input
              ref="importFileInput"
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="handleFileChange"
            />
            <div class="p-3 rounded-full bg-primary/10 text-primary w-fit mx-auto">
              <FileJson class="w-6 h-6" />
            </div>
            <div class="text-xs font-semibold text-foreground">
              {{ importFileName ? importFileName : 'Click or Drag & Drop Backup JSON' }}
            </div>
            <div class="text-[11px] text-muted-foreground">
              .json files only
            </div>
          </div>

          <!-- Decryption Prompt if file is encrypted -->
          <div
            v-if="importRequiresPassphrase && !previewData && !importResult"
            class="p-4 rounded-xl border border-border bg-muted/40 space-y-3 animate-in fade-in"
          >
            <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Lock class="w-4 h-4 text-primary" />
              <span>Encrypted Backup Detected</span>
            </div>
            <p class="text-[11px] text-muted-foreground">
              Enter the passphrase used when this backup file was created.
            </p>
            <div class="flex gap-2">
              <input
                v-model="importPassphrase"
                @keydown.enter.prevent="handleUnlockBackup"
                type="password"
                placeholder="Enter backup passphrase"
                class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <button
                @click="handleUnlockBackup"
                :disabled="isAnalyzing || !importPassphrase"
                class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
              >
                Unlock
              </button>
            </div>
          </div>

          <!-- Preview & Conflict Strategy Box -->
          <div v-if="previewData && !importResult" class="space-y-4 animate-in fade-in">
            <div class="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-foreground">
                <span>Backup Preview</span>
                <span class="text-primary font-mono">{{ previewData.items?.length || 0 }} Items</span>
              </div>
              <div class="text-[11px] text-muted-foreground space-y-0.5">
                <div>Export Date: {{ previewData.exportedAt ? new Date(previewData.exportedAt).toLocaleString() : 'N/A' }}</div>
                <div>Format: {{ previewData.format || 'Standard DBB' }} (v{{ previewData.version || 1 }})</div>
              </div>
            </div>

            <!-- Conflict Strategy Selector -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Conflict Resolution Strategy</label>
              <div class="grid grid-cols-3 gap-2">
                <label
                  class="p-2 rounded-lg border text-center cursor-pointer text-xs font-medium transition"
                  :class="
                    importStrategy === 'update'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  "
                >
                  <input type="radio" v-model="importStrategy" value="update" class="hidden" />
                  <span>Update Matching</span>
                </label>

                <label
                  class="p-2 rounded-lg border text-center cursor-pointer text-xs font-medium transition"
                  :class="
                    importStrategy === 'new'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  "
                >
                  <input type="radio" v-model="importStrategy" value="new" class="hidden" />
                  <span>Add as New</span>
                </label>

                <label
                  class="p-2 rounded-lg border text-center cursor-pointer text-xs font-medium transition"
                  :class="
                    importStrategy === 'skip'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  "
                >
                  <input type="radio" v-model="importStrategy" value="skip" class="hidden" />
                  <span>Skip Existing</span>
                </label>
              </div>
            </div>

            <!-- Import Action Button -->
            <button
              @click="handleExecuteImport"
              :disabled="isImporting"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span v-if="isImporting">Importing Credentials...</span>
              <span v-else>Restore {{ previewData.items?.length || 0 }} Items</span>
            </button>
          </div>

          <!-- Completed Result Banner -->
          <div
            v-if="importResult"
            class="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 space-y-2 animate-in fade-in"
          >
            <div class="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 class="w-4 h-4" />
              <span>Import Completed Successfully</span>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
              <div class="p-2 rounded bg-background/50 border border-emerald-500/20">
                <div class="text-base font-extrabold">{{ importResult.importedCount }}</div>
                <div class="text-[10px] uppercase">New Items</div>
              </div>
              <div class="p-2 rounded bg-background/50 border border-emerald-500/20">
                <div class="text-base font-extrabold">{{ importResult.updatedCount }}</div>
                <div class="text-[10px] uppercase">Updated</div>
              </div>
              <div class="p-2 rounded bg-background/50 border border-emerald-500/20">
                <div class="text-base font-extrabold">{{ importResult.skippedCount }}</div>
                <div class="text-[10px] uppercase">Skipped</div>
              </div>
            </div>
            <button
              @click="resetImportState"
              class="text-xs text-primary font-semibold hover:underline pt-1 block"
            >
              Restore another file
            </button>
          </div>
        </div>

        <div class="pt-4 border-t border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
          <span>Restored data is saved directly to your local offline database.</span>
        </div>
      </div>
    </div>
  </div>
</template>
