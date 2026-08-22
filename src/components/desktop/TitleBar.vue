<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useElectron } from '@/composables/useElectron'
import {
  ShieldCheck,
  Lock,
  Unlock,
  Minus,
  Square,
  Copy,
  X,
} from '@lucide/vue'

const { isAuthenticated, lock } = useAuth()
const {
  isElectron,
  platform,
  platformInfo,
  isMaximized,
  minimizeWindow,
  toggleMaximizeWindow,
  closeWindow,
} = useElectron()

const isMac = computed(() => platform.value === 'darwin')
</script>

<template>
  <header
    id="desktop-titlebar"
    class="h-10 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between px-3 select-none z-50 text-xs shrink-0"
    style="-webkit-app-region: drag;"
  >
    <!-- Left Section: Traffic lights (macOS) or Logo & Title -->
    <div class="flex items-center gap-2.5" style="-webkit-app-region: no-drag;">
      <!-- macOS traffic lights (if Mac style) -->
      <div v-if="isMac" class="flex items-center gap-1.5 mr-2">
        <button
          id="mac-btn-close"
          @click="closeWindow"
          class="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center group"
          title="Close Window"
        >
          <X class="w-2 h-2 text-red-950 opacity-0 group-hover:opacity-100" />
        </button>
        <button
          id="mac-btn-min"
          @click="minimizeWindow"
          class="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 flex items-center justify-center group"
          title="Minimize Window"
        >
          <Minus class="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100" />
        </button>
        <button
          id="mac-btn-max"
          @click="toggleMaximizeWindow"
          class="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 flex items-center justify-center group"
          title="Maximize Window"
        >
          <Square class="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100" />
        </button>
      </div>

      <!-- App Icon & Title -->
      <div class="flex items-center gap-2">
        <div class="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <ShieldCheck class="w-3.5 h-3.5" />
        </div>
        <span class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 font-mono">
          APP Version {{platformInfo.appVersion}}
        </span>
      </div>
    </div>

    <!-- Center Section: Search & Vault Status -->
    <div class="flex items-center gap-3">
      <!-- Vault Lock Status Badge -->
      <div
        class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border"
        :class="isAuthenticated ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'"
      >
        <Unlock v-if="isAuthenticated" class="w-3 h-3 text-emerald-400" />
        <Lock v-else class="w-3 h-3 text-zinc-400" />
        <span>{{ isAuthenticated ? 'AES-256 Vault Unlocked' : 'Encrypted Vault Locked' }}</span>
      </div>
    </div>

    <!-- Right Section: Electron Runtime & Windows/Linux Window Controls -->
    <div class="flex items-center gap-2" style="-webkit-app-region: no-drag;">
      <!-- Environment Indicator Badge -->
      <div
        class="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border"
        :class="isElectron ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'"
        :title="isElectron ? 'Running inside native Electron desktop environment' : 'Running in browser preview mode (Electron ready)'"
      >
      </div>

      <!-- Quick Lock Button -->
      <button
        v-if="isAuthenticated"
        id="titlebar-lock-btn"
        @click="lock('User locked from titlebar')"
        class="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-850"
        title="Lock Vault Instantly"
      >
        <Lock class="w-3.5 h-3.5" />
      </button>

      <!-- Windows / Linux / Browser Title Bar Action Buttons -->
      <div v-if="!isMac" class="flex items-center ml-1 border-l border-zinc-800 pl-1">
        <button
          id="win-btn-min"
          @click="minimizeWindow"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          title="Minimize"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <button
          id="win-btn-max"
          @click="toggleMaximizeWindow"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          title="Maximize / Restore"
        >
          <Copy v-if="isMaximized" class="w-3 h-3 rotate-180" />
          <Square v-else class="w-3 h-3" />
        </button>
        <button
          id="win-btn-close"
          @click="closeWindow"
          class="w-7 h-7 flex items-center justify-center rounded hover:bg-red-600 text-zinc-400 hover:text-white"
          title="Close"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </header>
</template>
