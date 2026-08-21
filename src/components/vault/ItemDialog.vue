<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { VaultItem, VaultItemType } from '@/types'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import { calculatePasswordStrength } from '@/services/crypto'
import PasswordGeneratorModal from './PasswordGeneratorModal.vue'
import CredentialTypeIcon from './CredentialTypeIcon.vue'
import {
  Building2,
  Eye,
  EyeOff,
  Sparkles,
  Star,
  Plus,
  X,
  Lock,
} from '@lucide/vue'

const props = defineProps<{
  open: boolean
  itemToEdit?: VaultItem | null
  initialType?: VaultItemType
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'saved', item: VaultItem): void
}>()

const {
  categories,
  uniqueCompanies,
  uniqueDepartments,
  uniqueTeams,
  saveItem,
  addCategory,
} = useVault()

const { success, error } = useToast()

const showGenerator = ref(false)
const showPassword = ref(false)
const newCategoryInput = ref('')
const showNewCategoryBox = ref(false)
const newTagInput = ref('')

const credentialTypes: { type: VaultItemType; label: string; group: string }[] = [
  { type: 'password', label: 'Password / Login', group: 'Credentials' },
  { type: 'email_account', label: 'Email Account', group: 'Credentials' },
  { type: 'social_account', label: 'Social Account', group: 'Credentials' },
  { type: 'company_account', label: 'Company Account', group: 'Credentials' },
  { type: 'pc_computer', label: 'PC / Computer', group: 'Infrastructure' },
  { type: 'server', label: 'Server / VPS', group: 'Infrastructure' },
  { type: 'wifi', label: 'Wi-Fi Network', group: 'Infrastructure' },
  { type: 'domain', label: 'Domain Name', group: 'Assets' },
  { type: 'hosting', label: 'Web Hosting', group: 'Assets' },
  { type: 'software_license', label: 'Software License', group: 'Assets' },
  { type: 'note', label: 'Secure Note', group: 'Organization' },
  { type: 'identity', label: 'Employee Profile', group: 'Organization' },
]

const defaultFormData = () => ({
  id: '',
  type: (props.initialType || 'password') as VaultItemType,
  name: '',
  category: 'Company Credentials',
  favorite: false,
  tags: [] as string[],
  notes: '',
  // Company Org fields
  company: '',
  department: '',
  team: '',
  assigned_to: '',
  location: '',
  // Password / Login
  username: '',
  email: '',
  password: '',
  website_url: '',
  // Email Account
  account_id: '',
  provider: '',
  login_url: '',
  recovery_email: '',
  imap_server: '',
  smtp_server: '',
  // Social Account
  platform: '',
  profile_url: '',
  role: '',
  two_factor_enabled: false,
  access_level: 'member' as const,
  // PC / Computer
  hostname: '',
  operating_system: '',
  ip_address: '',
  mac_address: '',
  device_type: 'desktop' as const,
  admin_account: '',
  // Server
  protocol: 'SSH' as const,
  port: 22 as number | undefined,
  server_url: '',
  environment: 'production' as const,
  // Wi-Fi
  ssid: '',
  security_type: 'WPA2' as const,
  router_ip: '',
  hidden_network: false,
  // Domain
  domain_name: '',
  registrar: '',
  registration_date: '',
  expiration_date: '',
  nameservers: '',
  auto_renew: true,
  // Hosting
  dashboard_url: '',
  ftp_host: '',
  ftp_port: 21 as number | undefined,
  ftp_username: '',
  control_panel: '',
  // Software License
  software_name: '',
  vendor: '',
  license_key: '',
  license_type: 'per-seat' as const,
  seat_count: undefined as number | undefined,
  // Secure Note
  content: '',
  // Identity
  full_name: '',
  position: '',
  work_email: '',
  work_phone: '',
  office_address: '',
})

const form = reactive(defaultFormData())

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.itemToEdit) {
        Object.assign(form, defaultFormData(), {
          ...props.itemToEdit,
          tags: [...(props.itemToEdit.tags || [])],
        })
      } else {
        Object.assign(form, defaultFormData())
        if (props.initialType) {
          form.type = props.initialType
        }
      }
      showPassword.value = false
      showNewCategoryBox.value = false
    }
  }
)

const passwordStrength = computed(() => {
  return calculatePasswordStrength(form.password || '')
})

function addTag() {
  const tag = newTagInput.value.trim().toLowerCase()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  newTagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag)
}

function handleCreateCategory() {
  const name = newCategoryInput.value.trim()
  if (!name) return
  const cat = addCategory(name)
  form.category = cat.name
  newCategoryInput.value = ''
  showNewCategoryBox.value = false
  success('Category Added', `Created category "${cat.name}"`)
}

function applyGeneratedPassword(pwd: string) {
  form.password = pwd
  showPassword.value = true
}

function handleSubmit() {
  if (!form.name.trim()) {
    error('Name required', 'Please give this credential item a descriptive name.')
    return
  }

  try {
    const saved = saveItem({
      ...form,
      name: form.name.trim(),
    })
    success(
      props.itemToEdit ? 'Credential Updated' : 'Credential Saved',
      `"${saved.name}" has been secured in the company vault.`
    )
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error('Save Failed', err?.message || 'Local storage error')
  }
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
  >
    <div
      class="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col my-auto animate-in zoom-in-95 duration-150 overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-5 border-b border-border bg-muted/20 shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-primary/10 text-primary">
            <CredentialTypeIcon :type="form.type" size="md" />
          </div>
          <div>
            <h3 class="text-base font-bold text-foreground">
              {{ itemToEdit ? 'Edit Company Credential' : 'New Credential' }}
            </h3>
            <p class="text-xs text-muted-foreground">Company Credential Vault (Local Encrypted)</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="form.favorite = !form.favorite"
            class="p-2 rounded-lg border border-border transition-colors hover:bg-muted"
            :class="{ 'text-amber-500 bg-amber-500/10 border-amber-500/30': form.favorite }"
            title="Toggle Favorite"
          >
            <Star class="w-4 h-4" :class="{ 'fill-amber-500': form.favorite }" />
          </button>
          <button
            @click="close"
            class="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Credential Type Selector (Tabs when creating) -->
      <div v-if="!itemToEdit" class="px-6 py-3 border-b border-border shrink-0 bg-muted/10">
        <label class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Select Credential Type
        </label>
        <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-muted/40 rounded-xl">
          <button
            v-for="t in credentialTypes"
            :key="t.type"
            type="button"
            @click="form.type = t.type"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
            :class="[
              form.type === t.type
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50',
            ]"
          >
            <CredentialTypeIcon :type="t.type" size="sm" />
            <span>{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Form Body Scrollable -->
      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto p-6 space-y-5">
        <!-- Section: Essential Identity -->
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2 space-y-1.5">
              <label class="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Record Name *</span>
                <span class="text-[11px] text-muted-foreground font-normal">e.g. AWS Production, Office Wi-Fi, HR Portal</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="Descriptive name or title"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Credential Type</label>
              <select
                v-model="form.type"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option v-for="t in credentialTypes" :key="t.type" :value="t.type">
                  {{ t.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- ================= 1. PASSWORD / LOGIN TYPE ================= -->
        <div v-if="form.type === 'password'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Login Credentials</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Username / Account ID</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="admin, dev_ops, jdoe"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Email Address</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="devops@company.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <!-- Password with Generator -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-foreground">Password</label>
              <button
                type="button"
                @click="showGenerator = true"
                class="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition"
              >
                <Sparkles class="w-3.5 h-3.5" />
                <span>Generate Password</span>
              </button>
            </div>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password or Secret Key"
                class="w-full pl-3.5 pr-20 py-2.5 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition"
                  title="Toggle visibility"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Password strength -->
            <div v-if="form.password" class="pt-1.5 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-muted-foreground">
                  Strength:
                  <span
                    class="font-semibold capitalize"
                    :class="{
                      'text-rose-500': passwordStrength.level === 'weak' || passwordStrength.level === 'very-weak',
                      'text-amber-500': passwordStrength.level === 'fair',
                      'text-emerald-500': passwordStrength.level === 'strong' || passwordStrength.level === 'excellent',
                    }"
                  >
                    {{ passwordStrength.label }}
                  </span>
                </span>
                <span class="text-muted-foreground">{{ passwordStrength.score }}%</span>
              </div>
              <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full transition-all duration-300 rounded-full"
                  :class="{
                    'bg-rose-500': passwordStrength.level === 'weak' || passwordStrength.level === 'very-weak',
                    'bg-amber-500': passwordStrength.level === 'fair',
                    'bg-emerald-500': passwordStrength.level === 'strong' || passwordStrength.level === 'excellent',
                  }"
                  :style="{ width: `${passwordStrength.score}%` }"
                />
              </div>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Website / Service URL</label>
            <input
              v-model="form.website_url"
              type="url"
              placeholder="https://console.aws.amazon.com"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>

        <!-- ================= 2. EMAIL ACCOUNT ================= -->
        <div v-else-if="form.type === 'email_account'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Account Configuration</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Email Address *</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="contact@company.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Provider</label>
              <input
                v-model="form.provider"
                type="text"
                placeholder="Google Workspace, Microsoft 365, Zoho"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-foreground">Mail Password / App Password</label>
                <button type="button" @click="showGenerator = true" class="text-xs text-primary font-semibold hover:underline">
                  Generate
                </button>
              </div>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="App-specific password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Recovery Email</label>
              <input
                v-model="form.recovery_email"
                type="email"
                placeholder="secops-recovery@company.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Webmail Login URL</label>
              <input
                v-model="form.login_url"
                type="url"
                placeholder="https://mail.company.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">IMAP Server & Port</label>
              <input
                v-model="form.imap_server"
                type="text"
                placeholder="imap.gmail.com:993"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">SMTP Server & Port</label>
              <input
                v-model="form.smtp_server"
                type="text"
                placeholder="smtp.gmail.com:587"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <!-- ================= 3. SOCIAL ACCOUNT ================= -->
        <div v-else-if="form.type === 'social_account'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Social Platform Details</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Platform</label>
              <input
                v-model="form.platform"
                type="text"
                placeholder="LinkedIn, X/Twitter, YouTube, GitHub"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Handle / Username</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="@companyname"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Associated Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="social@company.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Profile URL</label>
              <input
                v-model="form.profile_url"
                type="url"
                placeholder="https://linkedin.com/company/example"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Password</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Access Level</label>
              <select
                v-model="form.access_level"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="editor">Editor</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div class="flex items-center pt-6">
              <label class="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  v-model="form.two_factor_enabled"
                  type="checkbox"
                  class="rounded border-border text-primary focus:ring-primary"
                />
                <span>2FA Enabled</span>
              </label>
            </div>
          </div>
        </div>

        <!-- ================= 4. COMPANY ACCOUNT ================= -->
        <div v-else-if="form.type === 'company_account'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Enterprise Account</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Service / Tool</label>
              <input
                v-model="form.provider"
                type="text"
                placeholder="Stripe, Slack, Salesforce, HubSpot"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Organization / Account ID</label>
              <input
                v-model="form.account_id"
                type="text"
                placeholder="acct_109283019 or org-dbb"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Admin Username / Email</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="admin@company.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Password / Master API Key</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Master credentials"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Management Portal URL</label>
            <input
              v-model="form.login_url"
              type="url"
              placeholder="https://dashboard.stripe.com"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>

        <!-- ================= 5. PC / COMPUTER ================= -->
        <div v-else-if="form.type === 'pc_computer'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Workstation / Computer Specs</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Hostname *</label>
              <input
                v-model="form.hostname"
                type="text"
                placeholder="WS-CORP-042"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Operating System</label>
              <input
                v-model="form.operating_system"
                type="text"
                placeholder="Windows 11 Pro, macOS Sonoma, Ubuntu 24.04"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Device Type</label>
              <select
                v-model="form.device_type"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option value="desktop">Desktop</option>
                <option value="laptop">Laptop</option>
                <option value="workstation">Workstation</option>
                <option value="tablet">Tablet / POS</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">IP Address</label>
              <input
                v-model="form.ip_address"
                type="text"
                placeholder="10.0.10.150"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">MAC Address</label>
              <input
                v-model="form.mac_address"
                type="text"
                placeholder="00:1B:44:11:3A:B7"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Local Admin Username</label>
              <input
                v-model="form.admin_account"
                type="text"
                placeholder="Administrator, root"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Admin Password / BitLocker Key</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Workstation admin password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <!-- ================= 6. SERVER / VPS ================= -->
        <div v-else-if="form.type === 'server'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Server & Host Parameters</h4>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Server Hostname / IP *</label>
              <input
                v-model="form.hostname"
                type="text"
                placeholder="db-prod-01.company.internal"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Protocol</label>
              <select
                v-model="form.protocol"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option value="SSH">SSH</option>
                <option value="RDP">RDP</option>
                <option value="FTP">FTP</option>
                <option value="SFTP">SFTP</option>
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Port</label>
              <input
                v-model.number="form.port"
                type="number"
                placeholder="22"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Environment</label>
              <select
                v-model="form.environment"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="dr">DR / Backup</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Username / User</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="ubuntu, root, ec2-user"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Password / SSH Passphrase</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Secret or Private Key passphrase"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Server URL / Management Panel</label>
            <input
              v-model="form.server_url"
              type="url"
              placeholder="https://192.168.1.50:8006 (Proxmox / ESXi)"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>

        <!-- ================= 7. WI-FI ================= -->
        <div v-else-if="form.type === 'wifi'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Wi-Fi Wireless Settings</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Network SSID *</label>
              <input
                v-model="form.ssid"
                type="text"
                placeholder="DBB_Corporate_5G"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Security Protocol</label>
              <select
                v-model="form.security_type"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option value="WPA3">WPA3-Personal</option>
                <option value="WPA2">WPA2-PSK (AES)</option>
                <option value="Enterprise">WPA2/WPA3-Enterprise</option>
                <option value="WEP">WEP (Legacy)</option>
                <option value="Open">Open</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Wi-Fi Password / Pre-shared Key</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Wireless password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Router / Gateway IP</label>
              <input
                v-model="form.router_ip"
                type="text"
                placeholder="192.168.1.1 or 10.0.0.1"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="flex items-center">
            <label class="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                v-model="form.hidden_network"
                type="checkbox"
                class="rounded border-border text-primary focus:ring-primary"
              />
              <span>Hidden SSID Network</span>
            </label>
          </div>
        </div>

        <!-- ================= 8. DOMAIN ================= -->
        <div v-else-if="form.type === 'domain'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Domain Registration Details</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Domain Name *</label>
              <input
                v-model="form.domain_name"
                type="text"
                placeholder="dbbindustries.com"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Registrar</label>
              <input
                v-model="form.registrar"
                type="text"
                placeholder="Cloudflare Registrar, GoDaddy, Namecheap, Route53"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Registration Date</label>
              <input
                v-model="form.registration_date"
                type="date"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Expiration Date</label>
              <input
                v-model="form.expiration_date"
                type="date"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="flex items-center pt-6">
              <label class="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  v-model="form.auto_renew"
                  type="checkbox"
                  class="rounded border-border text-primary focus:ring-primary"
                />
                <span>Auto-Renewal Active</span>
              </label>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Nameservers</label>
            <input
              v-model="form.nameservers"
              type="text"
              placeholder="ns1.cloudflare.com, ns2.cloudflare.com"
              class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>

        <!-- ================= 9. HOSTING ================= -->
        <div v-else-if="form.type === 'hosting'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Web Hosting & Storage Services</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Hosting Provider *</label>
              <input
                v-model="form.provider"
                type="text"
                placeholder="AWS, Vercel, DigitalOcean, SiteGround, cPanel"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Control Panel Type</label>
              <input
                v-model="form.control_panel"
                type="text"
                placeholder="cPanel, Plesk, AWS Console, CyberPanel"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Dashboard / Portal URL</label>
            <input
              v-model="form.dashboard_url"
              type="url"
              placeholder="https://cpanel.company.corp:2083"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">FTP Host</label>
              <input
                v-model="form.ftp_host"
                type="text"
                placeholder="ftp.company.corp"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">FTP Username</label>
              <input
                v-model="form.ftp_username"
                type="text"
                placeholder="deploy_ftp"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">FTP Password</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="FTP Password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <!-- ================= 10. SOFTWARE LICENSE ================= -->
        <div v-else-if="form.type === 'software_license'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Software License & Product Keys</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Software Name *</label>
              <input
                v-model="form.software_name"
                type="text"
                placeholder="Adobe Creative Cloud, JetBrains All Products, IntelliJ, Figma"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Vendor / Publisher</label>
              <input
                v-model="form.vendor"
                type="text"
                placeholder="Adobe Systems, JetBrains, Microsoft"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">License / Activation Key *</label>
            <input
              v-model="form.license_key"
              type="text"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">License Model</label>
              <select
                v-model="form.license_type"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option value="per-seat">Per-Seat</option>
                <option value="site">Site License</option>
                <option value="subscription">Subscription</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Seat Count / Licenses</label>
              <input
                v-model.number="form.seat_count"
                type="number"
                placeholder="5"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Expiration Date</label>
              <input
                v-model="form.expiration_date"
                type="date"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <!-- ================= 11. SECURE NOTE ================= -->
        <div v-else-if="form.type === 'note'" class="space-y-3 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confidential Company Note</h4>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Secure Content</label>
            <textarea
              v-model="form.content"
              rows="7"
              placeholder="Store confidential operational procedures, recovery master keys, API client secrets, server configuration notes..."
              class="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition leading-relaxed"
            />
          </div>
        </div>

        <!-- ================= 12. EMPLOYEE IDENTITY PROFILE ================= -->
        <div v-else-if="form.type === 'identity'" class="space-y-4 pt-2 border-t border-border">
          <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">Employee Personnel Profile</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Full Name *</label>
              <input
                v-model="form.full_name"
                type="text"
                placeholder="Sarah Connor"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Job Title / Position</label>
              <input
                v-model="form.position"
                type="text"
                placeholder="Lead DevOps Engineer"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Work Email</label>
              <input
                v-model="form.work_email"
                type="email"
                placeholder="sarah.c@company.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Work Phone</label>
              <input
                v-model="form.work_phone"
                type="tel"
                placeholder="+1 (555) 234-5678"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Office / Desk Location</label>
            <input
              v-model="form.office_address"
              type="text"
              placeholder="Building A, Floor 3, Desk 42"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>

        <!-- ================= SECTION: COMPANY ORGANIZATION ASSIGNMENT ================= -->
        <div class="pt-4 border-t border-border space-y-4">
          <div class="flex items-center gap-2">
            <Building2 class="w-4 h-4 text-primary" />
            <h4 class="text-xs font-bold text-foreground uppercase tracking-wider">Company Assignment & Location</h4>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Company -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Company Name</label>
              <input
                v-model="form.company"
                type="text"
                list="companies-list"
                placeholder="e.g. DBB Industries"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <datalist id="companies-list">
                <option v-for="c in uniqueCompanies" :key="c" :value="c" />
              </datalist>
            </div>

            <!-- Department -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Department</label>
              <input
                v-model="form.department"
                type="text"
                list="departments-list"
                placeholder="Engineering, IT, Marketing"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <datalist id="departments-list">
                <option v-for="d in uniqueDepartments" :key="d" :value="d" />
              </datalist>
            </div>

            <!-- Team -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Team / Squad</label>
              <input
                v-model="form.team"
                type="text"
                list="teams-list"
                placeholder="DevOps, Infrastructure, Growth"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
              <datalist id="teams-list">
                <option v-for="tm in uniqueTeams" :key="tm" :value="tm" />
              </datalist>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Assigned Person</label>
              <input
                v-model="form.assigned_to"
                type="text"
                placeholder="Employee or Team Lead name"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Physical / Regional Location</label>
              <input
                v-model="form.location"
                type="text"
                placeholder="HQ Office, Server Room B, Remote"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <!-- ================= SECTION: CATEGORIES & TAGS & NOTES ================= -->
        <div class="pt-4 border-t border-border space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Category Picker -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-foreground">Vault Category</label>
                <button
                  type="button"
                  @click="showNewCategoryBox = !showNewCategoryBox"
                  class="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus class="w-3 h-3" />
                  <span>New Category</span>
                </button>
              </div>

              <div v-if="showNewCategoryBox" class="flex gap-2 mb-2 animate-in fade-in">
                <input
                  v-model="newCategoryInput"
                  @keydown.enter.prevent="handleCreateCategory"
                  type="text"
                  placeholder="Category name"
                  class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  @click="handleCreateCategory"
                  class="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg"
                >
                  Add
                </button>
              </div>

              <select
                v-model="form.category"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                <option v-for="cat in categories" :key="cat.id" :value="cat.name">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <!-- Tags Input -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Tags</label>
              <div class="flex gap-2">
                <input
                  v-model="newTagInput"
                  @keydown.enter.prevent="addTag"
                  @keydown.,.prevent="addTag"
                  type="text"
                  placeholder="Type tag and press Enter"
                  class="flex-1 px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
                <button
                  type="button"
                  @click="addTag"
                  class="px-3 py-2 text-xs font-semibold bg-muted hover:bg-muted/80 rounded-xl text-foreground"
                >
                  Add
                </button>
              </div>

              <!-- Tag Chips -->
              <div v-if="form.tags.length > 0" class="flex flex-wrap gap-1.5 pt-1">
                <span
                  v-for="tag in form.tags"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"
                >
                  #{{ tag }}
                  <button type="button" @click="removeTag(tag)" class="hover:text-foreground">
                    <X class="w-3 h-3" />
                  </button>
                </span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Additional Operational Notes</label>
            <textarea
              v-model="form.notes"
              rows="3"
              placeholder="Additional internal instructions, renewal dates, security protocols, or contact points..."
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>

        <!-- Footer Actions inside form -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-md transition"
          >
            <Lock class="w-3.5 h-3.5" />
            <span>{{ itemToEdit ? 'Update Company Credential' : 'Save to Vault' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Nested Password Generator Dialog -->
    <PasswordGeneratorModal
      v-model:open="showGenerator"
      @select="applyGeneratedPassword"
    />
  </div>
</template>
