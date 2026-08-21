<script setup lang="ts">
import { ref, watch } from 'vue'
import { MapPin } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    disabled?: boolean
    label?: string
  }>(),
  {
    modelValue: '',
    disabled: false,
    label: 'Office / Facility Address',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// Structured subfields
const unitStreet = ref('')
const barangay = ref('')
const city = ref('')
const province = ref('')
const postalCode = ref('')
const country = ref('Philippines')

const isDetailedMode = ref(false)

// Philippine major cities and business districts for quick suggestions
const phCities = [
  'Makati City',
  'Taguig (BGC)',
  'Quezon City',
  'Pasig (Ortigas)',
  'Mandaluyong',
  'City of Manila',
  'Pasay',
  'Parañaque',
  'Muntinlupa (Alabang)',
  'San Juan',
  'Caloocan',
  'Cebu City',
  'Mandaue City',
  'Lapu-Lapu City',
  'Davao City',
  'Angeles City (Clark)',
  'Santa Rosa, Laguna',
  'Bacoor, Cavite',
  'Iloilo City',
  'Baguio City',
  'Cagayan de Oro',
]

const phProvinces = [
  'Metro Manila (NCR)',
  'Cebu',
  'Cavite',
  'Laguna',
  'Rizal',
  'Bulacan',
  'Pampanga',
  'Batangas',
  'Davao del Sur',
  'Iloilo',
  'Benguet',
  'Misamis Oriental',
]

// Initialize or parse initial modelValue
function initFromValue(val: string) {
  if (!val) return
  // If not structured, we just keep val
  if (!unitStreet.value && !city.value) {
    unitStreet.value = val
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val && !unitStreet.value && !city.value) {
      initFromValue(val)
    }
  },
  { immediate: true }
)

function updateComposite() {
  if (isDetailedMode.value) {
    const parts = [
      unitStreet.value.trim(),
      barangay.value.trim() ? `Brgy. ${barangay.value.trim().replace(/^brgy\.?\s*/i, '')}` : '',
      city.value.trim(),
      province.value.trim(),
      postalCode.value.trim(),
      country.value.trim() || 'Philippines',
    ].filter(Boolean)

    emit('update:modelValue', parts.join(', '))
  } else {
    emit('update:modelValue', unitStreet.value.trim())
  }
}
</script>

<template>
  <div class="space-y-2 w-full">
    <div class="flex items-center justify-between">
      <label class="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <MapPin class="w-3.5 h-3.5 text-muted-foreground" />
        <span>{{ label }}</span>
      </label>

      <button
        type="button"
        @click="isDetailedMode = !isDetailedMode"
        class="text-[11px] text-primary hover:underline font-medium"
      >
        {{ isDetailedMode ? 'Switch to Single Line' : 'Structured Address (PH)' }}
      </button>
    </div>

    <!-- Single line mode -->
    <div v-if="!isDetailedMode" class="relative">
      <input
        type="text"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :disabled="disabled"
        placeholder="e.g. Unit 1402, Ayala Ave, San Lorenzo, Makati City, Metro Manila 1226"
        class="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-input bg-card/60 hover:bg-card focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition placeholder:text-muted-foreground"
      />
    </div>

    <!-- Structured Philippine Address Mode -->
    <div v-else class="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2.5">
      <!-- Unit & Street -->
      <div class="space-y-1">
        <span class="text-[11px] font-medium text-muted-foreground">Unit / Floor / Building / Street</span>
        <input
          type="text"
          v-model="unitStreet"
          @input="updateComposite"
          :disabled="disabled"
          placeholder="e.g. 24th Floor, PBCom Tower, 6795 Ayala Avenue"
          class="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <!-- Barangay -->
        <div class="space-y-1">
          <span class="text-[11px] font-medium text-muted-foreground">Barangay / Village</span>
          <input
            type="text"
            v-model="barangay"
            @input="updateComposite"
            :disabled="disabled"
            placeholder="e.g. Bel-Air or San Lorenzo"
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <!-- City / Municipality -->
        <div class="space-y-1">
          <span class="text-[11px] font-medium text-muted-foreground">City / Municipality</span>
          <input
            type="text"
            v-model="city"
            @input="updateComposite"
            :disabled="disabled"
            list="ph-cities-list"
            placeholder="e.g. Makati City"
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <datalist id="ph-cities-list">
            <option v-for="c in phCities" :key="c" :value="c" />
          </datalist>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <!-- Province / Region -->
        <div class="space-y-1 sm:col-span-1">
          <span class="text-[11px] font-medium text-muted-foreground">Province / Region</span>
          <input
            type="text"
            v-model="province"
            @input="updateComposite"
            :disabled="disabled"
            list="ph-provinces-list"
            placeholder="e.g. Metro Manila"
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <datalist id="ph-provinces-list">
            <option v-for="p in phProvinces" :key="p" :value="p" />
          </datalist>
        </div>

        <!-- Postal Code -->
        <div class="space-y-1">
          <span class="text-[11px] font-medium text-muted-foreground">Postal / ZIP Code</span>
          <input
            type="text"
            v-model="postalCode"
            @input="updateComposite"
            :disabled="disabled"
            placeholder="e.g. 1226"
            class="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-input bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <!-- Country -->
        <div class="space-y-1">
          <span class="text-[11px] font-medium text-muted-foreground">Country</span>
          <input
            type="text"
            v-model="country"
            @input="updateComposite"
            :disabled="disabled"
            placeholder="Philippines"
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  </div>
</template>
