<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from '@lucide/vue'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4"
    role="region"
    aria-label="Notifications"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all"
        :class="{
          'bg-white/95 dark:bg-zinc-900/95 border-emerald-500/30 text-zinc-900 dark:text-zinc-100 shadow-emerald-500/5': toast.type === 'success',
          'bg-white/95 dark:bg-zinc-900/95 border-rose-500/30 text-zinc-900 dark:text-zinc-100 shadow-rose-500/5': toast.type === 'error',
          'bg-white/95 dark:bg-zinc-900/95 border-blue-500/30 text-zinc-900 dark:text-zinc-100 shadow-blue-500/5': toast.type === 'info',
          'bg-white/95 dark:bg-zinc-900/95 border-amber-500/30 text-zinc-900 dark:text-zinc-100 shadow-amber-500/5': toast.type === 'warning',
        }"
      >
        <div class="mt-0.5 shrink-0">
          <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <Info v-else class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            {{ toast.title }}
          </p>
          <p v-if="toast.description" class="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-normal">
            {{ toast.description }}
          </p>
        </div>

        <button
          @click="dismiss(toast.id)"
          class="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Close notification"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
