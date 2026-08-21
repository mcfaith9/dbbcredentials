<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ChevronDown } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    id?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    label?: string
    helper?: string
  }>(),
  {
    modelValue: '',
    id: '',
    placeholder: '+63 917 123 4567',
    disabled: false,
    required: false,
    label: '',
    helper: '',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

interface CountryOption {
  code: string
  name: string
  dial: string
  flag: string
  formatHint: string
}

const countries: CountryOption[] = [
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', formatHint: '917 123 4567' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', formatHint: '555 123 4567' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬', formatHint: '8123 4567' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵', formatHint: '90 1234 5678' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', formatHint: '412 345 678' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', formatHint: '7911 123456' },
  { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰', formatHint: '9123 4567' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪', formatHint: '50 123 4567' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', formatHint: '50 123 4567' },
]

const selectedCountryCode = ref('PH')
const showCountryDropdown = ref(false)
const rawNumberInput = ref('')

const activeCountry = computed(() => {
  return countries.find((c) => c.code === selectedCountryCode.value) || countries[0]
})

// Initialize from existing modelValue
function initFromModelValue(val: string) {
  if (!val) {
    rawNumberInput.value = ''
    return
  }

  const clean = val.trim()
  // Check if starts with a known dial code
  const matched = countries.find((c) => clean.startsWith(c.dial))
  if (matched) {
    selectedCountryCode.value = matched.code
    rawNumberInput.value = clean.slice(matched.dial.length).trim()
  } else {
    // If local PH format starting with 09...
    if (clean.startsWith('09') && selectedCountryCode.value === 'PH') {
      rawNumberInput.value = clean.substring(1) // remove leading 0 for display
    } else {
      rawNumberInput.value = clean
    }
  }
}

// Watch incoming modelValue changes
watch(
  () => props.modelValue,
  (newVal) => {
    // Only update if not identical
    const currentCombined = getCombinedValue()
    if (newVal !== currentCombined) {
      initFromModelValue(newVal || '')
    }
  },
  { immediate: true }
)

function getCombinedValue(): string {
  const digits = rawNumberInput.value.trim()
  if (!digits) return ''
  // If user already typed full country code like +63... or international
  if (digits.startsWith('+')) {
    return digits
  }
  // If Philippines local format 09...
  if (selectedCountryCode.value === 'PH' && digits.startsWith('09')) {
    return `+63 ${digits.substring(1)}`
  }
  return `${activeCountry.value.dial} ${digits}`
}

function handleInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  rawNumberInput.value = input.value
  emit('update:modelValue', getCombinedValue())
}

function selectCountry(country: CountryOption) {
  selectedCountryCode.value = country.code
  showCountryDropdown.value = false
  emit('update:modelValue', getCombinedValue())
}
</script>

<template>
  <div class="space-y-1.5 w-full">
    <label v-if="label" :for="id" class="text-xs font-semibold text-foreground flex items-center justify-between">
      <span>{{ label }}</span>
      <span v-if="required" class="text-[11px] font-normal text-rose-500">*Required</span>
    </label>

    <div class="relative flex items-center rounded-xl border border-input bg-card/60 hover:bg-card focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition shadow-2xs">
      <!-- Country Selector Button -->
      <div class="relative">
        <button
          type="button"
          :disabled="disabled"
          @click="showCountryDropdown = !showCountryDropdown"
          class="flex items-center gap-1 px-3 py-2.5 h-full text-xs font-semibold text-foreground hover:bg-muted/60 rounded-l-xl transition border-r border-border shrink-0 select-none"
          title="Select Country Calling Code"
        >
          <span class="text-base leading-none">{{ activeCountry.flag }}</span>
          <span class="font-mono text-xs">{{ activeCountry.dial }}</span>
          <ChevronDown class="w-3 h-3 text-muted-foreground" />
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="showCountryDropdown"
          class="absolute top-full left-0 mt-1.5 w-56 rounded-xl border border-border bg-popover shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        >
          <div class="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Country Calling Code
          </div>
          <button
            v-for="c in countries"
            :key="c.code"
            type="button"
            @click="selectCountry(c)"
            class="w-full flex items-center justify-between px-3 py-2 text-xs text-foreground hover:bg-muted transition text-left"
            :class="{ 'bg-primary/10 font-bold text-primary': c.code === selectedCountryCode }"
          >
            <div class="flex items-center gap-2">
              <span class="text-base">{{ c.flag }}</span>
              <span>{{ c.name }}</span>
            </div>
            <span class="font-mono text-muted-foreground text-[11px]">{{ c.dial }}</span>
          </button>
        </div>
      </div>

      <!-- Phone Number Input -->
      <input
        :id="id"
        type="tel"
        :value="rawNumberInput"
        @input="handleInputChange"
        :disabled="disabled"
        :required="required"
        :placeholder="activeCountry.code === 'PH' ? '917 123 4567' : activeCountry.formatHint"
        class="w-full px-3.5 py-2.5 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none rounded-r-xl font-mono"
      />
    </div>

    <p v-if="helper" class="text-[11px] text-muted-foreground">
      {{ helper }}
    </p>
  </div>
</template>
