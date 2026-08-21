<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { VaultItem, VaultItemType } from '@/types'
import { useVault } from '@/composables/useVault'
import { useToast } from '@/composables/useToast'
import { calculatePasswordStrength } from '@/services/crypto'
import PasswordGeneratorModal from './PasswordGeneratorModal.vue'
import {
  KeyRound,
  FileText,
  User,
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

const { categories, saveItem, addCategory } = useVault()
const { success, error } = useToast()

const showGenerator = ref(false)
const showPassword = ref(false)
const newCategoryInput = ref('')
const showNewCategoryBox = ref(false)
const newTagInput = ref('')

const defaultFormData = () => ({
  id: '',
  type: (props.initialType || 'password') as VaultItemType,
  name: '',
  category: 'Personal',
  favorite: false,
  tags: [] as string[],
  notes: '',
  // Password
  username: '',
  email: '',
  password: '',
  website_url: '',
  // Note
  content: '',
  // Identity
  full_name: '',
  phone: '',
  address: '',
  birthday: '',
  company: '',
})

const form = reactive(defaultFormData())

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.itemToEdit) {
        Object.assign(form, {
          id: props.itemToEdit.id,
          type: props.itemToEdit.type,
          name: props.itemToEdit.name,
          category: props.itemToEdit.category || 'Personal',
          favorite: !!props.itemToEdit.favorite,
          tags: [...(props.itemToEdit.tags || [])],
          notes: props.itemToEdit.notes || '',
          username: props.itemToEdit.username || '',
          email: props.itemToEdit.email || '',
          password: props.itemToEdit.password || '',
          website_url: props.itemToEdit.website_url || '',
          content: props.itemToEdit.content || '',
          full_name: props.itemToEdit.full_name || '',
          phone: props.itemToEdit.phone || '',
          address: props.itemToEdit.address || '',
          birthday: props.itemToEdit.birthday || '',
          company: props.itemToEdit.company || '',
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
    error('Name required', 'Please give this item a descriptive name.')
    return
  }

  try {
    const saved = saveItem({
      ...form,
      name: form.name.trim(),
    })
    success(
      props.itemToEdit ? 'Item Updated' : 'Item Created',
      `"${saved.name}" has been saved securely in local storage.`
    )
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error('Failed to save item', err?.message || 'Local storage error')
  }
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
  >
    <div
      class="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col my-auto animate-in zoom-in-95 duration-150 overflow-hidden"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-5 border-b border-border bg-muted/20 shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-primary/10 text-primary">
            <KeyRound v-if="form.type === 'password'" class="w-5 h-5" />
            <FileText v-else-if="form.type === 'note'" class="w-5 h-5" />
            <User v-else class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-foreground">
              {{ itemToEdit ? 'Edit Item' : 'New Vault Item' }}
            </h3>
            <p class="text-xs text-muted-foreground">Stored encrypted on your local computer</p>
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

      <!-- Type Selector Tabs (Only when creating new) -->
      <div v-if="!itemToEdit" class="px-6 pt-4 pb-1 border-b border-border shrink-0 bg-muted/10">
        <div class="grid grid-cols-3 gap-2 p-1 bg-muted/70 rounded-xl">
          <button
            type="button"
            @click="form.type = 'password'"
            class="flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition"
            :class="[
              form.type === 'password'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <KeyRound class="w-3.5 h-3.5" />
            <span>Login</span>
          </button>

          <button
            type="button"
            @click="form.type = 'note'"
            class="flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition"
            :class="[
              form.type === 'note'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>Secure Note</span>
          </button>

          <button
            type="button"
            @click="form.type = 'identity'"
            class="flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition"
            :class="[
              form.type === 'identity'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
          >
            <User class="w-3.5 h-3.5" />
            <span>Identity</span>
          </button>
        </div>
      </div>

      <!-- Form Body Scrollable -->
      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto p-6 space-y-4">
        <!-- Common: Item Title / Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Item Name *</span>
            <span class="text-[11px] text-muted-foreground font-normal">e.g. GitHub, AWS, Personal Wi-Fi</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Name or Title"
            class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
          />
        </div>

        <!-- ================= PASSWORD FIELDS ================= -->
        <div v-if="form.type === 'password'" class="space-y-4 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Username</label>
              <input
                v-model="form.username"
                type="text"
                placeholder="Username or handle"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="account@example.com"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <!-- Password with Show/Hide and Generator -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-foreground">Password</label>
              <button
                type="button"
                @click="showGenerator = true"
                class="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition"
              >
                <Sparkles class="w-3.5 h-3.5" />
                <span>Generate Secure Password</span>
              </button>
            </div>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••••••"
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

            <!-- Strength meter if password entered -->
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

          <!-- Website URL -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Website URL</label>
            <input
              v-model="form.website_url"
              type="url"
              placeholder="https://example.com/login"
              class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
          </div>
        </div>

        <!-- ================= SECURE NOTE FIELDS ================= -->
        <div v-else-if="form.type === 'note'" class="space-y-3 pt-1">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-foreground">Secure Content</label>
            <textarea
              v-model="form.content"
              rows="6"
              placeholder="Store confidential keys, recovery phrases, server credentials, or sensitive notes..."
              class="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition leading-relaxed"
            />
          </div>
        </div>

        <!-- ================= IDENTITY FIELDS ================= -->
        <div v-else-if="form.type === 'identity'" class="space-y-4 pt-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Full Name</label>
              <input
                v-model="form.full_name"
                type="text"
                placeholder="Alex Morgan"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Company</label>
              <input
                v-model="form.company"
                type="text"
                placeholder="DBB Industries"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="alex@dbb.corp"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Phone</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="+1 (555) 019-2831"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Address</label>
              <input
                v-model="form.address"
                type="text"
                placeholder="100 Tech Blvd, Silicon Valley, CA"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-foreground">Birthday</label>
              <input
                v-model="form.birthday"
                type="date"
                class="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <!-- ================= CATEGORY & TAGS ================= -->
        <div class="pt-2 border-t border-border space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Category Picker -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-foreground">Category</label>
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
                  class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
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
                  placeholder="Add tag and press Enter"
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
            <label class="text-xs font-semibold text-foreground">Additional Notes</label>
            <textarea
              v-model="form.notes"
              rows="3"
              placeholder="Any extra details, security questions, or notes..."
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
            class="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-md transition"
          >
            <Lock class="w-3.5 h-3.5" />
            <span>{{ itemToEdit ? 'Update Item' : 'Save to Vault' }}</span>
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
