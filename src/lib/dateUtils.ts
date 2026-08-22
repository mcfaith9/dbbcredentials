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
 * Parses flexible date representations:
 * - Date instances
 * - Standard ISO strings "YYYY-MM-DD"
 * - Human English strings: "January 15, 2021", "Jan 15, 2021", "15 January 2021"
 * - Numeric delimiters: "01/15/2021", "2021/01/15", "15-01-2021"
 * - Excel serial numbers
 */
export function parseFlexibleDate(dateInput: string | Date | number | null | undefined): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput
  }

  // If numeric (e.g. timestamp or Excel serial)
  if (typeof dateInput === 'number' || (typeof dateInput === 'string' && /^\d+(\.\d+)?$/.test(dateInput.trim()))) {
    const num = Number(dateInput)
    if (num > 0 && num < 100000) {
      // Excel serial number (1 = Jan 1 1900, with Excel leap year quirk)
      const excelEpoch = new Date(1899, 11, 30)
      const dateFromExcel = new Date(excelEpoch.getTime() + num * 86400000)
      if (!isNaN(dateFromExcel.getTime())) return dateFromExcel
    } else if (num > 100000) {
      const dateFromTs = new Date(num)
      if (!isNaN(dateFromTs.getTime())) return dateFromTs
    }
  }

  const str = String(dateInput).trim()
  if (!str) return null

  // Try standard Date constructor
  const standardDate = new Date(str)
  if (!isNaN(standardDate.getTime()) && standardDate.getFullYear() > 1900 && standardDate.getFullYear() < 2100) {
    return standardDate
  }

  // Match text months e.g. "January 15, 2021" or "15 Jan 2021"
  const monthMap: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  }

  const textMatch = str.match(/^([a-zA-Z]+)[,\s]+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{2,4})$/)
  if (textMatch) {
    const m = monthMap[textMatch[1].toLowerCase()]
    const d = parseInt(textMatch[2], 10)
    let y = parseInt(textMatch[3], 10)
    if (y < 100) y = y >= 30 ? 1900 + y : 2000 + y
    if (m !== undefined && d >= 1 && d <= 31) {
      return new Date(y, m, d)
    }
  }

  const textMatch2 = str.match(/^(\d{1,2})(?:st|nd|rd|th)?[,\s\-/]+([a-zA-Z]+)[,\s\-/]+(\d{2,4})$/)
  if (textMatch2) {
    const d = parseInt(textMatch2[1], 10)
    const m = monthMap[textMatch2[2].toLowerCase()]
    let y = parseInt(textMatch2[3], 10)
    if (y < 100) y = y >= 30 ? 1900 + y : 2000 + y
    if (m !== undefined && d >= 1 && d <= 31) {
      return new Date(y, m, d)
    }
  }

  // Match numeric parts e.g. "YYYY-MM-DD" or "MM/DD/YYYY"
  const numMatch = str.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/)
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10)
    const p2 = parseInt(numMatch[2], 10)
    const p3 = parseInt(numMatch[3], 10)

    if (p1 > 1000) {
      // YYYY-MM-DD
      return new Date(p1, p2 - 1, p3)
    } else if (p3 > 1000 || p3 >= 30) {
      let y = p3 < 100 ? (p3 >= 30 ? 1900 + p3 : 2000 + p3) : p3
      // Disambiguate MM/DD vs DD/MM
      let m = p1 - 1
      let d = p2
      if (p1 > 12 && p2 <= 12) {
        d = p1
        m = p2 - 1
      }
      return new Date(y, m, d)
    }
  }

  return null
}

export interface TenureBreakdown {
  years: number
  months: number
  days: number
  formatted: string
  shortFormatted: string
  totalDays: number
  isEnded: boolean
  startFormatted: string
  endFormatted: string
}

/**
 * Calculates tenure accurately considering calendar months and leap years.
 * If employee has an end date and is inactive/resigned/terminated, calculates duration between start and end.
 * Otherwise calculates duration between start and current date.
 */
export function calculateTenure(
  startDateInput?: string | Date | number | null,
  endDateInput?: string | Date | number | null,
  status?: string,
  referenceDate: Date = new Date()
): TenureBreakdown | null {
  const startDate = parseFlexibleDate(startDateInput)
  if (!startDate) return null

  // Determine endpoint date
  let endDate = referenceDate
  let isEnded = false

  const statusClean = (status || '').toLowerCase().trim()
  const isInactiveStatus = ['inactive', 'resigned', 'terminated', 'ended', 'retired', 'separated'].includes(statusClean)

  if (endDateInput) {
    const parsedEnd = parseFlexibleDate(endDateInput)
    if (parsedEnd) {
      if (isInactiveStatus || parsedEnd.getTime() <= referenceDate.getTime()) {
        endDate = parsedEnd
        isEnded = true
      }
    }
  } else if (isInactiveStatus) {
    isEnded = true
  }

  const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  if (e.getTime() < s.getTime()) {
    return {
      years: 0,
      months: 0,
      days: 0,
      formatted: '0 days',
      shortFormatted: '0d',
      totalDays: 0,
      isEnded,
      startFormatted: formatDate(s),
      endFormatted: formatDate(e),
    }
  }

  let years = e.getFullYear() - s.getFullYear()
  let months = e.getMonth() - s.getMonth()
  let days = e.getDate() - s.getDate()

  if (days < 0) {
    // Borrow days from previous month of endpoint date
    const prevMonthLastDay = new Date(e.getFullYear(), e.getMonth(), 0).getDate()
    days += prevMonthLastDay
    months -= 1
  }

  if (months < 0) {
    months += 12
    years -= 1
  }

  // Construct human-readable string: e.g. "5 years, 7 months, 7 days"
  const parts: string[] = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`)
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)

  const formatted = parts.join(', ')

  // Construct short string: e.g. "5y 7m" or "5y 7m 7d"
  const shortParts: string[] = []
  if (years > 0) shortParts.push(`${years}y`)
  if (months > 0) shortParts.push(`${months}m`)
  if (days > 0 && years === 0) shortParts.push(`${days}d`)
  const shortFormatted = shortParts.length > 0 ? shortParts.join(' ') : '0d'

  const diffMs = Math.abs(e.getTime() - s.getTime())
  const totalDays = Math.round(diffMs / 86400000)

  return {
    years,
    months,
    days,
    formatted,
    shortFormatted,
    totalDays,
    isEnded,
    startFormatted: formatDate(s),
    endFormatted: isEnded ? formatDate(e) : 'Present',
  }
}

/**
 * Returns a clean tenure display string for UI tables, detail views, and exports.
 */
export function getEmployeeTenureDisplay(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  status?: string,
  compact = false
): string {
  const result = calculateTenure(startDate, endDate, status)
  if (!result) return 'N/A'
  return compact ? result.shortFormatted : result.formatted
}

/**
 * Format phone number string into clean readable Philippine representation
 * e.g. "+63 917 123 4567" or "0917 123 4567"
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

  // If starts with 09... and 11 digits
  const digitsOnly = trimmed.replace(/\D/g, '')
  if (digitsOnly.length === 11 && digitsOnly.startsWith('09')) {
    return `${digitsOnly.substring(0, 4)} ${digitsOnly.substring(4, 7)} ${digitsOnly.substring(7)}`
  }

  return trimmed
}
