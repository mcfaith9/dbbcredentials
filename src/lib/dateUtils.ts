/**
 * Philippines-friendly & unambiguous date formatting utilities
 * Displays dates cleanly as e.g. "August 21, 2026" or "August 21, 2026, 3:45 PM"
 */

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

function normalizeYear(rawYear: number): number {
  if (rawYear >= 1000) return rawYear
  // 2-digit year interpretation: e.g. 25 -> 2025, 95 -> 1995
  return rawYear >= 50 ? 1900 + rawYear : 2000 + rawYear
}

/**
 * Parses flexible date representations safely without altering original data:
 * - Date instances
 * - Human English strings: "February 16,2026", "February 16, 2026", "January 15, 2021", "Jan 15, 2021"
 * - Hyphenated & abbreviated: "23-Sep-25", "23-Sep-2025", "23-sep-25"
 * - Standard ISO strings: "2025-09-23"
 * - Numeric delimiters: "09/23/2025", "23/09/2025", "2025/09/23", "09-23-2025"
 * - Excel serial numbers & epoch timestamps
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
      if (!isNaN(dateFromExcel.getTime()) && dateFromExcel.getFullYear() >= 1900 && dateFromExcel.getFullYear() <= 2100) {
        return dateFromExcel
      }
    } else if (num > 100000) {
      const dateFromTs = new Date(num)
      if (!isNaN(dateFromTs.getTime()) && dateFromTs.getFullYear() >= 1900 && dateFromTs.getFullYear() <= 2100) {
        return dateFromTs
      }
    }
  }

  let str = String(dateInput).trim()
  if (!str) return null

  // Pre-normalize common punctuation anomalies:
  // e.g. "February 16,2026" -> insert space after comma
  str = str.replace(/,/g, ', ').replace(/\s+/g, ' ').trim()

  // 1. Text Month representations: [Month] [Day], [Year] (e.g., "February 16, 2026", "Feb 16 2026")
  const monthDayYearMatch = str.match(/^([a-zA-Z]+)[,\s]+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{2,4})$/)
  if (monthDayYearMatch) {
    const mStr = monthDayYearMatch[1].toLowerCase().replace(/\./g, '')
    const m = MONTH_MAP[mStr]
    const d = parseInt(monthDayYearMatch[2], 10)
    const y = normalizeYear(parseInt(monthDayYearMatch[3], 10))
    if (m !== undefined && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const parsed = new Date(y, m, d)
      if (parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === d) {
        return parsed
      }
    }
  }

  // 2. Day-Month-Year with text month (e.g., "23-Sep-25", "23-Sep-2025", "23 Sep 2025", "23/Sep/2025")
  const dayMonthYearMatch = str.match(/^(\d{1,2})(?:st|nd|rd|th)?[,\s\-/]+([a-zA-Z]+)[,\s\-/]+(\d{2,4})$/)
  if (dayMonthYearMatch) {
    const d = parseInt(dayMonthYearMatch[1], 10)
    const mStr = dayMonthYearMatch[2].toLowerCase().replace(/\./g, '')
    const m = MONTH_MAP[mStr]
    const y = normalizeYear(parseInt(dayMonthYearMatch[3], 10))
    if (m !== undefined && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const parsed = new Date(y, m, d)
      if (parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === d) {
        return parsed
      }
    }
  }

  // 3. Year-Month-Day with text month (e.g., "2025-Sep-23", "2025 September 23")
  const yearMonthDayMatch = str.match(/^(\d{4})[,\s\-/]+([a-zA-Z]+)[,\s\-/]+(\d{1,2})(?:st|nd|rd|th)?$/)
  if (yearMonthDayMatch) {
    const y = parseInt(yearMonthDayMatch[1], 10)
    const mStr = yearMonthDayMatch[2].toLowerCase().replace(/\./g, '')
    const m = MONTH_MAP[mStr]
    const d = parseInt(yearMonthDayMatch[3], 10)
    if (m !== undefined && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      const parsed = new Date(y, m, d)
      if (parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === d) {
        return parsed
      }
    }
  }

  // 4. Numeric formats: "YYYY-MM-DD", "YYYY/MM/DD", "MM/DD/YYYY", "DD/MM/YYYY", "DD-MM-YY"
  const numericMatch = str.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/)
  if (numericMatch) {
    const p1 = parseInt(numericMatch[1], 10)
    const p2 = parseInt(numericMatch[2], 10)
    const p3 = parseInt(numericMatch[3], 10)

    if (p1 >= 1000) {
      // YYYY-MM-DD
      const y = p1
      const m = p2 - 1
      const d = p3
      if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        const parsed = new Date(y, m, d)
        if (parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === d) {
          return parsed
        }
      }
    } else {
      // Either MM/DD/YYYY or DD/MM/YYYY or MM/DD/YY
      const y = normalizeYear(p3)
      let m = p1 - 1
      let d = p2

      // If p1 > 12 and p2 <= 12, then p1 is day and p2 is month (DD/MM/YYYY)
      if (p1 > 12 && p2 <= 12) {
        d = p1
        m = p2 - 1
      }

      if (m >= 0 && m <= 11 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
        const parsed = new Date(y, m, d)
        if (parsed.getFullYear() === y && parsed.getMonth() === m && parsed.getDate() === d) {
          return parsed
        }
      }
    }
  }

  // 5. Fallback to standard JavaScript Date parser
  const fallback = new Date(str)
  if (!isNaN(fallback.getTime())) {
    const y = fallback.getFullYear()
    if (y >= 1900 && y <= 2100) {
      return fallback
    }
  }

  return null
}

export function formatDate(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '—'
  const parsed = parseFlexibleDate(dateInput)
  if (!parsed) {
    return typeof dateInput === 'string' && dateInput.trim() ? dateInput.trim() : '—'
  }

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed)
}

export function formatDateTime(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '—'
  const parsed = parseFlexibleDate(dateInput)
  if (!parsed) return String(dateInput)

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed)
}

export function formatShortDate(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return '—'
  const parsed = parseFlexibleDate(dateInput)
  if (!parsed) {
    return typeof dateInput === 'string' && dateInput.trim() ? dateInput.trim() : '—'
  }

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export function toDateInputValue(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return ''
  const parsed = parseFlexibleDate(dateInput)
  if (!parsed) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
 * Safely returns null if start date is invalid, empty, or in the future.
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

  // If start date is in the future relative to reference/end date, return null (shows "—")
  if (s.getTime() > e.getTime()) {
    return null
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

  // Construct human-readable string with proper singular/plural grammar
  // Examples: "5 years, 2 months", "1 year, 8 months, 12 days", "7 months, 4 days", "18 days", "0 days"
  const parts: string[] = []
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'month' : 'months'}`)
  }
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  }
  if (parts.length === 0) {
    parts.push('0 days')
  }

  const formatted = parts.join(', ')

  // Construct short string: e.g. "5y 2m", "1y 8m", "7m 4d", "18d", "0d"
  const shortParts: string[] = []
  if (years > 0) shortParts.push(`${years}y`)
  if (months > 0) shortParts.push(`${months}m`)
  if (days > 0 && (years === 0 || shortParts.length < 2)) shortParts.push(`${days}d`)
  if (shortParts.length === 0) shortParts.push('0d')
  const shortFormatted = shortParts.join(' ')

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
 * Safely returns "—" if start date is missing, unparseable, or in the future.
 */
export function getEmployeeTenureDisplay(
  startDate?: string | Date | number | null,
  endDate?: string | Date | number | null,
  status?: string,
  compact = false
): string {
  const result = calculateTenure(startDate, endDate, status)
  if (!result) return '—'
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
