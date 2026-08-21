import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

const DEFAULT_USERS = [
  {
    id: '1',
    name: 'shadcn',
    email: 'm@example.com',
    password: 'password123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
]

// Persistent state across components
const storedUser = localStorage.getItem('dbb_user')
const currentUser = ref<User | null>(storedUser ? JSON.parse(storedUser) : null)

const storedUsers = localStorage.getItem('dbb_registered_users')
const registeredUsers = ref<Array<User & { password?: string }>>(
  storedUsers ? JSON.parse(storedUsers) : DEFAULT_USERS
)

function saveUsers() {
  localStorage.setItem('dbb_registered_users', JSON.stringify(registeredUsers.value))
}

function saveCurrentUser(user: User | null) {
  currentUser.value = user
  if (user) {
    localStorage.setItem('dbb_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('dbb_user')
  }
}

export function useAuth() {
  const router = useRouter()

  const isAuthenticated = computed(() => !!currentUser.value)

  const user = computed(() => currentUser.value)

  function login(email: string, password: string): { success: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase()
    
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' }
    }
    if (!password) {
      return { success: false, error: 'Password is required.' }
    }

    const foundUser = registeredUsers.value.find(
      (u) => u.email.toLowerCase() === cleanEmail
    )

    if (!foundUser) {
      return { success: false, error: 'No account found with this email.' }
    }

    if (foundUser.password && foundUser.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' }
    }

    const authUser: User = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      avatar: foundUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(foundUser.name)}`,
    }

    saveCurrentUser(authUser)
    return { success: true }
  }

  function signup(
    name: string,
    email: string,
    password: string,
    confirmPassword?: string
  ): { success: boolean; error?: string } {
    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanName) {
      return { success: false, error: 'Full name is required.' }
    }
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' }
    }
    if (!password) {
      return { success: false, error: 'Password is required.' }
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' }
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match.' }
    }

    const existingUser = registeredUsers.value.find(
      (u) => u.email.toLowerCase() === cleanEmail
    )

    if (existingUser) {
      return { success: false, error: 'An account with this email already exists.' }
    }

    const newUser = {
      id: String(Date.now()),
      name: cleanName,
      email: cleanEmail,
      password: password,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
    }

    registeredUsers.value.push(newUser)
    saveUsers()

    const authUser: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
    }

    saveCurrentUser(authUser)
    return { success: true }
  }

  function loginWithGithub(): { success: boolean } {
    const githubUser: User = {
      id: 'github_user',
      name: 'GitHub Developer',
      email: 'dev@github.com',
      avatar: 'https://avatars.githubusercontent.com/u/9919?v=4',
    }

    saveCurrentUser(githubUser)
    return { success: true }
  }

  function logout() {
    saveCurrentUser(null)
    if (router) {
      router.push('/login')
    }
  }

  return {
    currentUser,
    user,
    isAuthenticated,
    login,
    signup,
    loginWithGithub,
    logout,
  }
}
