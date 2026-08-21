import { ref } from 'vue'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

const toasts = ref<ToastMessage[]>([])

export function useToast() {
  function show(toast: Omit<ToastMessage, 'id'>) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    const duration = toast.duration ?? 4000
    const newToast: ToastMessage = { ...toast, id }

    toasts.value.push(newToast)

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }

  function success(title: string, description?: string, duration = 3500) {
    return show({ title, description, type: 'success', duration })
  }

  function error(title: string, description?: string, duration = 5000) {
    return show({ title, description, type: 'error', duration })
  }

  function info(title: string, description?: string, duration = 3500) {
    return show({ title, description, type: 'info', duration })
  }

  function warning(title: string, description?: string, duration = 4000) {
    return show({ title, description, type: 'warning', duration })
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    warning,
    dismiss,
  }
}
