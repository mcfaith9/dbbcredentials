<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VaultItem } from '@/types'
import { exportEmployeesToFile } from '@/services/employeeService'
import { useToast } from '@/composables/useToast'
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  X,
} from '@lucide/vue'

const props = defineProps<{
  open: boolean
  allItems: VaultItem[]
  filteredItems: VaultItem[]
  selectedIds: string[]
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { success } = useToast()

const format = ref<'json' | 'xlsx' | 'csv'>('json')
const exportScope = ref<'all' | 'filtered' | 'selected'>(
  props.selectedIds.length > 0 ? 'selected' : 'all'
)
const filenamePrefix = ref('DBB_Employee_Masterlist')

const targetItems = computed(() => {
  if (exportScope.value === 'selected') {
    return props.allItems.filter((i) => props.selectedIds.includes(i.id))
  }
  if (exportScope.value === 'filtered') {
    return props.filteredItems
  }
  return props.allItems
})

function handleExport() {
  if (targetItems.value.length === 0) return

  exportEmployeesToFile(targetItems.value, format.value, filenamePrefix.value.trim() || 'DBB_Employees')
  success(
    'Export Complete',
    `Successfully exported ${targetItems.value.length} employee records as .${format.value}`
  )
  emit('update:open', false)
}

function handleClose() {
  emit('update:open', false)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150 select-none"
  >
    <div
      class="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="p-5 border-b border-border flex items-center justify-between bg-muted/20">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Download class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-foreground">Export Employee Records</h3>
            <p class="text-xs text-muted-foreground">Download employee roster in JSON or spreadsheet format</p>
          </div>
        </div>

        <button
          @click="handleClose"
          class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-5">
        <!-- 1. Export Scope Selection -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-foreground block">Select Export Scope</label>
          <div class="grid grid-cols-1 gap-2">
            <!-- All -->
            <label
              class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition"
              :class="
                exportScope === 'all'
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card/60 text-muted-foreground hover:border-muted-foreground'
              "
            >
              <div class="flex items-center gap-2.5">
                <input
                  type="radio"
                  v-model="exportScope"
                  value="all"
                  class="text-primary focus:ring-primary"
                />
                <div>
                  <span class="text-xs font-bold block text-foreground">All Employees</span>
                  <span class="text-[11px] text-muted-foreground">Export complete directory database</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-foreground">
                {{ allItems.length }} records
              </span>
            </label>

            <!-- Filtered -->
            <label
              class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition"
              :class="
                exportScope === 'filtered'
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card/60 text-muted-foreground hover:border-muted-foreground'
              "
            >
              <div class="flex items-center gap-2.5">
                <input
                  type="radio"
                  v-model="exportScope"
                  value="filtered"
                  class="text-primary focus:ring-primary"
                />
                <div>
                  <span class="text-xs font-bold block text-foreground">Current Filtered View</span>
                  <span class="text-[11px] text-muted-foreground">Matching search & department filters</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-foreground">
                {{ filteredItems.length }} records
              </span>
            </label>

            <!-- Selected -->
            <label
              v-if="selectedIds.length > 0"
              class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition"
              :class="
                exportScope === 'selected'
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-card/60 text-muted-foreground hover:border-muted-foreground'
              "
            >
              <div class="flex items-center gap-2.5">
                <input
                  type="radio"
                  v-model="exportScope"
                  value="selected"
                  class="text-primary focus:ring-primary"
                />
                <div>
                  <span class="text-xs font-bold block text-foreground">Selected Employees Only</span>
                  <span class="text-[11px] text-muted-foreground">Specifically checked table rows</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                {{ selectedIds.length }} selected
              </span>
            </label>
          </div>
        </div>

        <!-- 2. Format Selection -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-foreground block">File Format</label>
          <div class="grid grid-cols-3 gap-2">
            <!-- JSON -->
            <button
              type="button"
              @click="format = 'json'"
              class="p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition"
              :class="
                format === 'json'
                  ? 'border-primary bg-primary/10 text-primary font-bold'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted'
              "
            >
              <div class="flex items-center justify-between">
                <FileCode class="w-4 h-4 text-primary" />
                <span class="text-[10px] font-mono uppercase bg-primary/20 px-1 rounded">JSON</span>
              </div>
              <div>
                <span class="text-xs font-bold block text-foreground">JSON File</span>
                <span class="text-[10px] text-muted-foreground font-mono">.json</span>
              </div>
            </button>

            <!-- XLSX -->
            <button
              type="button"
              @click="format = 'xlsx'"
              class="p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition"
              :class="
                format === 'xlsx'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted'
              "
            >
              <div class="flex items-center justify-between">
                <FileSpreadsheet class="w-4 h-4 text-emerald-600" />
                <span class="text-[10px] font-mono uppercase bg-emerald-500/20 px-1 rounded">Excel</span>
              </div>
              <div>
                <span class="text-xs font-bold block text-foreground">Workbook</span>
                <span class="text-[10px] text-muted-foreground font-mono">.xlsx</span>
              </div>
            </button>

            <!-- CSV -->
            <button
              type="button"
              @click="format = 'csv'"
              class="p-2.5 rounded-xl border text-left flex flex-col gap-1.5 transition"
              :class="
                format === 'csv'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 font-bold'
                  : 'border-border bg-card/60 text-muted-foreground hover:bg-muted'
              "
            >
              <div class="flex items-center justify-between">
                <FileText class="w-4 h-4 text-blue-600" />
                <span class="text-[10px] font-mono uppercase bg-blue-500/20 px-1 rounded">CSV</span>
              </div>
              <div>
                <span class="text-xs font-bold block text-foreground">Text CSV</span>
                <span class="text-[10px] text-muted-foreground font-mono">.csv</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 3. Filename -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-foreground block">File Name Prefix</label>
          <input
            v-model="filenamePrefix"
            type="text"
            placeholder="DBB_Employees"
            class="w-full px-3.5 py-2 text-xs rounded-xl border border-input bg-card/60 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
        <span class="text-xs text-muted-foreground">
          Ready to export <strong>{{ targetItems.length }}</strong> employees
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="handleClose"
            class="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition"
          >
            Cancel
          </button>
          <button
            @click="handleExport"
            :disabled="targetItems.length === 0"
            class="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
          >
            <Download class="w-4 h-4" />
            <span>Export Now</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
