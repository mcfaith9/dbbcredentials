<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  Info,
} from '@lucide/vue'

const router = useRouter()
const { login, initAuth } = useAuth()
const { success: toastSuccess } = useToast()

const username = ref('dbadmin')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const showForgotHint = ref(false)

onMounted(async () => {
  await initAuth()
})

async function handleLogin() {
  errorMessage.value = ''

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Please enter both username and password.'
    return
  }

  isLoading.value = true

  try {
    const res = await login(username.value, password.value)
    if (res.success) {
      toastSuccess('Vault Unlocked', 'Welcome to DBB Password Manager.')
      router.push('/dashboard')
    } else {
      errorMessage.value = res.error || 'Invalid username or password.'
    }
  } catch (err: any) {
    errorMessage.value = 'An unexpected error occurred during local authentication.'
  } finally {
    isLoading.value = false
  }
}

function fillDefaultCredentials() {
  username.value = 'dbadmin'
  password.value = 'ilovedbb'
  errorMessage.value = ''
}
</script>

<template>
  <div class="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-100 p-4 relative overflow-y-auto font-sans select-none">
    <!-- Subtle Background Elements -->
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
    <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

    <div class="relative z-10 w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <!-- App Brand Logo & Title -->
      <div class="text-center space-y-2">
        <div class="inline-flex p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl text-primary mb-2">
          <KeyRound class="w-8 h-8 text-indigo-400" />
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
          DBB Password Manager
        </h1>
        <p class="text-xs sm:text-sm text-zinc-400">
          Sign in to your local password vault
        </p>
      </div>

      <!-- Login Card -->
      <div class="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in shake duration-200"
        >
          <Lock class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Username Input -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-zinc-300 block">Username</label>
            <div class="relative">
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                required
                placeholder="dbadmin"
                class="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-800 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-zinc-300">Password</label>
              <button
                type="button"
                @click="showForgotHint = !showForgotHint"
                class="text-[11px] text-zinc-400 hover:text-indigo-400 transition"
              >
                Forgot password?
              </button>
            </div>

            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="•••••••••"
                class="w-full pl-3.5 pr-11 py-2.5 text-sm font-mono rounded-xl border border-zinc-800 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1 transition"
                title="Toggle password visibility"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Forgot Password Hint -->
          <div
            v-if="showForgotHint"
            class="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs text-zinc-300 space-y-1.5 animate-in fade-in"
          >
            <div class="flex items-center gap-1.5 font-semibold text-indigo-400">
              <Info class="w-3.5 h-3.5" />
              <span>Local Offline Vault</span>
            </div>
            <p class="text-[11px] text-zinc-400 leading-normal">
              This application is 100% offline. If using the default setup, credentials are
              <span class="font-mono text-zinc-200">dbadmin</span> / <span class="font-mono text-zinc-200">ilovedbb</span>.
            </p>
            <button
              type="button"
              @click="fillDefaultCredentials"
              class="text-[11px] text-indigo-400 font-semibold hover:underline"
            >
              Click to autofill default credentials
            </button>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition duration-150 disabled:opacity-50"
          >
            <Lock v-if="!isLoading" class="w-4 h-4" />
            <span v-if="isLoading">Verifying Local Credentials...</span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Quick Demo Autofill helper button -->
        <div class="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>Default: <strong class="text-zinc-300 font-mono">dbadmin</strong></span>
          <button
            type="button"
            @click="fillDefaultCredentials"
            class="text-indigo-400 hover:text-indigo-300 font-medium transition"
          >
            Autofill Default
          </button>
        </div>
      </div>

      <!-- Security Guarantee footer -->
      <div class="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <ShieldCheck class="w-4 h-4 text-emerald-500" />
        <span>PBKDF2-SHA256 Encrypted • Standalone Local Database</span>
      </div>
    </div>
  </div>
</template>
