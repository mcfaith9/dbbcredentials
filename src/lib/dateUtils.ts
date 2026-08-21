/**
 * Philippines-friendly & unambiguous date formatting utilities
 * Displays dates cleanly as e.g. "August 21, 2026" or "August 21, 2026, 3:45 PM"
 */

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) {
    // If it's already a simple text or custom format, return as is
    return String(dateInput)
  }

  // Format with full English month name (Philippines standard business format)
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return String(dateInput)

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function formatShortDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return String(dateInput)

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function toDateInputValue(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format phone number string into clean readable Philippine representation
 * e.g. "+63 917 123 4567" or "(02) 8123 4567"
 */
export function formatPhilippinePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const trimmed = phone.trim()
  if (!trimmed) return ''

  // If starts with +63 and then digits
  const cleanDigits = trimmed.replace(/[^\d+]/g, '')
  if (cleanDigits.startsWith('+63') && cleanDigits.length >= 12) {
    const main = cleanDigits.substring(3)
    if (main.length === 10) {
      return `+63 ${main.substring(0, 3)} ${main.substring(3, 6)} ${main.substring(6)}`
    }
  }
  return trimmed
}
