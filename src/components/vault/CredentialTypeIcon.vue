<script setup lang="ts">
import { computed } from 'vue'
import type { VaultItemType } from '@/types'
import {
  KeyRound,
  Mail,
  UsersRound,
  Building2,
  Monitor,
  Server,
  Wifi,
  Globe,
  Cloud,
  FileKey,
  FileText,
  ContactRound,
  Folder,
} from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    type?: VaultItemType | string
    size?: 'sm' | 'md' | 'lg' | 'xs'
    customClass?: string
  }>(),
  {
    type: 'password',
    size: 'sm',
    customClass: '',
  }
)

const sizeClasses = computed(() => {
  if (props.customClass) return props.customClass
  switch (props.size) {
    case 'xs':
      return 'w-3.5 h-3.5'
    case 'md':
      return 'w-6 h-6'
    case 'lg':
      return 'w-8 h-8'
    case 'sm':
    default:
      return 'w-4 h-4'
  }
})

const iconComponent = computed(() => {
  switch (props.type) {
    case 'password':
      return KeyRound
    case 'email_account':
      return Mail
    case 'social_account':
      return UsersRound
    case 'company_account':
      return Building2
    case 'pc_computer':
      return Monitor
    case 'server':
      return Server
    case 'wifi':
      return Wifi
    case 'domain':
      return Globe
    case 'hosting':
      return Cloud
    case 'software_license':
      return FileKey
    case 'note':
      return FileText
    case 'identity':
      return ContactRound
    default:
      return Folder
  }
})
</script>

<template>
  <component :is="iconComponent" :class="sizeClasses" />
</template>
