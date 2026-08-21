<script setup lang="ts">
import TitleBar from '@/components/desktop/TitleBar.vue'

function handleOpenSearch() {
  window.dispatchEvent(new CustomEvent('open-vault-search'))
}
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased select-none">
    <!-- Electron Desktop Titlebar -->
    <TitleBar @open-search="handleOpenSearch" />

    <!-- Application Body -->
    <main class="flex-1 min-h-0 overflow-hidden relative">
      <RouterView />
    </main>
  </div>
</template>
