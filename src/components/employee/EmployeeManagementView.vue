<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VaultItem } from '@/types'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import { useClipboard } from '@/composables/useClipboard'
import { formatPhilippinePhone } from '@/lib/dateUtils'
import EmployeeImportModal from './EmployeeImportModal.vue'
import EmployeeExportModal from './EmployeeExportModal.vue'
import ItemDetails from '@/components/vault/ItemDetails.vue'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Edit,
  Trash2,
  Star,
  Phone,
  Copy,
  Check,
  Building2,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Columns,
  X,
  UserCheck,
} from '@lucide/vue'

const emit = defineEmits<{
  (e: 'add-employee'): void
  (e: 'edit-employee', item: VaultItem): void
}>()

const {
  activeItems,
  bulkUpsertItems,
  moveToTrash,
  toggleFavorite,
  selectedItemId,
  selectItem,
  selectedItem,
} = useVault()

const { copyToClipboard } = useClipboard()
const { success } = useToast()

// View layout mode: 'table' | 'cards' | 'split'
const viewMode = ref<'table' | 'cards' | 'split'>('table')

// Search and Filters
const searchQuery = ref('')
const selectedDepartment = ref<string>('all')
const selectedStatus = ref<string>('all')
const selectedContract = ref<string>('all')

// Row selection for batch actions
const selectedEmployeeIds = ref<string[]>([])
const copiedFieldId = ref<string | null>(null)

// Modals
const showImportModal = ref(false)
const showExportModal = ref(false)

// Filter all active employee identities
const employeeList = computed(() => {
  return activeItems.value.filter((item) => item.type === 'identity')
})

// Unique Departments in current employee pool
const departmentsList = computed(() => {
  const depts = new Set<string>()
  employeeList.value.forEach((e) => {
    if (e.department && e.department.trim()) {
      depts.add(e.department.trim())
    }
  })
  return Array.from(depts).sort()
})

// Filtered employee list based on criteria
const filteredEmployees = computed(() => {
  return employeeList.value.filter((emp) => {
    // Dept filter
    if (selectedDepartment.value !== 'all' && (emp.department || '').toLowerCase() !== selectedDepartment.value.toLowerCase()) {
      return false
    }

    // Status filter
    if (selectedStatus.value !== 'all') {
      const empStatus = (emp.status || 'Active').toLowerCase()
      if (empStatus !== selectedStatus.value.toLowerCase()) return false
    }

    // Contract filter
    if (selectedContract.value !== 'all') {
      const empContract = (emp.contract || 'Regular').toLowerCase()
      if (empContract !== selectedContract.value.toLowerCase()) return false
    }

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const searchFields = [
        emp.full_name,
        emp.name,
        emp.dmbb_id,
        emp.employee_id,
        emp.department,
        emp.position,
        emp.contact_no,
        emp.work_phone,
        emp.phone,
        emp.sss_no,
        emp.tin_no,
        emp.hdmf_no,
        emp.pagibig_no,
        emp.phic_no,
        emp.philhealth_no,
        emp.work_email,
        emp.address,
        emp.office_address,
      ]
      return searchFields.some((f) => f && f.toLowerCase().includes(q))
    }

    return true
  })
})

// Metrics
const stats = computed(() => {
  const total = employeeList.value.length
  const active = employeeList.value.filter((e) => (e.status || 'Active').toLowerCase() === 'active').length
  const regular = employeeList.value.filter((e) => (e.contract || 'Regular').toLowerCase() === 'regular').length
  const depts = departmentsList.value.length
  return { total, active, regular, depts }
})

// Selection helpers
const isAllSelected = computed(() => {
  return (
    filteredEmployees.value.length > 0 &&
    filteredEmployees.value.every((e) => selectedEmployeeIds.value.includes(e.id))
  )
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedEmployeeIds.value = []
  } else {
    selectedEmployeeIds.value = filteredEmployees.value.map((e) => e.id)
  }
}

function toggleSelect(id: string) {
  const idx = selectedEmployeeIds.value.indexOf(id)
  if (idx !== -1) {
    selectedEmployeeIds.value.splice(idx, 1)
  } else {
    selectedEmployeeIds.value.push(id)
  }
}

async function copyValue(val: string | undefined, label: string, key: string) {
  if (!val) return
  const ok = await copyToClipboard(val, `${label} copied`, false)
  if (ok) {
    copiedFieldId.value = key
    setTimeout(() => {
      if (copiedFieldId.value === key) {
        copiedFieldId.value = null
      }
    }, 2000)
  }
}

function handleBatchDelete() {
  if (selectedEmployeeIds.value.length === 0) return
  const count = selectedEmployeeIds.value.length
  selectedEmployeeIds.value.forEach((id) => moveToTrash(id))
  selectedEmployeeIds.value = []
  success('Moved to Trash', `Moved ${count} employee records to trash.`)
}

function onImportSuccess(updated: VaultItem[]) {
  bulkUpsertItems(updated)
  showImportModal.value = false
}
</script>

<template>
  <div class="h-full flex flex-col bg-background overflow-hidden min-w-0">
    <!-- Top Action & Metrics Header -->
    <div class="p-4 sm:p-5 border-b border-border bg-card/60 space-y-4 shrink-0">
      <!-- Title & Action Buttons -->
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
            <Users class="w-6 h-6" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-foreground">Employee Management</h2>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {{ stats.total }} Total
              </span>
            </div>
            <p class="text-xs text-muted-foreground">
              Master employee directory, Philippine government IDs, and automated Excel/CSV import & deduplication
            </p>
          </div>
        </div>

        <!-- Main Actions -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Export -->
          <button
            @click="showExportModal = true"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground"
          >
            <Download class="w-3.5 h-3.5 text-emerald-600" />
            <span>Export</span>
          </button>

          <!-- Import -->
          <button
            @click="showImportModal = true"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary"
          >
            <Upload class="w-3.5 h-3.5" />
            <span>Import Excel / CSV</span>
          </button>

          <!-- + Add Employee -->
          <button
            @click="emit('add-employee')"
            class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus class="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Summary -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div class="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Active Staff</span>
            <span class="text-base font-bold text-emerald-600">{{ stats.active }}</span>
          </div>
          <UserCheck class="w-4 h-4 text-emerald-600/60" />
        </div>

        <div class="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Regular Contract</span>
            <span class="text-base font-bold text-blue-600">{{ stats.regular }}</span>
          </div>
          <Layers class="w-4 h-4 text-blue-600/60" />
        </div>

        <div class="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Departments</span>
            <span class="text-base font-bold text-foreground">{{ stats.depts }}</span>
          </div>
          <Building2 class="w-4 h-4 text-muted-foreground/60" />
        </div>

        <div class="p-3 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Filtered Matching</span>
            <span class="text-base font-bold text-primary">{{ filteredEmployees.length }}</span>
          </div>
          <Filter class="w-4 h-4 text-primary/60" />
        </div>
      </div>
    </div>

    <!-- Search & Filter Controls Toolbar -->
    <div class="p-3 border-b border-border bg-card flex items-center justify-between gap-3 flex-wrap shrink-0">
      <div class="flex items-center gap-2 flex-1 min-w-[240px] max-w-3xl">
        <!-- Search bar -->
        <div class="flex-1 relative">
          <Search class="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, DMBB ID, SSS, TIN, phone, department..."
            class="w-full h-6 pl-8 pr-8 py-1.5 text-xs rounded-xl border border-input bg-card/60 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <!-- Department Filter -->
        <Select v-model="selectedDepartment">
          <SelectTrigger
            class="h-6 w-[160px] rounded-xl px-2.5 text-xs bg-card text-foreground"
          >
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all" class="text-xs">
              All Departments
            </SelectItem>

            <SelectItem
              v-for="d in departmentsList"
              :key="d"
              :value="d"
              class="text-xs"
            >
              {{ d }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Status Filter -->
        <div class="hidden sm:block">
          <Select v-model="selectedStatus">
            <SelectTrigger
              class="h-6 w-[130px] rounded-xl px-2.5 text-xs bg-card text-foreground"
            >
              <SelectValue placeholder="All Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all" class="text-xs">All Status</SelectItem>
              <SelectItem value="Active" class="text-xs">Active</SelectItem>
              <SelectItem value="Inactive" class="text-xs">Inactive</SelectItem>
              <SelectItem value="On Leave" class="text-xs">On Leave</SelectItem>
              <SelectItem value="Resigned" class="text-xs">Resigned</SelectItem>
              <SelectItem value="Terminated" class="text-xs">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Contract Filter -->
        <div class="hidden md:block">
          <Select v-model="selectedContract">
            <SelectTrigger
              class="h-6 w-[150px] rounded-xl px-2.5 text-xs bg-card text-foreground"
            >
              <SelectValue placeholder="All Contracts" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all" class="text-xs">All Contracts</SelectItem>
              <SelectItem value="Regular" class="text-xs">Regular</SelectItem>
              <SelectItem value="Probationary" class="text-xs">Probationary</SelectItem>
              <SelectItem value="Contractual" class="text-xs">Contractual</SelectItem>
              <SelectItem value="Project-Based" class="text-xs">Project-Based</SelectItem>
              <SelectItem value="Casual" class="text-xs">Casual</SelectItem>
              <SelectItem value="Part-Time" class="text-xs">Part-Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- Right Controls: View Modes & Batch Selection Actions -->
      <div class="flex items-center gap-2">
        <!-- Batch Action Bar if any selected -->
        <div v-if="selectedEmployeeIds.length > 0" class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs">
          <span class="font-bold text-primary text-[11px]">{{ selectedEmployeeIds.length }} Selected</span>
          <button
            @click="showExportModal = true"
            class="p-1 hover:bg-primary/20 rounded text-primary"
            title="Export selected employees"
          >
            <Download class="w-3.5 h-3.5" />
          </button>
          <button
            @click="handleBatchDelete"
            class="p-1 hover:bg-rose-500/20 rounded text-rose-600"
            title="Move selected to trash"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
          <button
            @click="selectedEmployeeIds = []"
            class="p-1 hover:bg-muted rounded text-muted-foreground"
            title="Deselect all"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- View Mode Switcher -->
        <div class="flex items-center p-0.5 rounded-xl border border-border bg-muted/40">
          <button
            @click="viewMode = 'table'"
            class="p-1.5 rounded-lg"
            :class="viewMode === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            title="Table View"
          >
            <TableIcon class="w-3.5 h-3.5" />
          </button>
          <button
            @click="viewMode = 'cards'"
            class="p-1.5 rounded-lg"
            :class="viewMode === 'cards' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            title="Grid Cards View"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
          </button>
          <button
            @click="viewMode = 'split'"
            class="p-1.5 rounded-lg"
            :class="viewMode === 'split' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            title="Split Master-Detail View"
          >
            <Columns class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="flex-1 overflow-hidden flex min-h-0">
      <!-- Empty State -->
      <div
        v-if="filteredEmployees.length === 0"
        class="flex-1 p-8 flex flex-col items-center justify-center text-center text-muted-foreground space-y-3"
      >
        <div class="p-4 rounded-2xl bg-muted/60 text-muted-foreground">
          <Users class="w-8 h-8 text-muted-foreground/60" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-foreground">No Employee Records Found</h3>
          <p class="text-xs text-muted-foreground mt-1 max-w-sm">
            {{ searchQuery ? 'No employees match your search criteria.' : 'Your employee vault is currently empty.' }}
          </p>
        </div>
        <div class="flex items-center gap-2 pt-2">
          <button
            @click="emit('add-employee')"
            class="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            + Add New Employee
          </button>
          <button
            @click="showImportModal = true"
            class="px-4 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-foreground"
          >
            Import from Excel
          </button>
        </div>
      </div>

      <!-- ================= 1. TABLE VIEW ================= -->
      <div
        v-else-if="viewMode === 'table'"
        class="flex-1 overflow-y-auto"
      >
        <table class="w-full text-xs text-left border-collapse">
          <thead class="sticky top-0 bg-muted/90 backdrop-blur-xs z-10 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th class="py-2.5 px-3 w-10 text-center">
                <Checkbox
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="py-2.5 px-3">Employee's Name</th>
              <th class="py-2.5 px-3">ID No.</th>
              <th class="py-2.5 px-3">Department</th>
              <th class="py-2.5 px-3">Position</th>
              <th class="py-2.5 px-3">Contract & Status</th>
              <th class="py-2.5 px-3">Contact No.</th>
              <th class="py-2.5 px-3">Government IDs (SSS / TIN / HDMF)</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="emp in filteredEmployees"
              :key="emp.id"
              class="hover:bg-muted/30 group"
              :class="{ 'bg-primary/5': selectedEmployeeIds.includes(emp.id) }"
            >
              <!-- Checkbox -->
              <td class="py-2.5 px-3 text-center">
                <Checkbox 
                  :checked="selectedEmployeeIds.includes(emp.id)"
                  @change="toggleSelect(emp.id)"
                />
              </td>

              <!-- Employee Name -->
              <td class="py-2.5 px-3 font-semibold text-foreground">
                <div class="flex items-center gap-1.5">
                  <span class="hover:text-primary cursor-pointer" @click="emit('edit-employee', emp)">
                    {{ emp.full_name || emp.name }}
                  </span>
                  <Star
                    v-if="emp.favorite"
                    class="w-3 h-3 text-amber-500 fill-amber-500 shrink-0"
                  />
                </div>
                <span v-if="emp.work_email || emp.email" class="text-[10px] text-muted-foreground font-mono block">
                  {{ emp.work_email || emp.email }}
                </span>
              </td>

              <!-- DMBB ID -->
              <td class="py-2.5 px-3 font-mono font-medium w-30">
                <span v-if="emp.dmbb_id || emp.employee_id" class="px-1.5 text-[10px] py-0.5 rounded bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer border border-border">
                  {{ emp.dmbb_id || emp.employee_id }}
                </span>
                <span v-else class="text-muted-foreground/40 italic">—</span>
              </td>

              <!-- Department -->
              <td class="py-2.5 px-3">
                <span v-if="emp.department" class="font-medium text-foreground">
                  {{ emp.department }}
                </span>
                <span v-else class="text-muted-foreground/40 italic">—</span>
              </td>

              <!-- Position -->
              <td class="py-2.5 px-3">
                <span v-if="emp.position" class="text-muted-foreground font-medium">
                  {{ emp.position }}
                </span>
                <span v-else class="text-muted-foreground/40 italic">—</span>
              </td>

              <!-- Contract & Status Badges -->
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                    :class="
                      (emp.status || 'Active').toLowerCase() === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                    "
                  >
                    {{ emp.status || 'Active' }}
                  </span>
                  <span
                    v-if="emp.contract"
                    class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  >
                    {{ emp.contract }}
                  </span>
                </div>
              </td>

              <!-- Contact No -->
              <td class="py-2.5 px-3">
                <div v-if="emp.contact_no || emp.work_phone || emp.phone" class="flex items-center gap-1.5">
                  <a
                    :href="`tel:${emp.contact_no || emp.work_phone || emp.phone}`"
                    class="font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    <Phone class="w-3 h-3" />
                    <span>{{ formatPhilippinePhone(emp.contact_no || emp.work_phone || emp.phone) }}</span>
                  </a>
                  <button
                    @click="copyValue(emp.contact_no || emp.work_phone || emp.phone, 'Contact No', `ph_${emp.id}`)"
                    class="p-0.5 text-muted-foreground hover:text-foreground"
                    title="Copy phone"
                  >
                    <Check v-if="copiedFieldId === `ph_${emp.id}`" class="w-3 h-3 text-emerald-600" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>
                <span v-else class="text-muted-foreground/40 italic">—</span>
              </td>

              <!-- Philippine Government IDs -->
              <td class="py-2.5 px-3 font-mono text-[10px]">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    v-if="emp.sss_no"
                    @click="copyValue(emp.sss_no, 'SSS No', `sss_${emp.id}`)"
                    class="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer border border-border"
                    title="Click to copy SSS No."
                  >
                    SSS: {{ emp.sss_no }}
                  </span>
                  <span
                    v-if="emp.tin_no"
                    @click="copyValue(emp.tin_no, 'TIN No', `tin_${emp.id}`)"
                    class="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer border border-border"
                    title="Click to copy TIN No."
                  >
                    TIN: {{ emp.tin_no }}
                  </span>
                  <span
                    v-if="emp.hdmf_no || emp.pagibig_no"
                    @click="copyValue(emp.hdmf_no || emp.pagibig_no, 'HDMF No', `hdmf_${emp.id}`)"
                    class="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer border border-border"
                    title="Click to copy HDMF No."
                  >
                    HDMF: {{ emp.hdmf_no || emp.pagibig_no }}
                  </span>
                  <span
                    v-if="!emp.sss_no && !emp.tin_no && !emp.hdmf_no && !emp.pagibig_no"
                    class="text-muted-foreground/40 italic"
                  >
                    —
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-2.5 px-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="toggleFavorite(emp.id)"
                    class="p-1.5 text-muted-foreground hover:text-amber-500 rounded hover:bg-muted"
                    title="Favorite"
                  >
                    <Star class="w-3.5 h-3.5" :class="{ 'fill-amber-500 text-amber-500': emp.favorite }" />
                  </button>

                  <button
                    @click="emit('edit-employee', emp)"
                    class="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                    title="Edit Employee"
                  >
                    <Edit class="w-3.5 h-3.5" />
                  </button>

                  <button
                    @click="moveToTrash(emp.id)"
                    class="p-1.5 text-muted-foreground hover:text-rose-600 rounded hover:bg-rose-500/10"
                    title="Move to Trash"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ================= 2. CARDS GRID VIEW ================= -->
      <div
        v-else-if="viewMode === 'cards'"
        class="flex-1 p-4 sm:p-5 overflow-y-auto"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div
            v-for="emp in filteredEmployees"
            :key="emp.id"
            class="p-4 rounded-2xl border border-border bg-card hover:border-primary/40 shadow-xs flex flex-col justify-between space-y-3 group"
          >
            <!-- Card Top: Name & Badges -->
            <div class="space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="text-sm font-bold text-foreground hover:text-primary cursor-pointer" @click="emit('edit-employee', emp)">
                    {{ emp.full_name || emp.name }}
                  </h4>
                  <p class="text-xs text-muted-foreground">
                    <span>{{ emp.position || 'Staff Member' }}</span>
                    <span v-if="emp.department"> • {{ emp.department }}</span>
                  </p>
                </div>

                <div class="flex items-center gap-1">
                  <span
                    v-if="emp.dmbb_id || emp.employee_id"
                    class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20"
                  >
                    {{ emp.dmbb_id || emp.employee_id }}
                  </span>
                  <button
                    @click="toggleFavorite(emp.id)"
                    class="p-1 text-muted-foreground hover:text-amber-500 rounded"
                  >
                    <Star class="w-3.5 h-3.5" :class="{ 'fill-amber-500 text-amber-500': emp.favorite }" />
                  </button>
                </div>
              </div>

              <!-- Contract / Status -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold"
                  :class="
                    (emp.status || 'Active').toLowerCase() === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                  "
                >
                  {{ emp.status || 'Active' }}
                </span>
                <span
                  v-if="emp.contract"
                  class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20"
                >
                  {{ emp.contract }}
                </span>
              </div>
            </div>

            <!-- Government IDs List -->
            <div class="p-2.5 rounded-xl border border-border/80 bg-muted/20 text-[11px] font-mono space-y-1">
              <div v-if="emp.sss_no" class="flex justify-between items-center text-muted-foreground">
                <span class="text-[10px] uppercase font-sans font-semibold">SSS</span>
                <span class="text-foreground">{{ emp.sss_no }}</span>
              </div>
              <div v-if="emp.tin_no" class="flex justify-between items-center text-muted-foreground">
                <span class="text-[10px] uppercase font-sans font-semibold">TIN</span>
                <span class="text-foreground">{{ emp.tin_no }}</span>
              </div>
              <div v-if="emp.hdmf_no || emp.pagibig_no" class="flex justify-between items-center text-muted-foreground">
                <span class="text-[10px] uppercase font-sans font-semibold">HDMF</span>
                <span class="text-foreground">{{ emp.hdmf_no || emp.pagibig_no }}</span>
              </div>
              <div v-if="!emp.sss_no && !emp.tin_no && !emp.hdmf_no" class="text-muted-foreground/50 italic text-[10px]">
                No government IDs on file
              </div>
            </div>

            <!-- Card Bottom Actions -->
            <div class="pt-2 border-t border-border flex items-center justify-between text-xs">
              <a
                v-if="emp.contact_no || emp.work_phone || emp.phone"
                :href="`tel:${emp.contact_no || emp.work_phone || emp.phone}`"
                class="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                <Phone class="w-3 h-3" />
                <span>{{ formatPhilippinePhone(emp.contact_no || emp.work_phone || emp.phone) }}</span>
              </a>
              <span v-else class="text-muted-foreground/40 italic text-[11px]">No contact no.</span>

              <div class="flex items-center gap-1">
                <button
                  @click="emit('edit-employee', emp)"
                  class="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                  title="Edit"
                >
                  <Edit class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="moveToTrash(emp.id)"
                  class="p-1 text-muted-foreground hover:text-rose-600 rounded hover:bg-rose-500/10"
                  title="Move to trash"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= 3. SPLIT MASTER-DETAIL VIEW ================= -->
      <div
        v-else-if="viewMode === 'split'"
        class="flex-1 flex overflow-hidden min-h-0"
      >
        <!-- Left List -->
        <div class="w-80 lg:w-96 border-r border-border bg-card/40 flex flex-col h-full overflow-hidden shrink-0">
          <div class="p-2.5 border-b border-border bg-muted/20 text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Staff Roster</span>
            <span>{{ filteredEmployees.length }}</span>
          </div>

          <div class="flex-1 overflow-y-auto divide-y divide-border/60">
            <div
              v-for="emp in filteredEmployees"
              :key="emp.id"
              @click="selectItem(emp.id)"
              class="p-3 cursor-pointer select-none flex items-start justify-between gap-2.5"
              :class="selectedItemId === emp.id ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40'"
            >
              <div class="min-w-0">
                <h4 class="text-xs font-bold text-foreground truncate">{{ emp.full_name || emp.name }}</h4>
                <p class="text-[11px] text-muted-foreground truncate">{{ emp.position || 'Staff' }} • {{ emp.department || 'General' }}</p>
                <span v-if="emp.dmbb_id" class="text-[10px] font-mono text-muted-foreground/80 block mt-0.5">ID: {{ emp.dmbb_id }}</span>
              </div>
              <span
                class="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0"
                :class="
                  (emp.status || 'Active').toLowerCase() === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-zinc-500/10 text-zinc-400'
                "
              >
                {{ emp.status || 'Active' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right Detail Pane -->
        <div class="flex-1 h-full min-w-0 overflow-hidden bg-card">
          <ItemDetails
            :item="selectedItem"
            @edit="(item) => emit('edit-employee', item)"
            @delete="() => {}"
          />
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <EmployeeImportModal
      v-model:open="showImportModal"
      :existingVaultItems="activeItems"
      @imported="onImportSuccess"
    />

    <!-- Export Modal -->
    <EmployeeExportModal
      v-model:open="showExportModal"
      :allItems="employeeList"
      :filteredItems="filteredEmployees"
      :selectedIds="selectedEmployeeIds"
    />
  </div>
</template>
