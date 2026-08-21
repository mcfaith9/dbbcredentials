<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { VaultItem } from '@/types'
import { useVault } from '@/composables/useVault'
import { useClipboard } from '@/composables/useClipboard'
import { useToast } from '@/composables/useToast'
import { calculatePasswordStrength } from '@/services/crypto'
import CredentialTypeIcon from './CredentialTypeIcon.vue'
import {
  Star,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Clock,
  Calendar,
  Tag,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Mail,
  UserCheck,
  Building2,
  KeyRound,
  AlertTriangle,
} from '@lucide/vue'

const props = defineProps<{
  item: VaultItem | null
}>()

const emit = defineEmits<{
  (e: 'edit', item: VaultItem): void
  (e: 'delete', id: string): void
}>()

const { toggleFavorite, moveToTrash } = useVault()
const { copyToClipboard } = useClipboard()
const { success } = useToast()

const showPassword = ref(false)
const copiedField = ref<string | null>(null)

watch(
  () => props.item?.id,
  () => {
    showPassword.value = false
    copiedField.value = null
  }
)

const passwordStrength = computed(() => {
  if (!props.item?.password) return null
  return calculatePasswordStrength(props.item.password)
})

const expirationWarning = computed(() => {
  if (!props.item?.expiration_date) return null
  const expTime = new Date(props.item.expiration_date).getTime()
  if (isNaN(expTime)) return null
  const now = Date.now()
  const diffDays = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24))
  return {
    daysRemaining: diffDays,
    isExpired: diffDays <= 0,
    isUrgent: diffDays <= 30,
  }
})

async function copyValue(val: string | number | undefined, label: string, fieldKey: string, isSensitive = true) {
  if (val === undefined || val === null || val === '') return
  const str = val.toString()
  const ok = await copyToClipboard(str, `${label} copied to clipboard`, isSensitive)
  if (ok) {
    copiedField.value = fieldKey
    setTimeout(() => {
      if (copiedField.value === fieldKey) {
        copiedField.value = null
      }
    }, 2000)
  }
}

function handleFavorite() {
  if (!props.item) return
  const newState = toggleFavorite(props.item.id)
  success(newState ? 'Added to Favorites' : 'Removed from Favorites')
}

function handleTrash() {
  if (!props.item) return
  moveToTrash(props.item.id)
  emit('delete', props.item.id)
  success('Moved to Trash', `"${props.item.name}" moved to trash.`)
}

function formatDate(iso: string) {
  if (!iso) return 'N/A'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
</script>

<template>
  <div v-if="!item" class="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/10">
    <div class="p-4 rounded-2xl bg-muted/60 mb-3 border border-border">
      <Building2 class="w-8 h-8 text-muted-foreground/60" />
    </div>
    <h3 class="text-sm font-semibold text-foreground">No Item Selected</h3>
    <p class="text-xs text-muted-foreground mt-1 max-w-xs">
      Select an item from the vault list to view company credentials, server specs, or employee profiles.
    </p>
  </div>

  <div v-else class="h-full flex flex-col bg-card overflow-y-auto">
    <!-- Header with Action Buttons -->
    <div class="p-6 border-b border-border flex items-start justify-between gap-4 bg-muted/10 shrink-0">
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
          <CredentialTypeIcon :type="item.type" size="md" />
        </div>

        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl font-bold text-foreground truncate">{{ item.name }}</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
              {{ item.category }}
            </span>
            <span
              v-if="item.company"
              class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20"
            >
              {{ item.company }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground capitalize mt-0.5 flex items-center gap-2">
            <span>{{ item.type.replace('_', ' ') }}</span>
            <span v-if="item.department" class="text-muted-foreground/60">•</span>
            <span v-if="item.department">{{ item.department }}</span>
            <span v-if="item.team" class="text-muted-foreground/60">•</span>
            <span v-if="item.team">{{ item.team }}</span>
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          @click="handleFavorite"
          class="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground transition"
          :class="{ 'text-amber-500 bg-amber-500/10 border-amber-500/30': item.favorite }"
          title="Favorite"
        >
          <Star class="w-4 h-4" :class="{ 'fill-amber-500': item.favorite }" />
        </button>

        <button
          @click="emit('edit', item)"
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted text-foreground transition"
          title="Edit"
        >
          <Edit class="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          @click="handleTrash"
          class="p-2 rounded-xl border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 hover:border-rose-500/30 transition"
          title="Move to Trash"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Expiration Warning Alert if applicable -->
    <div
      v-if="expirationWarning && expirationWarning.isUrgent"
      class="mx-6 mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs"
      :class="
        expirationWarning.isExpired
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
      "
    >
      <div class="flex items-center gap-2 font-medium">
        <AlertTriangle class="w-4 h-4 shrink-0" />
        <span v-if="expirationWarning.isExpired">
          Expired {{ Math.abs(expirationWarning.daysRemaining) }} day(s) ago ({{ item.expiration_date }})
        </span>
        <span v-else>
          Expiring in {{ expirationWarning.daysRemaining }} day(s) ({{ item.expiration_date }})
        </span>
      </div>
      <span class="font-bold text-[11px] uppercase tracking-wider">Renewal Required</span>
    </div>

    <!-- Main Content Fields Scrollable -->
    <div class="p-6 space-y-5 flex-1">
      <!-- ================= 1. PASSWORD / LOGIN VIEW ================= -->
      <div v-if="item.type === 'password'" class="space-y-3">
        <!-- Website URL -->
        <div v-if="item.website_url" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <Globe class="w-4 h-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <span class="text-[11px] font-medium text-muted-foreground block">Service URL</span>
              <a
                :href="item.website_url"
                target="_blank"
                rel="noreferrer"
                class="text-sm font-medium text-primary hover:underline truncate block"
              >
                {{ item.website_url }}
              </a>
            </div>
          </div>
          <a
            :href="item.website_url"
            target="_blank"
            rel="noreferrer"
            class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition shrink-0"
            title="Open Link"
          >
            <ExternalLink class="w-4 h-4" />
          </a>
        </div>

        <!-- Username -->
        <div v-if="item.username" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <UserCheck class="w-4 h-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <span class="text-[11px] font-medium text-muted-foreground block">Username</span>
              <span class="text-sm font-medium text-foreground truncate block font-mono">{{ item.username }}</span>
            </div>
          </div>
          <button
            @click="copyValue(item.username, 'Username', 'username', false)"
            class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition shrink-0"
            title="Copy Username"
          >
            <Check v-if="copiedField === 'username'" class="w-4 h-4 text-emerald-600" />
            <Copy v-else class="w-4 h-4" />
          </button>
        </div>

        <!-- Email -->
        <div v-if="item.email" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <Mail class="w-4 h-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <span class="text-[11px] font-medium text-muted-foreground block">Email</span>
              <span class="text-sm font-medium text-foreground truncate block">{{ item.email }}</span>
            </div>
          </div>
          <button
            @click="copyValue(item.email, 'Email', 'email', false)"
            class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition shrink-0"
            title="Copy Email"
          >
            <Check v-if="copiedField === 'email'" class="w-4 h-4 text-emerald-600" />
            <Copy v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ================= 2. EMAIL ACCOUNT VIEW ================= -->
      <div v-else-if="item.type === 'email_account'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">Email Address</span>
              <span class="text-sm font-semibold text-foreground font-mono">{{ item.email }}</span>
            </div>
            <button @click="copyValue(item.email, 'Email', 'em_email', false)" class="text-muted-foreground hover:text-foreground">
              <Check v-if="copiedField === 'em_email'" class="w-4 h-4 text-emerald-600" />
              <Copy v-else class="w-4 h-4" />
            </button>
          </div>

          <div v-if="item.provider" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Mail Provider</span>
            <span class="text-sm font-semibold text-foreground">{{ item.provider }}</span>
          </div>
        </div>

        <div v-if="item.login_url" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-muted-foreground block">Webmail Login URL</span>
            <a :href="item.login_url" target="_blank" class="text-sm font-medium text-primary hover:underline truncate block">
              {{ item.login_url }}
            </a>
          </div>
          <a :href="item.login_url" target="_blank" class="p-2 text-muted-foreground hover:text-foreground">
            <ExternalLink class="w-4 h-4" />
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.imap_server" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">IMAP Server</span>
              <span class="text-sm font-mono text-foreground">{{ item.imap_server }}</span>
            </div>
            <button @click="copyValue(item.imap_server, 'IMAP Server', 'imap', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>

          <div v-if="item.smtp_server" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">SMTP Server</span>
              <span class="text-sm font-mono text-foreground">{{ item.smtp_server }}</span>
            </div>
            <button @click="copyValue(item.smtp_server, 'SMTP Server', 'smtp', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="item.recovery_email" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[11px] font-medium text-muted-foreground block">Recovery Email</span>
            <span class="text-sm text-foreground font-mono">{{ item.recovery_email }}</span>
          </div>
          <button @click="copyValue(item.recovery_email, 'Recovery Email', 'rec_email', false)" class="text-muted-foreground hover:text-foreground">
            <Copy class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ================= 3. SOCIAL ACCOUNT VIEW ================= -->
      <div v-else-if="item.type === 'social_account'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.platform" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Platform</span>
            <span class="text-sm font-semibold text-foreground">{{ item.platform }}</span>
          </div>
          <div v-if="item.username" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">Handle / Username</span>
              <span class="text-sm font-semibold text-foreground font-mono">{{ item.username }}</span>
            </div>
            <button @click="copyValue(item.username, 'Username', 'soc_user', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="item.profile_url" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-muted-foreground block">Profile URL</span>
            <a :href="item.profile_url" target="_blank" class="text-sm font-medium text-primary hover:underline truncate block">
              {{ item.profile_url }}
            </a>
          </div>
          <a :href="item.profile_url" target="_blank" class="p-2 text-muted-foreground hover:text-foreground">
            <ExternalLink class="w-4 h-4" />
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.access_level" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Access Level</span>
            <span class="text-sm font-semibold capitalize text-foreground">{{ item.access_level }}</span>
          </div>
          <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">Two-Factor Authentication</span>
              <span class="text-sm font-semibold" :class="item.two_factor_enabled ? 'text-emerald-500' : 'text-amber-500'">
                {{ item.two_factor_enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= 4. COMPANY ACCOUNT VIEW ================= -->
      <div v-else-if="item.type === 'company_account'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.provider" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Service / Provider</span>
            <span class="text-sm font-semibold text-foreground">{{ item.provider }}</span>
          </div>
          <div v-if="item.account_id" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">Account ID / Org Key</span>
              <span class="text-sm font-mono text-foreground">{{ item.account_id }}</span>
            </div>
            <button @click="copyValue(item.account_id, 'Account ID', 'comp_acct_id', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="item.login_url" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-muted-foreground block">Portal URL</span>
            <a :href="item.login_url" target="_blank" class="text-sm font-medium text-primary hover:underline truncate block">
              {{ item.login_url }}
            </a>
          </div>
          <a :href="item.login_url" target="_blank" class="p-2 text-muted-foreground hover:text-foreground">
            <ExternalLink class="w-4 h-4" />
          </a>
        </div>
      </div>

      <!-- ================= 5. PC / COMPUTER VIEW ================= -->
      <div v-else-if="item.type === 'pc_computer'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-if="item.hostname" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">Hostname</span>
              <span class="text-sm font-mono font-semibold text-foreground">{{ item.hostname }}</span>
            </div>
            <button @click="copyValue(item.hostname, 'Hostname', 'pc_host', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>

          <div v-if="item.operating_system" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Operating System</span>
            <span class="text-sm font-semibold text-foreground">{{ item.operating_system }}</span>
          </div>

          <div v-if="item.device_type" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Device Type</span>
            <span class="text-sm font-semibold capitalize text-foreground">{{ item.device_type }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.ip_address" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">IP Address</span>
              <span class="text-sm font-mono text-foreground">{{ item.ip_address }}</span>
            </div>
            <button @click="copyValue(item.ip_address, 'IP Address', 'pc_ip', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>

          <div v-if="item.mac_address" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">MAC Address</span>
              <span class="text-sm font-mono text-foreground">{{ item.mac_address }}</span>
            </div>
            <button @click="copyValue(item.mac_address, 'MAC Address', 'pc_mac', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div v-if="item.admin_account" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[11px] font-medium text-muted-foreground block">Local Admin Account</span>
            <span class="text-sm font-mono text-foreground">{{ item.admin_account }}</span>
          </div>
          <button @click="copyValue(item.admin_account, 'Admin Account', 'pc_admin', false)" class="text-muted-foreground hover:text-foreground">
            <Copy class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ================= 6. SERVER / VPS VIEW ================= -->
      <div v-else-if="item.type === 'server'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-if="item.hostname" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">Server Hostname</span>
              <span class="text-sm font-mono font-semibold text-foreground">{{ item.hostname }}</span>
            </div>
            <button @click="copyValue(item.hostname, 'Hostname', 'srv_host', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>

          <div class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Protocol & Port</span>
            <span class="text-sm font-mono font-semibold text-foreground">{{ item.protocol || 'SSH' }} : {{ item.port || 22 }}</span>
          </div>

          <div v-if="item.environment" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Environment</span>
            <span
              class="text-xs font-bold uppercase px-2 py-0.5 rounded"
              :class="item.environment === 'production' ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'"
            >
              {{ item.environment }}
            </span>
          </div>
        </div>

        <div v-if="item.server_url" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-muted-foreground block">Management URL</span>
            <a :href="item.server_url" target="_blank" class="text-sm font-medium text-primary hover:underline truncate block">
              {{ item.server_url }}
            </a>
          </div>
          <a :href="item.server_url" target="_blank" class="p-2 text-muted-foreground hover:text-foreground">
            <ExternalLink class="w-4 h-4" />
          </a>
        </div>
      </div>

      <!-- ================= 7. WI-FI VIEW ================= -->
      <div v-else-if="item.type === 'wifi'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.ssid" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">SSID Network</span>
              <span class="text-sm font-mono font-semibold text-foreground">{{ item.ssid }}</span>
            </div>
            <button @click="copyValue(item.ssid, 'SSID', 'wifi_ssid', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>

          <div class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Security Type</span>
            <span class="text-sm font-semibold text-foreground">{{ item.security_type || 'WPA2' }}</span>
          </div>
        </div>

        <div v-if="item.router_ip" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[11px] font-medium text-muted-foreground block">Gateway / Router IP</span>
            <span class="text-sm font-mono text-foreground">{{ item.router_ip }}</span>
          </div>
          <button @click="copyValue(item.router_ip, 'Router IP', 'wifi_router', false)" class="text-muted-foreground hover:text-foreground">
            <Copy class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ================= 8. DOMAIN VIEW ================= -->
      <div v-else-if="item.type === 'domain'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.domain_name" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">Domain Name</span>
              <span class="text-sm font-mono font-bold text-foreground">{{ item.domain_name }}</span>
            </div>
            <button @click="copyValue(item.domain_name, 'Domain', 'dom_name', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>

          <div v-if="item.registrar" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Registrar</span>
            <span class="text-sm font-semibold text-foreground">{{ item.registrar }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-if="item.registration_date" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Registration Date</span>
            <span class="text-sm font-medium text-foreground">{{ item.registration_date }}</span>
          </div>

          <div v-if="item.expiration_date" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Expiration Date</span>
            <span class="text-sm font-semibold text-foreground">{{ item.expiration_date }}</span>
          </div>

          <div class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Auto-Renew</span>
            <span class="text-sm font-semibold" :class="item.auto_renew ? 'text-emerald-500' : 'text-rose-500'">
              {{ item.auto_renew ? 'Active' : 'Disabled' }}
            </span>
          </div>
        </div>

        <div v-if="item.nameservers" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div>
            <span class="text-[11px] font-medium text-muted-foreground block">Nameservers</span>
            <span class="text-sm font-mono text-foreground">{{ item.nameservers }}</span>
          </div>
          <button @click="copyValue(item.nameservers, 'Nameservers', 'ns_servers', false)" class="text-muted-foreground hover:text-foreground">
            <Copy class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ================= 9. HOSTING VIEW ================= -->
      <div v-else-if="item.type === 'hosting'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.provider" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Hosting Provider</span>
            <span class="text-sm font-semibold text-foreground">{{ item.provider }}</span>
          </div>
          <div v-if="item.control_panel" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Control Panel</span>
            <span class="text-sm font-semibold text-foreground">{{ item.control_panel }}</span>
          </div>
        </div>

        <div v-if="item.dashboard_url" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-muted-foreground block">Dashboard URL</span>
            <a :href="item.dashboard_url" target="_blank" class="text-sm font-medium text-primary hover:underline truncate block">
              {{ item.dashboard_url }}
            </a>
          </div>
          <a :href="item.dashboard_url" target="_blank" class="p-2 text-muted-foreground hover:text-foreground">
            <ExternalLink class="w-4 h-4" />
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.ftp_host" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">FTP Host</span>
              <span class="text-sm font-mono text-foreground">{{ item.ftp_host }}</span>
            </div>
            <button @click="copyValue(item.ftp_host, 'FTP Host', 'ftp_h', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>

          <div v-if="item.ftp_username" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] font-medium text-muted-foreground block">FTP Username</span>
              <span class="text-sm font-mono text-foreground">{{ item.ftp_username }}</span>
            </div>
            <button @click="copyValue(item.ftp_username, 'FTP Username', 'ftp_u', false)" class="text-muted-foreground hover:text-foreground">
              <Copy class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- ================= 10. SOFTWARE LICENSE VIEW ================= -->
      <div v-else-if="item.type === 'software_license'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.software_name" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Software Name</span>
            <span class="text-sm font-semibold text-foreground">{{ item.software_name }}</span>
          </div>
          <div v-if="item.vendor" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Vendor</span>
            <span class="text-sm font-semibold text-foreground">{{ item.vendor }}</span>
          </div>
        </div>

        <div v-if="item.license_key" class="p-3.5 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="min-w-0 flex-1 mr-2">
            <span class="text-[11px] font-medium text-muted-foreground block">License Key / Activation Key</span>
            <span class="text-sm font-mono font-bold text-foreground break-all select-all">{{ item.license_key }}</span>
          </div>
          <button @click="copyValue(item.license_key, 'License Key', 'lic_key', true)" class="p-2 text-muted-foreground hover:text-foreground shrink-0">
            <Check v-if="copiedField === 'lic_key'" class="w-4 h-4 text-emerald-600" />
            <Copy v-else class="w-4 h-4" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-if="item.license_type" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">License Model</span>
            <span class="text-sm font-semibold capitalize text-foreground">{{ item.license_type }}</span>
          </div>
          <div v-if="item.seat_count" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Seat Count</span>
            <span class="text-sm font-semibold text-foreground">{{ item.seat_count }} seats</span>
          </div>
          <div v-if="item.expiration_date" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Expiration Date</span>
            <span class="text-sm font-semibold text-foreground">{{ item.expiration_date }}</span>
          </div>
        </div>
      </div>

      <!-- ================= 11. SECURE NOTE VIEW ================= -->
      <div v-else-if="item.type === 'note'" class="space-y-3">
        <div class="p-5 rounded-xl border border-border bg-card/60 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-border/60">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confidential Note</span>
            <button
              @click="copyValue(item.content, 'Note content', 'note_content', true)"
              class="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
            >
              <Check v-if="copiedField === 'note_content'" class="w-3.5 h-3.5 text-emerald-600" />
              <Copy v-else class="w-3.5 h-3.5" />
              <span>Copy Note</span>
            </button>
          </div>
          <pre class="text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed text-foreground select-all">{{
            item.content || '(Empty secure note)'
          }}</pre>
        </div>
      </div>

      <!-- ================= 12. EMPLOYEE IDENTITY VIEW ================= -->
      <div v-else-if="item.type === 'identity'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.full_name" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Full Name</span>
            <div class="flex justify-between items-center mt-0.5">
              <span class="text-sm font-semibold text-foreground">{{ item.full_name }}</span>
              <button @click="copyValue(item.full_name, 'Full Name', 'id_name', false)" class="text-muted-foreground hover:text-foreground">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="item.position" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Position / Title</span>
            <span class="text-sm font-semibold text-foreground block mt-0.5">{{ item.position }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.work_email || item.email" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Work Email</span>
            <div class="flex justify-between items-center mt-0.5">
              <span class="text-sm font-semibold text-foreground font-mono truncate">{{ item.work_email || item.email }}</span>
              <button @click="copyValue(item.work_email || item.email, 'Work Email', 'id_wemail', false)" class="text-muted-foreground hover:text-foreground shrink-0">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="item.work_phone || item.phone" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground block">Work Phone</span>
            <div class="flex justify-between items-center mt-0.5">
              <span class="text-sm font-semibold text-foreground">{{ item.work_phone || item.phone }}</span>
              <button @click="copyValue(item.work_phone || item.phone, 'Work Phone', 'id_wphone', false)" class="text-muted-foreground hover:text-foreground">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="item.office_address" class="p-3.5 rounded-xl border border-border bg-card/60">
          <span class="text-[11px] font-medium text-muted-foreground block">Office Location</span>
          <span class="text-sm text-foreground block mt-0.5">{{ item.office_address }}</span>
        </div>
      </div>

      <!-- Password Card (for any item type that has password) -->
      <div v-if="item.password && item.type !== 'password'" class="p-4 rounded-xl border border-border bg-card/60 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <KeyRound class="w-4 h-4 text-muted-foreground shrink-0" />
            <div class="min-w-0 flex-1">
              <span class="text-[11px] font-medium text-muted-foreground block">Password / Secret Key</span>
              <span v-if="showPassword" class="text-sm font-mono font-medium text-foreground break-all select-all block">
                {{ item.password }}
              </span>
              <span v-else class="text-sm font-mono font-bold tracking-widest text-muted-foreground select-none block">
                ••••••••••••••••
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="showPassword = !showPassword"
              class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
              title="Toggle Visibility"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
            <button
              @click="copyValue(item.password, 'Password', 'sub_password', true)"
              class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
              title="Copy Password"
            >
              <Check v-if="copiedField === 'sub_password'" class="w-4 h-4 text-emerald-600" />
              <Copy v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Password Strength indicator -->
        <div v-if="passwordStrength" class="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            <ShieldAlert v-if="passwordStrength.score < 60" class="w-3.5 h-3.5 text-rose-500" />
            <ShieldCheck v-else class="w-3.5 h-3.5 text-emerald-500" />
            <span class="text-muted-foreground">Strength:</span>
            <span
              class="font-semibold capitalize"
              :class="{
                'text-rose-500': passwordStrength.score < 60,
                'text-amber-500': passwordStrength.score >= 60 && passwordStrength.score < 80,
                'text-emerald-500': passwordStrength.score >= 80,
              }"
            >
              {{ passwordStrength.label }} ({{ passwordStrength.score }}%)
            </span>
          </div>
        </div>
      </div>

      <!-- Section: Company Assignment & Details Box -->
      <div
        v-if="item.company || item.department || item.team || item.assigned_to || item.location"
        class="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
      >
        <span class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Building2 class="w-3.5 h-3.5" />
          <span>Organization Assignment</span>
        </span>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div v-if="item.company">
            <span class="text-muted-foreground block text-[11px]">Company</span>
            <span class="font-semibold text-foreground">{{ item.company }}</span>
          </div>
          <div v-if="item.department">
            <span class="text-muted-foreground block text-[11px]">Department</span>
            <span class="font-semibold text-foreground">{{ item.department }}</span>
          </div>
          <div v-if="item.team">
            <span class="text-muted-foreground block text-[11px]">Team</span>
            <span class="font-semibold text-foreground">{{ item.team }}</span>
          </div>
          <div v-if="item.assigned_to">
            <span class="text-muted-foreground block text-[11px]">Assigned To</span>
            <span class="font-semibold text-foreground">{{ item.assigned_to }}</span>
          </div>
          <div v-if="item.location">
            <span class="text-muted-foreground block text-[11px]">Location</span>
            <span class="font-semibold text-foreground">{{ item.location }}</span>
          </div>
        </div>
      </div>

      <!-- Tags Section -->
      <div v-if="item.tags && item.tags.length > 0" class="space-y-2">
        <span class="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Tag class="w-3.5 h-3.5" /> Tags
        </span>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in item.tags"
            :key="tag"
            class="px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border"
          >
            #{{ tag }}
          </span>
        </div>
      </div>

      <!-- Additional Notes -->
      <div v-if="item.notes" class="p-4 rounded-xl border border-border bg-muted/20 space-y-1.5">
        <span class="text-xs font-semibold text-muted-foreground block">Additional Notes</span>
        <p class="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{{ item.notes }}</p>
      </div>

      <!-- Metadata Audit Timestamps -->
      <div class="pt-4 border-t border-border grid grid-cols-2 gap-4 text-[11px] text-muted-foreground">
        <div class="flex items-center gap-1.5">
          <Calendar class="w-3.5 h-3.5" />
          <span>Created: {{ formatDate(item.created_at) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <Clock class="w-3.5 h-3.5" />
          <span>Modified: {{ formatDate(item.updated_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
