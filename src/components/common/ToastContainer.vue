<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from '@lucide/vue'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    class="fixed top-10 right-4 z-50 flex flex-col gap-2 max-w-sm w-auto min-w-[260px] pointer-events-none px-3"
    role="region"
    aria-label="Notifications"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-250 transition"
      enter-from-class="-translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 translate-x-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-xl shadow-md border backdrop-blur-md transition-all text-xs"
        :class="{
          'bg-white/95 dark:bg-zinc-900/95 border-emerald-500/30 text-zinc-900 dark:text-zinc-100 shadow-emerald-500/5': toast.type === 'success',
          'bg-white/95 dark:bg-zinc-900/95 border-rose-500/30 text-zinc-900 dark:text-zinc-100 shadow-rose-500/5': toast.type === 'error',
          'bg-white/95 dark:bg-zinc-900/95 border-blue-500/30 text-zinc-900 dark:text-zinc-100 shadow-blue-500/5': toast.type === 'info',
          'bg-white/95 dark:bg-zinc-900/95 border-amber-500/30 text-zinc-900 dark:text-zinc-100 shadow-amber-500/5': toast.type === 'warning',
        }"
      >
        <div class="shrink-0">
          <CheckCircle2 v-if="toast.type === 'success'" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <AlertCircle v-else-if="toast.type === 'error'" class="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <AlertTriangle v-else-if="toast.type === 'warning'" class="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <Info v-else class="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div class="flex-1 min-w-0 pr-1">
          <p class="text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            {{ toast.title }}
          </p>
          <p v-if="toast.description" class="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 leading-tight">
            {{ toast.description }}
          </p>
        </div>

        <button
          @click="dismiss(toast.id)"
          class="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Close notification"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
