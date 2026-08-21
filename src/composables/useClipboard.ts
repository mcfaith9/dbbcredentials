import { ref } from 'vue'
import { useToast } from './useToast'
import { LocalStorageService } from '@/services/storage'

let clearTimer: ReturnType<typeof setTimeout> | null = null
const lastCopiedValue = ref<string | null>(null)

export function useClipboard() {
  const { success, info } = useToast()

  async function copyToClipboard(value: string, label = 'Copied to clipboard', sensitive = true): Promise<boolean> {
    if (!value) return false

    try {
      await navigator.clipboard.writeText(value)
      lastCopiedValue.value = value

      const settings = LocalStorageService.getSettings()
      const clearSeconds = settings.clipboardClearSeconds || 30

      if (sensitive && clearSeconds > 0) {
        if (clearTimer) {
          clearTimeout(clearTimer)
        }

        success(label, `Auto-clearing in ${clearSeconds} seconds for your security.`)

        clearTimer = setTimeout(async () => {
          try {
            const currentClip = await navigator.clipboard.readText().catch(() => '')
            if (currentClip === lastCopiedValue.value) {
              await navigator.clipboard.writeText('')
              info('Clipboard Cleared', 'Sensitive credentials were cleared from clipboard.')
            }
          } catch {
            // Silently ignore if readText permissions aren't granted
          }
          lastCopiedValue.value = null
          clearTimer = null
        }, clearSeconds * 1000)
      } else {
        success(label)
      }

      return true
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      return false
    }
  }

  return {
    copyToClipboard,
    lastCopiedValue,
  }
}
