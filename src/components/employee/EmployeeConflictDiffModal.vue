<script setup lang="ts">
import { ref } from 'vue'
import type { AnalyzedImportRow } from '@/types/employee'
import { EMPLOYEE_FIELDS } from '@/services/employeeService'
import { X, Check, AlertTriangle } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  row: AnalyzedImportRow | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'resolved', resolutions: Record<string, string>): void
}>()

// Field-level resolution mapping: { fieldKey: selectedValue }
const localResolutions = ref<Record<string, string>>({})

function getExistingValue(fieldKey: string): string {
  if (!props.row?.matchedItem) return ''
  const item = props.row.matchedItem as any
  if (fieldKey === 'name') return item.full_name || item.name || ''
  if (fieldKey === 'dmbb_id') return item.dmbb_id || item.employee_id || ''
  if (fieldKey === 'contact_no') return item.contact_no || item.work_phone || item.phone || ''
  if (fieldKey === 'address') return item.address || item.office_address || ''
  return item[fieldKey] || ''
}

function getImportedValue(fieldKey: string): string {
  if (!props.row) return ''
  return (props.row.data as any)[fieldKey] || ''
}

function pickValue(fieldKey: string, val: string) {
  localResolutions.value[fieldKey] = val
}

function pickAllExisting() {
  EMPLOYEE_FIELDS.forEach((f) => {
    const existingVal = getExistingValue(f.key)
    if (existingVal) {
      localResolutions.value[f.key] = existingVal
    }
  })
}

function pickAllImported() {
  EMPLOYEE_FIELDS.forEach((f) => {
    const importedVal = getImportedValue(f.key)
    if (importedVal) {
      localResolutions.value[f.key] = importedVal
    }
  })
}

function handleSave() {
  emit('resolved', { ...localResolutions.value })
  emit('update:open', false)
}

function handleClose() {
  emit('update:open', false)
}
</script>

<template>
  <div
    v-if="open && row"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150 select-none"
  >
    <div
      class="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
    >
      <!-- Header -->
      <div class="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/20">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-foreground truncate">
              Conflict & Merge Inspector — Row #{{ row.rowNumber }}
            </h3>
            <p class="text-xs text-muted-foreground truncate">
              Comparing imported record with existing record "{{ row.matchedItem?.full_name || row.matchedItem?.name }}"
            </p>
          </div>
        </div>

        <button
          @click="handleClose"
          class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Match Reasons Banner -->
      <div class="px-5 py-3 bg-primary/5 border-b border-border text-xs flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-foreground">Why Matched:</span>
          <span
            v-for="r in row.matchReasons"
            :key="r.field"
            class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-background border border-border text-primary"
          >
            {{ r.description || r.label }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="pickAllExisting"
            class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground"
          >
            Keep All Existing
          </button>
          <button
            @click="pickAllImported"
            class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary"
          >
            Overwrite with Imported
          </button>
        </div>
      </div>

      <!-- Comparison Table -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5">
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <th class="py-2.5 px-3 w-1/4">Field Name</th>
              <th class="py-2.5 px-3 w-1/3">Existing Record</th>
              <th class="py-2.5 px-3 w-1/3">Imported Record</th>
              <th class="py-2.5 px-3 text-right">Resolved Value</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="f in EMPLOYEE_FIELDS"
              :key="f.key"
              class="hover:bg-muted/30"
              :class="{
                'bg-amber-500/5':
                  getExistingValue(f.key) &&
                  getImportedValue(f.key) &&
                  getExistingValue(f.key) !== getImportedValue(f.key),
              }"
            >
              <td class="py-2.5 px-3 font-semibold text-foreground align-top">
                {{ f.label }}
              </td>

              <!-- Existing Cell -->
              <td class="py-2.5 px-3 align-top font-mono">
                <div
                  v-if="getExistingValue(f.key)"
                  @click="pickValue(f.key, getExistingValue(f.key))"
                  class="p-1.5 rounded-lg border cursor-pointer text-xs flex items-center justify-between gap-1"
                  :class="
                    (localResolutions[f.key] || getExistingValue(f.key)) === getExistingValue(f.key)
                      ? 'border-primary bg-primary/10 text-foreground font-bold'
                      : 'border-border bg-card/60 text-muted-foreground hover:border-muted-foreground'
                  "
                >
                  <span class="truncate">{{ getExistingValue(f.key) }}</span>
                  <Check
                    v-if="(localResolutions[f.key] || getExistingValue(f.key)) === getExistingValue(f.key)"
                    class="w-3 h-3 text-primary shrink-0"
                  />
                </div>
                <span v-else class="text-muted-foreground/50 italic text-[11px]">(Empty)</span>
              </td>

              <!-- Imported Cell -->
              <td class="py-2.5 px-3 align-top font-mono">
                <div
                  v-if="getImportedValue(f.key)"
                  @click="pickValue(f.key, getImportedValue(f.key))"
                  class="p-1.5 rounded-lg border cursor-pointer text-xs flex items-center justify-between gap-1"
                  :class="
                    localResolutions[f.key] === getImportedValue(f.key)
                      ? 'border-primary bg-primary/10 text-foreground font-bold'
                      : 'border-border bg-card/60 text-muted-foreground hover:border-muted-foreground'
                  "
                >
                  <span class="truncate">{{ getImportedValue(f.key) }}</span>
                  <Check
                    v-if="localResolutions[f.key] === getImportedValue(f.key)"
                    class="w-3 h-3 text-primary shrink-0"
                  />
                </div>
                <span v-else class="text-muted-foreground/50 italic text-[11px]">(Empty)</span>
              </td>

              <!-- Current Resolved Result -->
              <td class="py-2.5 px-3 text-right align-top font-mono text-foreground font-semibold">
                <span class="text-xs">
                  {{
                    localResolutions[f.key] !== undefined
                      ? localResolutions[f.key] || '—'
                      : getExistingValue(f.key) || getImportedValue(f.key) || '—'
                  }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
        <span class="text-xs text-muted-foreground">
          Click on any value to choose which one to keep in the merged record.
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="handleClose"
            class="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            class="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            Apply Resolution
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
