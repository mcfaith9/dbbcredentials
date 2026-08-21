<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { VaultItem, VaultItemType } from '@/types'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import { calculatePasswordStrength } from '@/services/crypto'
import PasswordGeneratorModal from './PasswordGeneratorModal.vue'
import CredentialTypeIcon from './CredentialTypeIcon.vue'
import PhoneInput from '@/components/common/PhoneInput.vue'
import AddressInput from '@/components/common/AddressInput.vue'
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
  recovery_phone: '',
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
  // Identity / Employee Profile
  full_name: '',
  position: '',
  department: '',
  contract: 'Regular',
  status: 'Active',
  sss_no: '',
  hdmf_no: '',
  phic_no: '',
  tin_no: '',
  birthdate: '',
  address: '',
  office_address: '',
  dmbb_id: '',
  employee_id: '',
  contact_no: '',
  work_phone: '',
  emergency_contact: '',
  work_email: '',
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

function computeDerivedName(): string {
  if (form.name && form.name.trim()) return form.name.trim()

  switch (form.type) {
    case 'email_account':
      return form.email ? form.email.trim() : (form.provider ? `${form.provider} Account` : '')
    case 'pc_computer':
      return form.hostname ? form.hostname.trim() : (form.operating_system ? `${form.operating_system} PC` : '')
    case 'domain':
      return form.domain_name ? form.domain_name.trim() : ''
    case 'wifi':
      return form.ssid ? form.ssid.trim() : ''
    case 'software_license':
      return form.software_name ? form.software_name.trim() : ''
    case 'social_account':
      if (form.platform && form.platform.trim()) {
        return form.username ? `${form.platform.trim()} (${form.username.trim()})` : form.platform.trim()
      }
      return form.username ? form.username.trim() : ''
    case 'company_account':
      if (form.provider && form.provider.trim()) {
        return form.account_id ? `${form.provider.trim()} (${form.account_id.trim()})` : form.provider.trim()
      }
      return form.account_id ? form.account_id.trim() : ''
    case 'server':
      return form.hostname ? form.hostname.trim() : (form.server_url ? form.server_url.trim() : '')
    case 'hosting':
      return form.provider ? form.provider.trim() : (form.dashboard_url ? form.dashboard_url.trim() : '')
    case 'identity':
      return form.full_name ? form.full_name.trim() : (form.position ? form.position.trim() : '')
    case 'note':
      if (form.content && form.content.trim()) {
        const firstLine = form.content.trim().split('\n')[0].replace(/^[#\s*-_]+/, '').trim()
        if (firstLine) return firstLine.slice(0, 45)
      }
      return 'Secure Note'
    case 'password':
    default:
      if (form.website_url && form.website_url.trim()) {
        try {
          const url = new URL(form.website_url.startsWith('http') ? form.website_url : `https://${form.website_url}`)
          return url.hostname.replace(/^www\./, '')
        } catch {
          return form.website_url.trim()
        }
      }
      return form.username ? form.username.trim() : (form.email ? form.email.trim() : '')
  }
}

function handleSubmit() {
  const derived = computeDerivedName()

  // Validate required primary identifier per credential type
  if (form.type === 'email_account' && !form.email.trim()) {
    error('Email Required', 'Please enter a valid email address.')
    return
  }
  if (form.type === 'pc_computer' && !form.hostname.trim()) {
    error('Computer Name Required', 'Please enter the computer name or hostname.')
    return
  }
  if (form.type === 'domain' && !form.domain_name.trim()) {
    error('Domain Required', 'Please enter the domain name (e.g. company.com).')
    return
  }
  if (form.type === 'wifi' && !form.ssid.trim()) {
    error('SSID Required', 'Please enter the Wi-Fi network SSID.')
    return
  }
  if (form.type === 'software_license' && !form.software_name.trim()) {
    error('Software Name Required', 'Please enter the software name.')
    return
  }
  if (form.type === 'social_account' && !form.platform.trim() && !form.username.trim()) {
    error('Platform Required', 'Please enter the social media platform or username.')
    return
  }
  if (form.type === 'company_account' && !form.provider.trim()) {
    error('Provider Required', 'Please enter the service or tool provider name.')
    return
  }
  if (form.type === 'server' && !form.hostname.trim()) {
    error('Server Name Required', 'Please enter the server hostname or IP address.')
    return
  }
  if (form.type === 'hosting' && !form.provider.trim()) {
    error('Hosting Provider Required', 'Please enter the hosting provider.')
    return
  }
  if (form.type === 'identity' && !form.full_name.trim()) {
    error('Full Name Required', 'Please enter the employee full name.')
    return
  }
  if (form.type === 'password' && !derived) {
    error('Account Name Required', 'Please provide an account name, website URL, or username.')
    return
  }
  if (form.type === 'note' && !form.content.trim()) {
    error('Content Required', 'Please enter your note content.')
    return
  }

  const finalName = derived || 'Untitled Credential'

  try {
    const saved = saveItem({
      ...form,
      name: finalName,
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
              {{ itemToEdit ? 'Edit Credential' : 'New Credential' }}
            </h3>
            <p class="text-xs text-muted-foreground">DBB Company Vault (Encrypted Storage)</p>
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
        <!-- ================= 1. PASSWORD / LOGIN TYPE ================= -->
        <div v-if="form.type === 'password'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Service / Account Name *</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. AWS Production, Google Workspace, HR Portal"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Website / Service URL</label>
              <input
                v-model="form.website_url"
                type="url"
                placeholder="https://console.aws.amazon.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Username / Account ID</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="admin, dev_ops, jdoe"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Email Address</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="name@company.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
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
                placeholder="Enter password or secret key"
                class="w-full pl-3.5 pr-20 py-2.5 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
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
        </div>

        <!-- ================= 2. EMAIL ACCOUNT ================= -->
        <div v-else-if="form.type === 'email_account'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Email Address *</label>
              <input
                v-model="form.email"
                type="email"
                required
                placeholder="contact@company.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground font-mono"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Email Provider</label>
              <input
                v-model="form.provider"
                type="text"
                placeholder="Google Workspace, Microsoft 365, Zoho"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
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
                placeholder="App-specific or account password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Recovery Email</label>
              <input
                v-model="form.recovery_email"
                type="email"
                placeholder="secops-recovery@company.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Recovery Phone with Philippines +63 default -->
            <PhoneInput
              v-model="form.recovery_phone"
              label="Recovery Phone (Optional)"
              placeholder="917 123 4567"
              helper="Used for SMS multi-factor authentication & security recovery."
            />

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Webmail Login URL</label>
              <input
                v-model="form.login_url"
                type="url"
                placeholder="https://mail.company.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">IMAP Server</label>
              <input
                v-model="form.imap_server"
                type="text"
                placeholder="imap.gmail.com:993"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">SMTP Server</label>
              <input
                v-model="form.smtp_server"
                type="text"
                placeholder="smtp.gmail.com:587"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <!-- ================= 3. SOCIAL ACCOUNT ================= -->
        <div v-else-if="form.type === 'social_account'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Social Platform *</label>
              <input
                v-model="form.platform"
                type="text"
                placeholder="LinkedIn, Facebook, X / Twitter, YouTube, Instagram"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Username / Handle *</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="@dbbindustries"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Associated Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="social@company.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Profile URL</label>
              <input
                v-model="form.profile_url"
                type="url"
                placeholder="https://linkedin.com/company/dbb-industries"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Password</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Account password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Access Level</label>
              <select
                v-model="form.access_level"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="editor">Editor</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div class="flex items-center pt-6">
              <label class="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  v-model="form.two_factor_enabled"
                  type="checkbox"
                  class="rounded border-input text-primary focus:ring-primary"
                />
                <span>2FA Enabled</span>
              </label>
            </div>
          </div>
        </div>

        <!-- ================= 4. COMPANY ACCOUNT ================= -->
        <div v-else-if="form.type === 'company_account'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Service / Enterprise Provider *</label>
              <input
                v-model="form.provider"
                type="text"
                placeholder="Stripe, Slack, Salesforce, HubSpot, Jira"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Organization / Account ID</label>
              <input
                v-model="form.account_id"
                type="text"
                placeholder="acct_109283019 or org-dbb"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Admin Username / Email</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="admin@company.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Password / Master API Key</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Master credentials"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Management Portal URL</label>
              <input
                v-model="form.login_url"
                type="url"
                placeholder="https://dashboard.stripe.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Assigned To (Optional)</label>
              <input
                v-model="form.assigned_to"
                type="text"
                placeholder="e.g. Accounting Lead, Operations"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <!-- ================= 5. PC / COMPUTER ================= -->
        <div v-else-if="form.type === 'pc_computer'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Computer Name / Hostname *</label>
              <input
                v-model="form.hostname"
                type="text"
                required
                placeholder="WS-CORP-042 or Accounting-PC"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Operating System</label>
              <input
                v-model="form.operating_system"
                type="text"
                placeholder="Windows 11 Pro, macOS Sequoia, Ubuntu 24.04"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Device Type</label>
              <select
                v-model="form.device_type"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
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
                placeholder="192.168.1.100"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">MAC Address</label>
              <input
                v-model="form.mac_address"
                type="text"
                placeholder="00:1B:44:11:3A:B7"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Assigned To (Optional)</label>
              <input
                v-model="form.assigned_to"
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Local Admin Username</label>
              <input
                v-model="form.admin_account"
                type="text"
                placeholder="Administrator, root"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Admin Password / PIN</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Workstation admin password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <!-- ================= 6. SERVER / VPS ================= -->
        <div v-else-if="form.type === 'server'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Server Name / Hostname *</label>
              <input
                v-model="form.hostname"
                type="text"
                required
                placeholder="db-prod-01.company.internal or 192.168.1.50"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Protocol</label>
              <select
                v-model="form.protocol"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                <option value="SSH">SSH</option>
                <option value="RDP">RDP</option>
                <option value="SFTP">SFTP</option>
                <option value="FTP">FTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="HTTP">HTTP</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Port</label>
              <input
                v-model.number="form.port"
                type="number"
                placeholder="22"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Environment</label>
              <select
                v-model="form.environment"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
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
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Password / SSH Passphrase</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Secret or SSH Key passphrase"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Server URL / Management Panel</label>
            <input
              v-model="form.server_url"
              type="url"
              placeholder="https://192.168.1.50:8006 (Proxmox / Portainer / ESXi)"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <!-- ================= 7. WI-FI ================= -->
        <div v-else-if="form.type === 'wifi'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Wi-Fi Network Name (SSID) *</label>
              <input
                v-model="form.ssid"
                type="text"
                required
                placeholder="DBB_Corporate_5G"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Security Protocol</label>
              <select
                v-model="form.security_type"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                <option value="WPA2">WPA2-PSK (AES)</option>
                <option value="WPA3">WPA3-Personal</option>
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
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Router / Gateway IP</label>
              <input
                v-model="form.router_ip"
                type="text"
                placeholder="192.168.1.1 or 10.0.0.1"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="flex items-center">
            <label class="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
              <input
                v-model="form.hidden_network"
                type="checkbox"
                class="rounded border-input text-primary focus:ring-primary"
              />
              <span>Hidden Network (SSID Broadcast Disabled)</span>
            </label>
          </div>
        </div>

        <!-- ================= 8. DOMAIN ================= -->
        <div v-else-if="form.type === 'domain'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Domain Name *</label>
              <input
                v-model="form.domain_name"
                type="text"
                required
                placeholder="dbbindustries.com"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Registrar</label>
              <input
                v-model="form.registrar"
                type="text"
                placeholder="Cloudflare Registrar, GoDaddy, Namecheap, Route53"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Registration Date</label>
              <input
                v-model="form.registration_date"
                type="date"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Expiration Date</label>
              <input
                v-model="form.expiration_date"
                type="date"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div class="flex items-center pt-6">
              <label class="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  v-model="form.auto_renew"
                  type="checkbox"
                  class="rounded border-input text-primary focus:ring-primary"
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
              class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <!-- ================= 9. HOSTING ================= -->
        <div v-else-if="form.type === 'hosting'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Hosting Provider / Service *</label>
              <input
                v-model="form.provider"
                type="text"
                required
                placeholder="AWS, Vercel, DigitalOcean, SiteGround, cPanel"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Control Panel Type</label>
              <input
                v-model="form.control_panel"
                type="text"
                placeholder="cPanel, Plesk, AWS Console, CyberPanel"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Dashboard / Portal URL</label>
            <input
              v-model="form.dashboard_url"
              type="url"
              placeholder="https://cpanel.company.com:2083"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">FTP Host</label>
              <input
                v-model="form.ftp_host"
                type="text"
                placeholder="ftp.company.com"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">FTP Username</label>
              <input
                v-model="form.ftp_username"
                type="text"
                placeholder="deploy_ftp"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">FTP Password</label>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="FTP Password"
                class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <!-- ================= 10. SOFTWARE LICENSE ================= -->
        <div v-else-if="form.type === 'software_license'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Software Name *</label>
              <input
                v-model="form.software_name"
                type="text"
                required
                placeholder="Adobe Creative Cloud, JetBrains All Products, Figma"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Vendor / Publisher</label>
              <input
                v-model="form.vendor"
                type="text"
                placeholder="Adobe Systems, JetBrains, Microsoft"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">License / Activation Key *</label>
            <input
              v-model="form.license_key"
              type="text"
              required
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">License Model</label>
              <select
                v-model="form.license_type"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                <option value="per-seat">Per-Seat</option>
                <option value="subscription">Subscription</option>
                <option value="site">Site License</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Seat Count</label>
              <input
                v-model.number="form.seat_count"
                type="number"
                placeholder="5"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Expiration Date</label>
              <input
                v-model="form.expiration_date"
                type="date"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Assigned To (Optional)</label>
              <input
                v-model="form.assigned_to"
                type="text"
                placeholder="e.g. Design Team, Juan Dela Cruz"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <!-- ================= 11. SECURE NOTE ================= -->
        <div v-else-if="form.type === 'note'" class="space-y-3">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Note Title (Optional)</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Server Recovery Runbook (leave blank to auto-derive)"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Confidential Content *</label>
            <textarea
              v-model="form.content"
              rows="8"
              required
              placeholder="Store confidential operational procedures, recovery master keys, API client secrets, server configuration notes..."
              class="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground leading-relaxed"
            />
          </div>
        </div>

        <!-- ================= 12. EMPLOYEE IDENTITY PROFILE ================= -->
        <div v-else-if="form.type === 'identity'" class="space-y-5">
          <!-- 1. Personal & Employment Basics -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>Employee Information</span>
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">Employee's Name *</label>
                <input
                  v-model="form.full_name"
                  type="text"
                  required
                  placeholder="e.g. Marc Louie"
                  class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">DMBB/DBB ID No.</label>
                <input
                  v-model="form.dmbb_id"
                  type="text"
                  placeholder="e.g. 2022-00130"
                  class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">Department</label>
                <input
                  v-model="form.department"
                  type="text"
                  placeholder="e.g. Warehouse, IT, HR, Lineman"
                  class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">Position</label>
                <input
                  v-model="form.position"
                  type="text"
                  placeholder="e.g. Expediter, Specialist"
                  class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">Contract</label>
                <select
                  v-model="form.contract"
                  class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                >
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Project-Based">Project-Based</option>
                  <option value="Casual">Casual</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Consultant">Consultant</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">Status</label>
                <select
                  v-model="form.status"
                  class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">Birthdate</label>
                <input
                  v-model="form.birthdate"
                  type="text"
                  placeholder="e.g. July 9, 2000 or YYYY-MM-DD"
                  class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <!-- 2. Philippine Government IDs -->
          <div class="pt-3 border-t border-border space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-foreground uppercase tracking-wider">Philippine Government IDs</h4>
              <span class="text-[10px] text-muted-foreground">Optional fields</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">SSS No.</label>
                <input
                  v-model="form.sss_no"
                  type="text"
                  placeholder=""
                  class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">HDMF / Pag-IBIG No.</label>
                <input
                  v-model="form.hdmf_no"
                  type="text"
                  placeholder=""
                  class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">PHIC / PhilHealth No.</label>
                <input
                  v-model="form.phic_no"
                  type="text"
                  placeholder=""
                  class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">TIN No.</label>
                <input
                  v-model="form.tin_no"
                  type="text"
                  placeholder=""
                  class="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <!-- 3. Contact Details & Emergency -->
          <div class="pt-3 border-t border-border space-y-3">
            <h4 class="text-xs font-bold text-foreground uppercase tracking-wider">Contact & Emergency</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PhoneInput
                v-model="form.contact_no"
                label="Contact No."
                placeholder="0917 123 4567"
                helper="Primary mobile or contact number"
              />
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-foreground">Work Email</label>
                <input
                  v-model="form.work_email"
                  type="email"
                  placeholder="e.g. marclouie@dbb.com"
                  class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <AddressInput
              v-model="form.address"
              label="Address"
            />

            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">In Case of Emergency (ICE)</label>
              <input
                v-model="form.emergency_contact"
                type="text"
                placeholder="e.g. Kathryn Bernardo (Wife) - 0918-0000-1234"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <!-- ================= SECTION: COMPANY ORGANIZATION ASSIGNMENT ================= -->
        <div class="pt-4 border-t border-border space-y-4">
          <div class="flex items-center gap-2">
            <Building2 class="w-4 h-4 text-primary" />
            <h4 class="text-xs font-bold text-foreground uppercase tracking-wider">Company Assignment & Location</h4>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Company -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Company Name</label>
              <input
                v-model="form.company"
                type="text"
                list="companies-list"
                placeholder="e.g. DMBB Industrial"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
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
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
              <datalist id="departments-list">
                <option v-for="d in uniqueDepartments" :key="d" :value="d" />
              </datalist>
            </div>

            <!-- Team -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Team / Unit</label>
              <input
                v-model="form.team"
                type="text"
                list="teams-list"
                placeholder="DevOps, QA, Frontend"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
              />
              <datalist id="teams-list">
                <option v-for="t in uniqueTeams" :key="t" :value="t" />
              </datalist>
            </div>

            <!-- Location -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Office Location</label>
              <input
                v-model="form.location"
                type="text"
                placeholder="City Of Naga"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
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
                  class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground"
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
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
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
                  class="flex-1 px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
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
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
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
            <span>{{ itemToEdit ? 'Update Credential' : 'Save Credential' }}</span>
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
