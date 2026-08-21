<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { generatePassword, calculatePasswordStrength } from '@/services/crypto'
import { useClipboard } from '@/composables/useClipboard'
import type { GeneratorOptions } from '@/types'
import { RefreshCw, Copy, Check, ShieldCheck, KeyRound, X } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  isEmbed?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'select', password: string): void
}>()

const options = reactive<GeneratorOptions>({
  length: 18,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
})

const generatedPassword = ref('')
const strength = ref(calculatePasswordStrength(''))
const isCopied = ref(false)

const { copyToClipboard } = useClipboard()

function regenerate() {
  generatedPassword.value = generatePassword(options)
  strength.value = calculatePasswordStrength(generatedPassword.value)
  isCopied.value = false
}

watch(
  () => [
    options.length,
    options.uppercase,
    options.lowercase,
    options.numbers,
    options.symbols,
    options.excludeAmbiguous,
  ],
  () => {
    regenerate()
  },
  { deep: true }
)

watch(
  () => props.open,
  (newVal) => {
    if (newVal && !generatedPassword.value) {
      regenerate()
    }
  }
)

onMounted(() => {
  regenerate()
})

async function handleCopy() {
  if (!generatedPassword.value) return
  const ok = await copyToClipboard(generatedPassword.value, 'Password copied to clipboard', true)
  if (ok) {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}

function handleUse() {
  emit('select', generatedPassword.value)
  emit('update:open', false)
}

function close() {
  emit('update:open', false)
}
</script>

<template>
  <div
    v-if="open || isEmbed"
    :class="[
      isEmbed
        ? 'w-full'
        : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200',
    ]"
  >
    <div
      :class="[
        isEmbed
          ? 'bg-card border border-border rounded-xl p-5'
          : 'bg-card text-card-foreground border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-150',
      ]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-border mb-5">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-primary/10 text-primary">
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-foreground">Password Generator</h3>
            <p class="text-xs text-muted-foreground">Generate cryptographically secure passwords locally</p>
          </div>
        </div>
        <button
          v-if="!isEmbed"
          @click="close"
          class="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Generated Password Box -->
      <div class="space-y-4">
        <div
          class="relative flex items-center justify-between p-3.5 bg-muted/70 dark:bg-muted/40 border border-border rounded-xl font-mono text-sm sm:text-base break-all select-all font-medium text-foreground transition-all"
        >
          <span class="tracking-wider pr-16">{{ generatedPassword || 'Generating...' }}</span>
          <div class="absolute right-2 flex items-center gap-1">
            <button
              @click="regenerate"
              class="p-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-lg transition-colors"
              title="Regenerate password"
            >
              <RefreshCw class="w-4 h-4" />
            </button>
            <button
              @click="handleCopy"
              class="p-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-lg transition-colors"
              title="Copy password"
            >
              <Check v-if="isCopied" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <Copy v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Strength Indicator Bar -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs font-medium">
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck class="w-3.5 h-3.5" />
              <span>Strength: <strong class="text-foreground capitalize">{{ strength.label }}</strong></span>
            </div>
            <span class="text-muted-foreground">{{ strength.entropy }} bits of entropy ({{ strength.score }}%)</span>
          </div>

          <div class="h-2 w-full bg-muted rounded-full overflow-hidden flex gap-1 p-0.5">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="{
                'bg-rose-500': strength.level === 'very-weak' || strength.level === 'weak',
                'bg-amber-500': strength.level === 'fair',
                'bg-emerald-500': strength.level === 'strong' || strength.level === 'excellent',
              }"
              :style="{ width: `${strength.score}%` }"
            />
          </div>
        </div>

        <!-- Controls -->
        <div class="space-y-4 pt-2">
          <!-- Length Slider -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-medium">
              <label class="text-foreground">Password Length</label>
              <span class="px-2 py-0.5 bg-muted rounded text-foreground font-mono font-semibold">{{ options.length }}</span>
            </div>
            <input
              type="range"
              v-model.number="options.length"
              min="8"
              max="64"
              class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div class="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>8</span>
              <span>16</span>
              <span>24</span>
              <span>32</span>
              <span>64</span>
            </div>
          </div>

          <!-- Character Toggles Grid -->
          <div class="grid grid-cols-2 gap-2.5 pt-1">
            <label
              class="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer text-xs font-medium text-foreground transition"
            >
              <input type="checkbox" v-model="options.uppercase" class="rounded border-border text-primary focus:ring-primary h-4 w-4" />
              <span>Uppercase (A-Z)</span>
            </label>
            <label
              class="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer text-xs font-medium text-foreground transition"
            >
              <input type="checkbox" v-model="options.lowercase" class="rounded border-border text-primary focus:ring-primary h-4 w-4" />
              <span>Lowercase (a-z)</span>
            </label>
            <label
              class="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer text-xs font-medium text-foreground transition"
            >
              <input type="checkbox" v-model="options.numbers" class="rounded border-border text-primary focus:ring-primary h-4 w-4" />
              <span>Numbers (0-9)</span>
            </label>
            <label
              class="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer text-xs font-medium text-foreground transition"
            >
              <input type="checkbox" v-model="options.symbols" class="rounded border-border text-primary focus:ring-primary h-4 w-4" />
              <span>Symbols (!@#$)</span>
            </label>
          </div>

          <!-- Ambiguous chars -->
          <label
            class="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer text-xs font-medium text-foreground transition"
          >
            <input type="checkbox" v-model="options.excludeAmbiguous" class="rounded border-border text-primary focus:ring-primary h-4 w-4" />
            <span>Exclude Ambiguous Characters (e.g. 0, O, 1, l, I)</span>
          </label>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-5">
          <button
            v-if="!isEmbed"
            @click="close"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          >
            Close
          </button>
          <button
            @click="handleCopy"
            class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition"
          >
            <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-600" />
            <Copy v-else class="w-3.5 h-3.5" />
            {{ isCopied ? 'Copied' : 'Copy Password' }}
          </button>
          <button
            v-if="!isEmbed"
            @click="handleUse"
            class="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition"
          >
            Use Password
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
