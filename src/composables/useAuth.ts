import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from '@/types'
import { LocalStorageService } from '@/services/storage'
import { verifyPassword } from '@/services/crypto'

const isUnlocked = ref(false)
const currentUser = ref<User | null>(null)
const lastActivityTime = ref(Date.now())
let autoLockInterval: ReturnType<typeof setInterval> | null = null
let activityListenersAttached = false

function updateActivity() {
  lastActivityTime.value = Date.now()
}

function attachActivityListeners() {
  if (activityListenersAttached || typeof window === 'undefined') return
  window.addEventListener('mousemove', updateActivity, { passive: true })
  window.addEventListener('keydown', updateActivity, { passive: true })
  window.addEventListener('click', updateActivity, { passive: true })
  window.addEventListener('scroll', updateActivity, { passive: true })
  activityListenersAttached = true
}

export function useAuth() {
  const router = useRouter()

  // Initialize database and load user
  async function initAuth() {
    const user = await LocalStorageService.initializeDatabase()
    currentUser.value = user

    // Check if session was already active in this tab session
    const sessionActive = sessionStorage.getItem('dbb_vault_unlocked') === 'true'
    if (sessionActive && user) {
      isUnlocked.value = true
    }

    attachActivityListeners()
    startAutoLockCheck()
  }

  function startAutoLockCheck() {
    if (autoLockInterval) clearInterval(autoLockInterval)
    autoLockInterval = setInterval(() => {
      if (!isUnlocked.value) return

      const settings = LocalStorageService.getSettings()
      const timeoutMinutes = settings.autoLockMinutes || 0

      if (timeoutMinutes > 0) {
        const elapsedMinutes = (Date.now() - lastActivityTime.value) / (1000 * 60)
        if (elapsedMinutes >= timeoutMinutes) {
          lock('Vault automatically locked due to inactivity.')
        }
      }
    }, 10000)
  }

  const isAuthenticated = computed(() => isUnlocked.value)
  const user = computed(() => currentUser.value)

  async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanUsername = username.trim()
    if (!cleanUsername || !password) {
      return { success: false, error: 'Please enter both username and password.' }
    }

    const dbUser = LocalStorageService.getUser()
    if (!dbUser) {
      // Re-init if missing
      await LocalStorageService.initializeDatabase()
      return login(username, password)
    }

    if (dbUser.username.toLowerCase() !== cleanUsername.toLowerCase()) {
      return { success: false, error: 'Invalid username or password.' }
    }

    const isValid = await verifyPassword(password, dbUser.password_hash, dbUser.salt)
    if (!isValid) {
      return { success: false, error: 'Invalid username or password.' }
    }

    isUnlocked.value = true
    currentUser.value = dbUser
    sessionStorage.setItem('dbb_vault_unlocked', 'true')
    lastActivityTime.value = Date.now()

    return { success: true }
  }

  function lock(_reason?: string) {
    isUnlocked.value = false
    sessionStorage.removeItem('dbb_vault_unlocked')
    if (router) {
      router.push('/login')
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const dbUser = LocalStorageService.getUser()
    if (!dbUser) return { success: false, error: 'No user record found.' }

    const isCurrentValid = await verifyPassword(currentPassword, dbUser.password_hash, dbUser.salt)
    if (!isCurrentValid) {
      return { success: false, error: 'Current password is incorrect.' }
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' }
    }

    const updatedUser = await LocalStorageService.updateUserPassword(newPassword)
    currentUser.value = updatedUser
    return { success: true }
  }

  return {
    isUnlocked,
    isAuthenticated,
    user,
    initAuth,
    login,
    lock,
    logout: lock,
    signup: async (_payload: any) => ({ success: true }),
    loginWithGithub: async () => ({ success: true }),
    changePassword,
  }
}
