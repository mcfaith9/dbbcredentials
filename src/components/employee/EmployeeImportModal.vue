<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VaultItem } from '@/types'
import type { AnalyzedImportRow, EmployeeRecord, ImportExecutionReport } from '@/types/employee'
import {
  parseEmployeeImportFile,
  analyzeImportRows,
  executeImportPlan,
  downloadEmployeeTemplate,
} from '@/services/employeeService'
import { useToast } from '@/composables/useToast'
import EmployeeConflictDiffModal from './EmployeeConflictDiffModal.vue'
import {
  Upload,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  X,
  ArrowLeft,
  Search,
  Download,
  Check,
  Eye,
  Layers,
  Sparkles,
} from '@lucide/vue'

const props = defineProps<{
  open: boolean
  existingVaultItems: VaultItem[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'imported', updatedItems: VaultItem[], report: ImportExecutionReport): void
}>()

const { success, error: toastError } = useToast()

// Step state: 1 = upload, 2 = review/actions, 3 = complete
const currentStep = ref<1 | 2 | 3>(1)
const isDragging = ref(false)
const isLoading = ref(false)
const uploadedFileName = ref('')

// Parsing results
const headers = ref<string[]>([])
const headerMapping = ref<Record<string, keyof EmployeeRecord | null>>({})
const rawRows = ref<Record<string, any>[]>([])
const analyzedRows = ref<AnalyzedImportRow[]>([])

// Review filtering & search
const filterStatus = ref<'all' | 'new' | 'exact' | 'possible' | 'incomplete'>('all')
const reviewSearchQuery = ref('')

// Conflict diff inspector modal
const inspectingRow = ref<AnalyzedImportRow | null>(null)
const showDiffModal = ref(false)

// Execution report
const executionReport = ref<ImportExecutionReport | null>(null)

// Stats
const stats = computed(() => {
  const total = analyzedRows.value.length
  const newCount = analyzedRows.value.filter((r) => r.confidence === 'none').length
  const exactCount = analyzedRows.value.filter((r) => r.confidence === 'exact').length
  const possibleCount = analyzedRows.value.filter((r) => r.confidence === 'possible').length
  const warningCount = analyzedRows.value.filter((r) => r.hasMissingImportantInfo).length
  return { total, newCount, exactCount, possibleCount, warningCount }
})

// Filtered review rows
const filteredAnalyzedRows = computed(() => {
  return analyzedRows.value.filter((r) => {
    // Status filter
    if (filterStatus.value === 'new' && r.confidence !== 'none') return false
    if (filterStatus.value === 'exact' && r.confidence !== 'exact') return false
    if (filterStatus.value === 'possible' && r.confidence !== 'possible') return false
    if (filterStatus.value === 'incomplete' && !r.hasMissingImportantInfo) return false

    // Search query
    if (reviewSearchQuery.value.trim()) {
      const q = reviewSearchQuery.value.toLowerCase()
      const name = (r.data.name || '').toLowerCase()
      const id = (r.data.dmbb_id || '').toLowerCase()
      const dept = (r.data.department || '').toLowerCase()
      const sss = (r.data.sss_no || '').toLowerCase()
      const tin = (r.data.tin_no || '').toLowerCase()
      return (
        name.includes(q) ||
        id.includes(q) ||
        dept.includes(q) ||
        sss.includes(q) ||
        tin.includes(q)
      )
    }

    return true
  })
})

async function processFile(file: File) {
  if (!file) return
  isLoading.value = true
  uploadedFileName.value = file.name

  try {
    const parseResult = await parseEmployeeImportFile(file)
    headers.value = parseResult.headers
    headerMapping.value = parseResult.headerMapping
    rawRows.value = parseResult.rawRows

    // Analyze rows with existing vault items
    analyzedRows.value = analyzeImportRows(
      parseResult.rawRows,
      props.existingVaultItems,
      parseResult.headerMapping
    )

    currentStep.value = 2
    success(
      'File Processed Successfully',
      `Parsed ${analyzedRows.value.length} employee rows from ${file.name}`
    )
  } catch (err: any) {
    toastError('Import Failed', err?.message || 'Could not parse employee file')
  } finally {
    isLoading.value = false
  }
}

function handleFileInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processFile(target.files[0])
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    processFile(e.dataTransfer.files[0])
  }
}

// Bulk Actions
function setAllAction(action: AnalyzedImportRow['action'], targetGroup?: 'exact' | 'possible' | 'new' | 'all') {
  analyzedRows.value.forEach((r) => {
    if (!targetGroup || targetGroup === 'all') {
      r.action = action
    } else if (targetGroup === 'exact' && r.confidence === 'exact') {
      r.action = action
    } else if (targetGroup === 'possible' && r.confidence === 'possible') {
      r.action = action
    } else if (targetGroup === 'new' && r.confidence === 'none') {
      r.action = action
    }
  })
}

function inspectRowDiff(row: AnalyzedImportRow) {
  inspectingRow.value = row
  showDiffModal.value = true
}

function onDiffResolved(resolutions: Record<string, string>) {
  if (!inspectingRow.value) return
  if (!inspectingRow.value.conflictFields) {
    inspectingRow.value.conflictFields = []
  }

  Object.entries(resolutions).forEach(([field, resolvedVal]) => {
    const existingCf = inspectingRow.value?.conflictFields?.find((c) => c.field === field)
    if (existingCf) {
      existingCf.resolvedValue = resolvedVal
    }
  })

  // Ensure action is set to merge
  inspectingRow.value.action = 'merge'
  success('Merge Strategy Updated', `Saved custom field resolutions for row #${inspectingRow.value.rowNumber}`)
}

function executeImport() {
  isLoading.value = true
  try {
    const { updatedItems, report } = executeImportPlan(
      analyzedRows.value,
      props.existingVaultItems
    )

    executionReport.value = report
    currentStep.value = 3
    emit('imported', updatedItems, report)
    success(
      'Import Completed',
      `Added ${report.addedCount}, updated ${report.updatedCount}, merged ${report.mergedCount}, skipped ${report.skippedCount}`
    )
  } catch (err: any) {
    toastError('Import Error', err?.message || 'Failed to execute import plan')
  } finally {
    isLoading.value = false
  }
}

function resetImport() {
  currentStep.value = 1
  uploadedFileName.value = ''
  analyzedRows.value = []
  headers.value = []
  rawRows.value = []
  executionReport.value = null
  filterStatus.value = 'all'
  reviewSearchQuery.value = ''
}

function handleClose() {
  emit('update:open', false)
  if (currentStep.value === 3) {
    resetImport()
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150 select-none"
  >
    <div
      class="bg-card w-full max-w-5xl rounded-2xl border border-border shadow-2xl flex flex-col h-[92vh] max-h-[850px] overflow-hidden animate-in zoom-in-95 duration-150"
    >
      <!-- Top Modal Header -->
      <div class="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Upload class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-bold text-foreground truncate">
                Import Employee Masterlist
              </h3>
              <span
                v-if="uploadedFileName"
                class="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[11px] font-mono bg-muted text-muted-foreground border border-border truncate max-w-[200px]"
              >
                {{ uploadedFileName }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground truncate">
              Supports JSON file imports with intelligent deduplication, fuzzy column mapping, and safe merge
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Download Template Buttons -->
          <button
            @click="downloadEmployeeTemplate('json')"
            class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition"
            title="Download sample JSON template"
          >
            <FileCode class="w-3.5 h-3.5" />
            <span>Sample JSON Template</span>
          </button>

          <button
            @click="downloadEmployeeTemplate('xlsx')"
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground transition"
            title="Download sample Excel template"
          >
            <FileSpreadsheet class="w-3.5 h-3.5 text-emerald-500" />
            <span>Excel Template</span>
          </button>

          <button
            @click="handleClose"
            class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Step Indicator Bar -->
      <div class="px-5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-xs shrink-0">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2" :class="currentStep >= 1 ? 'text-primary font-bold' : 'text-muted-foreground'">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" :class="currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">
              1
            </span>
            <span>Upload JSON / File</span>
          </div>

          <div class="w-8 h-px bg-border"></div>

          <div class="flex items-center gap-2" :class="currentStep >= 2 ? 'text-primary font-bold' : 'text-muted-foreground'">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" :class="currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">
              2
            </span>
            <span>Intelligent Deduplication & Review</span>
          </div>

          <div class="w-8 h-px bg-border"></div>

          <div class="flex items-center gap-2" :class="currentStep === 3 ? 'text-primary font-bold' : 'text-muted-foreground'">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" :class="currentStep === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">
              3
            </span>
            <span>Import Report</span>
          </div>
        </div>
      </div>

      <!-- Main Step Body -->
      <div class="flex-1 overflow-hidden flex flex-col min-h-0 bg-card">
        <!-- ================= STEP 1: UPLOAD ================= -->
        <div
          v-if="currentStep === 1"
          class="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center text-center overflow-y-auto"
        >
          <div
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            class="w-full max-w-xl p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer"
            :class="
              isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border/80 hover:border-primary/50 bg-muted/10 hover:bg-muted/30'
            "
            @click="($refs.fileInput as HTMLInputElement)?.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".json, .xlsx, .xls, .csv, application/json, text/csv"
              class="hidden"
              @change="handleFileInput"
            />

            <div class="p-4 rounded-2xl bg-primary/10 text-primary flex items-center gap-2">
              <FileCode class="w-8 h-8" />
              <FileSpreadsheet class="w-6 h-6 opacity-75" />
            </div>

            <div class="space-y-1">
              <h4 class="text-base font-bold text-foreground">
                Drop your Employee JSON or Spreadsheet file here
              </h4>
              <p class="text-xs text-muted-foreground max-w-md">
                Upload your structured <strong class="text-foreground">.json</strong> file (or .xlsx, .csv). Fields and records will be mapped and analyzed automatically.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-primary/10 text-primary border border-primary/20">
                .JSON (Recommended)
              </span>
              <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-muted text-muted-foreground border border-border">
                .XLSX
              </span>
              <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-muted text-muted-foreground border border-border">
                .CSV
              </span>
            </div>

            <button
              type="button"
              class="px-5 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              Browse Computer
            </button>
          </div>

          <!-- Quick Templates Bar -->
          <div class="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Need a sample file?</span>
            <button
              @click="downloadEmployeeTemplate('json')"
              class="text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <Download class="w-3 h-3" />
              Download Sample JSON
            </button>
            <span>•</span>
            <button
              @click="downloadEmployeeTemplate('xlsx')"
              class="text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
            >
              Sample Excel (.xlsx)
            </button>
          </div>

          <!-- Feature Bullets -->
          <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl text-left">
            <div class="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-1">
              <div class="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Sparkles class="w-3.5 h-3.5 text-primary" />
                <span>JSON & Array Support</span>
              </div>
              <p class="text-[11px] text-muted-foreground">
                Accepts arrays of employee objects, vault backup JSON, or custom key-value property lists.
              </p>
            </div>

            <div class="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-1">
              <div class="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Layers class="w-3.5 h-3.5 text-amber-500" />
                <span>Multi-tier Deduplication</span>
              </div>
              <p class="text-[11px] text-muted-foreground">
                Matches strong identifiers (DMBB ID, SSS, TIN) or name + birthdate with clear duplicate reasons.
              </p>
            </div>

            <div class="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-1">
              <div class="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
                <span>Safe Conflict Resolution</span>
              </div>
              <p class="text-[11px] text-muted-foreground">
                Choose to merge and fill missing information without overwriting existing sensitive employee data.
              </p>
            </div>
          </div>
        </div>

        <!-- ================= STEP 2: REVIEW & DEDUPLICATION ================= -->
        <div v-else-if="currentStep === 2" class="flex-1 flex flex-col min-h-0 overflow-hidden">
          <!-- Summary Metrics Cards -->
          <div class="p-4 border-b border-border bg-muted/10 grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0">
            <!-- Total -->
            <div
              @click="filterStatus = 'all'"
              class="p-2.5 rounded-xl border cursor-pointer transition text-left"
              :class="filterStatus === 'all' ? 'border-primary bg-primary/10 font-bold' : 'border-border bg-card/60 hover:bg-muted/40'"
            >
              <span class="text-[10px] text-muted-foreground block uppercase tracking-wider">Total Rows</span>
              <span class="text-base font-bold text-foreground">{{ stats.total }}</span>
            </div>

            <!-- New -->
            <div
              @click="filterStatus = 'new'"
              class="p-2.5 rounded-xl border cursor-pointer transition text-left"
              :class="filterStatus === 'new' ? 'border-emerald-500 bg-emerald-500/10 font-bold' : 'border-border bg-card/60 hover:bg-muted/40'"
            >
              <span class="text-[10px] text-emerald-600 block uppercase tracking-wider">New Employees</span>
              <span class="text-base font-bold text-emerald-600">{{ stats.newCount }}</span>
            </div>

            <!-- Exact Duplicates -->
            <div
              @click="filterStatus = 'exact'"
              class="p-2.5 rounded-xl border cursor-pointer transition text-left"
              :class="filterStatus === 'exact' ? 'border-rose-500 bg-rose-500/10 font-bold' : 'border-border bg-card/60 hover:bg-muted/40'"
            >
              <span class="text-[10px] text-rose-600 block uppercase tracking-wider">Exact Duplicates</span>
              <span class="text-base font-bold text-rose-600">{{ stats.exactCount }}</span>
            </div>

            <!-- Possible Duplicates -->
            <div
              @click="filterStatus = 'possible'"
              class="p-2.5 rounded-xl border cursor-pointer transition text-left"
              :class="filterStatus === 'possible' ? 'border-amber-500 bg-amber-500/10 font-bold' : 'border-border bg-card/60 hover:bg-muted/40'"
            >
              <span class="text-[10px] text-amber-600 block uppercase tracking-wider">Possible Matches</span>
              <span class="text-base font-bold text-amber-600">{{ stats.possibleCount }}</span>
            </div>

            <!-- Incomplete / Warnings -->
            <div
              @click="filterStatus = 'incomplete'"
              class="p-2.5 rounded-xl border cursor-pointer transition text-left"
              :class="filterStatus === 'incomplete' ? 'border-yellow-500 bg-yellow-500/10 font-bold' : 'border-border bg-card/60 hover:bg-muted/40'"
            >
              <span class="text-[10px] text-yellow-600 block uppercase tracking-wider">Missing Key Data</span>
              <span class="text-base font-bold text-yellow-600">{{ stats.warningCount }}</span>
            </div>
          </div>

          <!-- Filter & Bulk Action Toolbar -->
          <div class="p-3 border-b border-border bg-card flex items-center justify-between gap-3 flex-wrap shrink-0">
            <!-- Search bar -->
            <div class="flex-1 min-w-[200px] max-w-xs relative">
              <Search class="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="reviewSearchQuery"
                type="text"
                placeholder="Filter rows by name, ID, SSS..."
                class="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-input bg-card/60 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <!-- Bulk Strategy Actions -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[11px] font-semibold text-muted-foreground mr-1">Batch Actions:</span>
              <button
                @click="setAllAction('merge', 'exact')"
                class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition"
                title="Merge and fill empty fields for all exact duplicate records"
              >
                Merge Exact Duplicates
              </button>

              <button
                @click="setAllAction('skip', 'exact')"
                class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition"
                title="Skip all exact duplicate records"
              >
                Skip Exact Duplicates
              </button>

              <button
                @click="setAllAction('new', 'new')"
                class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition"
              >
                Import All New
              </button>
            </div>
          </div>

          <!-- Table of Analyzed Rows -->
          <div class="flex-1 overflow-y-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead class="sticky top-0 bg-muted/90 backdrop-blur-xs z-10 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th class="py-2.5 px-3 w-12 text-center">#</th>
                  <th class="py-2.5 px-3">Employee Name</th>
                  <th class="py-2.5 px-3">Dept & Position</th>
                  <th class="py-2.5 px-3">Government IDs / ID No.</th>
                  <th class="py-2.5 px-3">Detection Status & Reason</th>
                  <th class="py-2.5 px-3 w-40 text-right">Import Action</th>
                  <th class="py-2.5 px-3 w-12 text-center">Diff</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr
                  v-for="row in filteredAnalyzedRows"
                  :key="row.rowNumber"
                  class="hover:bg-muted/30 transition group"
                  :class="{
                    'bg-rose-500/5': row.confidence === 'exact',
                    'bg-amber-500/5': row.confidence === 'possible',
                    'opacity-60': row.action === 'skip',
                  }"
                >
                  <!-- Row Number -->
                  <td class="py-2.5 px-3 text-center text-muted-foreground font-mono font-medium">
                    {{ row.rowNumber }}
                  </td>

                  <!-- Employee Name & DOB -->
                  <td class="py-2.5 px-3 font-semibold text-foreground">
                    <div class="flex items-center gap-1.5">
                      <span>{{ row.data.name || '(No Name Provided)' }}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span v-if="row.data.dmbb_id" class="text-[10px] font-mono text-muted-foreground">
                        ID: {{ row.data.dmbb_id }}
                      </span>
                      <span v-if="row.data.birthdate" class="text-[10px] text-muted-foreground">
                        DOB: <span class="font-medium text-foreground/80">{{ row.data.birthdate }}</span>
                      </span>
                    </div>
                  </td>

                  <!-- Dept & Position -->
                  <td class="py-2.5 px-3">
                    <span class="font-medium text-foreground block">{{ row.data.department || '—' }}</span>
                    <span class="text-[11px] text-muted-foreground block">{{ row.data.position || '—' }}</span>
                  </td>

                  <!-- Government IDs -->
                  <td class="py-2.5 px-3 font-mono text-[11px]">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span v-if="row.data.sss_no" class="text-muted-foreground" title="SSS">
                        SSS: {{ row.data.sss_no }}
                      </span>
                      <span v-if="row.data.tin_no" class="text-muted-foreground" title="TIN">
                        TIN: {{ row.data.tin_no }}
                      </span>
                      <span v-if="row.data.hdmf_no" class="text-muted-foreground" title="HDMF">
                        HDMF: {{ row.data.hdmf_no }}
                      </span>
                      <span v-if="!row.data.sss_no && !row.data.tin_no && !row.data.hdmf_no" class="text-muted-foreground/40 italic">
                        No Gov IDs
                      </span>
                    </div>
                  </td>

                  <!-- Duplicate Reason / Confidence Badge -->
                  <td class="py-2.5 px-3">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <!-- Badge -->
                      <span
                        v-if="row.confidence === 'none'"
                        class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      >
                        New
                      </span>
                      <span
                        v-else-if="row.confidence === 'exact'"
                        class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20"
                      >
                        Exact Match
                      </span>
                      <span
                        v-else-if="row.confidence === 'possible'"
                        class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      >
                        Possible Match
                      </span>

                      <!-- Warnings -->
                      <span
                        v-if="row.hasMissingImportantInfo || (row.formatWarnings && row.formatWarnings.length > 0)"
                        class="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        :title="[...row.missingInfoReasons, ...(row.formatWarnings || [])].join(', ')"
                      >
                        Needs Review
                      </span>
                    </div>

                    <!-- Warning explanation -->
                    <div v-if="row.formatWarnings && row.formatWarnings.length > 0" class="mt-1 space-y-0.5">
                      <span
                        v-for="warn in row.formatWarnings"
                        :key="warn"
                        class="text-[10px] text-amber-600 dark:text-amber-400 block font-medium"
                      >
                        ⚠ {{ warn }}
                      </span>
                    </div>

                    <!-- Duplicate explanation -->
                    <div v-if="row.matchReasons && row.matchReasons.length > 0" class="mt-1 space-y-0.5">
                      <span
                        v-for="reason in row.matchReasons"
                        :key="reason.field"
                        class="text-[10px] text-muted-foreground block"
                      >
                        • {{ reason.description || reason.label }}
                      </span>
                    </div>
                  </td>

                  <!-- Action Selection Dropdown -->
                  <td class="py-2.5 px-3 text-right">
                    <select
                      v-model="row.action"
                      class="px-2 py-1 text-xs rounded-lg border border-input bg-card text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
                      :class="{
                        'border-rose-500/40 text-rose-600': row.action === 'skip',
                        'border-emerald-500/40 text-emerald-600': row.action === 'new',
                        'border-blue-500/40 text-blue-600': row.action === 'merge',
                        'border-amber-500/40 text-amber-600': row.action === 'update',
                      }"
                    >
                      <option value="new">Import as New</option>
                      <option v-if="row.matchedItem" value="merge">Merge (Fill Missing)</option>
                      <option v-if="row.matchedItem" value="update">Overwrite Existing</option>
                      <option value="skip">Skip Row</option>
                    </select>
                  </td>

                  <!-- Inspect Diff Button -->
                  <td class="py-2.5 px-3 text-center">
                    <button
                      v-if="row.matchedItem"
                      @click="inspectRowDiff(row)"
                      class="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition"
                      title="Inspect field differences and customize merge resolution"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ================= STEP 3: COMPLETED REPORT ================= -->
        <div
          v-else-if="currentStep === 3 && executionReport"
          class="flex-1 p-8 sm:p-12 flex flex-col items-center justify-center text-center overflow-y-auto"
        >
          <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
            <CheckCircle2 class="w-8 h-8" />
          </div>

          <h3 class="text-xl font-bold text-foreground">Employee Import Complete</h3>
          <p class="text-xs text-muted-foreground mt-1 max-w-sm">
            The employee masterlist was processed according to your deduplication and merge instructions.
          </p>

          <!-- Execution Breakdown Grid -->
          <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl text-left">
            <div class="p-4 rounded-2xl border border-border bg-card/60">
              <span class="text-[11px] font-semibold text-muted-foreground block">New Added</span>
              <span class="text-2xl font-bold text-emerald-600">{{ executionReport.addedCount }}</span>
            </div>

            <div class="p-4 rounded-2xl border border-border bg-card/60">
              <span class="text-[11px] font-semibold text-muted-foreground block">Merged & Enriched</span>
              <span class="text-2xl font-bold text-blue-600">{{ executionReport.mergedCount }}</span>
            </div>

            <div class="p-4 rounded-2xl border border-border bg-card/60">
              <span class="text-[11px] font-semibold text-muted-foreground block">Overwritten</span>
              <span class="text-2xl font-bold text-amber-600">{{ executionReport.updatedCount }}</span>
            </div>

            <div class="p-4 rounded-2xl border border-border bg-card/60">
              <span class="text-[11px] font-semibold text-muted-foreground block">Skipped</span>
              <span class="text-2xl font-bold text-muted-foreground">{{ executionReport.skippedCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Modal Footer -->
      <div class="p-4 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
        <div>
          <button
            v-if="currentStep === 2"
            @click="currentStep = 1"
            class="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            <span>Upload Another File</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="handleClose"
            class="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition"
          >
            {{ currentStep === 3 ? 'Close' : 'Cancel' }}
          </button>

          <button
            v-if="currentStep === 2"
            @click="executeImport"
            :disabled="analyzedRows.length === 0 || isLoading"
            class="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
          >
            <Check class="w-4 h-4" />
            <span>Execute Import ({{ analyzedRows.filter(r => r.action !== 'skip').length }} records)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Side-by-side Conflict Diff Modal -->
    <EmployeeConflictDiffModal
      v-model:open="showDiffModal"
      :row="inspectingRow"
      @resolved="onDiffResolved"
    />
  </div>
</template>
