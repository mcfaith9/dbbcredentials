<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { VaultItem } from '@/types'
import { useVault } from '@/composables/useVault'
import { useClipboard } from '@/composables/useClipboard'
import { useToast } from '@/composables/useToast'
import { calculatePasswordStrength } from '@/services/crypto'
import {
  KeyRound,
  FileText,
  User,
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
  Phone,
  MapPin,
  Building,
} from '@lucide/vue'

const props = defineProps<{
  item: VaultItem | null
}>()

const emit = defineEmits<{
  (e: 'edit', item: VaultItem): void
  (e: 'delete', id: string): void
}>()

const { toggleFavorite, moveToTrash, securityReport } = useVault()
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

const isPasswordReused = computed(() => {
  if (!props.item?.password) return false
  return securityReport.value.reusedItems.some((r) => r.password === props.item?.password && r.items.length > 1)
})

async function copyValue(val: string | undefined, label: string, fieldKey: string, isSensitive = true) {
  if (!val) return
  const ok = await copyToClipboard(val, `${label} copied to clipboard`, isSensitive)
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
      <KeyRound class="w-8 h-8 text-muted-foreground/60" />
    </div>
    <h3 class="text-sm font-semibold text-foreground">No Item Selected</h3>
    <p class="text-xs text-muted-foreground mt-1 max-w-xs">
      Select an item from the list to view its details, copy credentials, or make changes.
    </p>
  </div>

  <div v-else class="h-full flex flex-col bg-card overflow-y-auto">
    <!-- Header with Action Buttons -->
    <div class="p-6 border-b border-border flex items-start justify-between gap-4 bg-muted/10 shrink-0">
      <div class="flex items-center gap-3.5 min-w-0">
        <div
          class="p-3 rounded-2xl shrink-0"
          :class="{
            'bg-blue-500/10 text-blue-600 dark:text-blue-400': item.type === 'password',
            'bg-amber-500/10 text-amber-600 dark:text-amber-400': item.type === 'note',
            'bg-purple-500/10 text-purple-600 dark:text-purple-400': item.type === 'identity',
          }"
        >
          <KeyRound v-if="item.type === 'password'" class="w-6 h-6" />
          <FileText v-else-if="item.type === 'note'" class="w-6 h-6" />
          <User v-else class="w-6 h-6" />
        </div>

        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-xl font-bold text-foreground truncate">{{ item.name }}</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
              {{ item.category }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground capitalize mt-0.5">
            {{ item.type === 'note' ? 'Secure Note' : item.type === 'password' ? 'Login Credentials' : 'Personal Identity' }}
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

    <!-- Main Content Fields -->
    <div class="p-6 space-y-6 flex-1">
      <!-- ================= PASSWORD ITEM VIEW ================= -->
      <div v-if="item.type === 'password'" class="space-y-4">
        <!-- Website URL -->
        <div v-if="item.website_url" class="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <Globe class="w-4 h-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <span class="text-[11px] font-medium text-muted-foreground block">Website</span>
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
            title="Open Website"
          >
            <ExternalLink class="w-4 h-4" />
          </a>
        </div>

        <!-- Username -->
        <div v-if="item.username" class="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <UserCheck class="w-4 h-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <span class="text-[11px] font-medium text-muted-foreground block">Username</span>
              <span class="text-sm font-medium text-foreground truncate block">{{ item.username }}</span>
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
        <div v-if="item.email" class="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between">
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

        <!-- Password -->
        <div class="p-4 rounded-xl border border-border bg-card/60 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <KeyRound class="w-4 h-4 text-muted-foreground shrink-0" />
              <div class="min-w-0 flex-1">
                <span class="text-[11px] font-medium text-muted-foreground block">Password</span>
                <span v-if="showPassword" class="text-sm font-mono font-medium text-foreground break-all select-all block">
                  {{ item.password || '(No password set)' }}
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
                @click="copyValue(item.password, 'Password', 'password', true)"
                class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
                title="Copy Password"
              >
                <Check v-if="copiedField === 'password'" class="w-4 h-4 text-emerald-600" />
                <Copy v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Password Security Warning / Strength badge -->
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

            <div v-if="isPasswordReused" class="flex items-center gap-1 text-rose-500 font-medium text-[11px]">
              <span>⚠️ Reused in other items</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= SECURE NOTE VIEW ================= -->
      <div v-else-if="item.type === 'note'" class="space-y-4">
        <div class="p-5 rounded-xl border border-border bg-card/60 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-border/60">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Encrypted Note Content</span>
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

      <!-- ================= IDENTITY VIEW ================= -->
      <div v-else-if="item.type === 'identity'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-if="item.full_name" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <User class="w-3.5 h-3.5" /> Full Name
            </span>
            <div class="flex justify-between items-center mt-1">
              <span class="text-sm font-semibold text-foreground">{{ item.full_name }}</span>
              <button @click="copyValue(item.full_name, 'Full Name', 'id_name', false)" class="text-muted-foreground hover:text-foreground">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="item.company" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Building class="w-3.5 h-3.5" /> Company
            </span>
            <div class="flex justify-between items-center mt-1">
              <span class="text-sm font-semibold text-foreground">{{ item.company }}</span>
              <button @click="copyValue(item.company, 'Company', 'id_comp', false)" class="text-muted-foreground hover:text-foreground">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="item.email" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Mail class="w-3.5 h-3.5" /> Email
            </span>
            <div class="flex justify-between items-center mt-1">
              <span class="text-sm font-semibold text-foreground truncate">{{ item.email }}</span>
              <button @click="copyValue(item.email, 'Email', 'id_email', false)" class="text-muted-foreground hover:text-foreground shrink-0">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="item.phone" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Phone class="w-3.5 h-3.5" /> Phone
            </span>
            <div class="flex justify-between items-center mt-1">
              <span class="text-sm font-semibold text-foreground">{{ item.phone }}</span>
              <button @click="copyValue(item.phone, 'Phone', 'id_phone', false)" class="text-muted-foreground hover:text-foreground">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="item.address" class="p-3.5 rounded-xl border border-border bg-card/60 sm:col-span-2">
            <span class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <MapPin class="w-3.5 h-3.5" /> Address
            </span>
            <div class="flex justify-between items-start mt-1">
              <span class="text-sm font-semibold text-foreground">{{ item.address }}</span>
              <button @click="copyValue(item.address, 'Address', 'id_addr', false)" class="text-muted-foreground hover:text-foreground shrink-0">
                <Copy class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="item.birthday" class="p-3.5 rounded-xl border border-border bg-card/60">
            <span class="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar class="w-3.5 h-3.5" /> Birthday
            </span>
            <span class="text-sm font-semibold text-foreground block mt-1">{{ item.birthday }}</span>
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
        <span class="text-xs font-semibold text-muted-foreground block">Notes</span>
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
