import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHashHistory(),

  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      component: () => import('@/components/dashboard/IndexView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      component: () => import('@/components/auth/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/signup',
      component: () => import('@/components/auth/SignupView.vue'),
      meta: { guestOnly: true },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const { isAuthenticated } = useAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
  } else if (to.meta.guestOnly && isAuthenticated.value) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
