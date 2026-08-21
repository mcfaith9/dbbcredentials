import * as XLSX from 'xlsx'
import type { VaultItem } from '@/types'
import type {
  EmployeeRecord,
  AnalyzedImportRow,
  MatchReason,
  ImportExecutionReport,
} from '@/types/employee'
import { deriveItemName } from './storage'

// Canonical Employee Field Names
export const EMPLOYEE_FIELDS = [
  { key: 'name', label: "Employee's Name", required: true },
  { key: 'department', label: 'Department', required: false },
  { key: 'position', label: 'Position', required: false },
  { key: 'contract', label: 'Contract', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'sss_no', label: 'SSS No.', required: false },
  { key: 'hdmf_no', label: 'HDMF No.', required: false },
  { key: 'phic_no', label: 'PHIC No.', required: false },
  { key: 'tin_no', label: 'TIN No.', required: false },
  { key: 'birthdate', label: 'Birthdate', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'dmbb_id', label: 'DMBB ID No.', required: false },
  { key: 'contact_no', label: 'Contact No.', required: false },
  { key: 'emergency_contact', label: 'In Case of Emergency', required: false },
  { key: 'work_email', label: 'Work Email', required: false },
] as const

// Header aliases dictionary for fuzzy column mapping
const HEADER_MAPPINGS: Record<keyof EmployeeRecord, string[]> = {
  name: [
    "employee's name",
    'employees name',
    'employee name',
    'employeename',
    'employee',
    'full name',
    'fullname',
    'name',
    'staff name',
    'pangalan',
    'pangalan ng empleyado',
  ],
  department: ['department', 'dept', 'division', 'unit', 'assigned department', 'department / division'],
  position: ['position', 'job title', 'job_title', 'title', 'role', 'designation', 'occupation', 'pos'],
  contract: [
    'contract',
    'contract type',
    'employment type',
    'type',
    'status of employment',
    'employment_type',
    'tenure',
  ],
  status: ['status', 'employment status', 'active status', 'employee status', 'state'],
  sss_no: ['sss no.', 'sss no', 'sss number', 'sss #', 'sss', 'sss_no', 'sss_number', 'social security system'],
  hdmf_no: [
    'hdmf no.',
    'hdmf no',
    'hdmf number',
    'pag-ibig no.',
    'pag-ibig no',
    'pag-ibig number',
    'pagibig no.',
    'pagibig no',
    'pagibig number',
    'pagibig',
    'pag-ibig',
    'hdmf',
    'hdmf/pag-ibig',
    'hdmf_no',
    'hdmf / pag-ibig no.',
  ],
  phic_no: [
    'phic no.',
    'phic no',
    'phic number',
    'philhealth no.',
    'philhealth no',
    'philhealth number',
    'philhealth',
    'phic',
    'phic_no',
    'philhealth_no',
  ],
  tin_no: ['tin no.', 'tin no', 'tin number', 'tin #', 'tin', 'tin_no', 'tax identification number'],
  birthdate: [
    'birthdate',
    'birth date',
    'date of birth',
    'dob',
    'bday',
    'birth_date',
    'birthday',
    'petsa ng kapanganakan',
  ],
  address: ['address', 'home address', 'office address', 'residential address', 'current address', 'tirahan'],
  dmbb_id: [
    'dmbb id no.',
    'dmbb id no',
    'dmbb id number',
    'dmbb id',
    'dmbb id #',
    'employee id',
    'employee id no.',
    'emp id',
    'id no.',
    'id number',
    'badge id',
    'dmbb_id',
    'employee_id',
    'company id',
  ],
  contact_no: [
    'contact no.',
    'contact no',
    'contact number',
    'contact #',
    'phone',
    'phone no.',
    'phone number',
    'mobile',
    'mobile no.',
    'mobile number',
    'cellular',
    'contact_no',
    'work phone',
    'cellphone',
  ],
  emergency_contact: [
    'in case of emergency',
    'in case of emergency (ice)',
    'ice',
    'emergency contact',
    'emergency contact person',
    'emergency no.',
    'emergency number',
    'emergency_contact',
    'in case of emergency contact',
  ],
  work_email: ['work email', 'email', 'email address', 'e-mail', 'work_email', 'company email'],
}

// -------------------------------------------------------------
// Normalization Utilities for Strict & Fuzzy Duplicate Detection
// -------------------------------------------------------------

export function cleanText(val: any): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

/**
 * Normalizes alphanumeric identifiers (e.g. SSS, TIN, HDMF, PHIC, DMBB ID)
 * "06-1802091-9" -> "0618020919"
 * "2022-00130"   -> "202200130"
 */
export function normalizeAlphanumeric(val: string | null | undefined): string {
  if (!val) return ''
  return val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim()
}

/**
 * Normalizes phone numbers (e.g. 0917-123-4567, +63 917 123 4567 -> 9171234567)
 */
export function normalizePhone(val: string | null | undefined): string {
  if (!val) return ''
  const digits = val.replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length >= 12) {
    return digits.substring(2)
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.substring(1)
  }
  return digits
}

/**
 * Normalizes person names for robust comparison without mutating stored data
 * "Abalo, Oliver Bacsinila" -> "abalo oliver bacsinila"
 * "Abalo, Oliver B." -> "abalo oliver b"
 */
export function normalizeName(val: string | null | undefined): string {
  if (!val) return ''
  return val
    .toLowerCase()
    .replace(/[,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Levenshtein distance for fuzzy name matching
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length
  const d: number[][] = []

  for (let i = 0; i <= m; i++) d[i] = [i]
  for (let j = 0; j <= n; j++) d[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    }
  }

  return d[m][n]
}

/**
 * Computes similarity ratio (0 to 1) between two names
 */
export function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)
  if (!n1 || !n2) return 0
  if (n1 === n2) return 1

  // Token matching (e.g. "Abalo Oliver Bacsinila" vs "Oliver B. Abalo")
  const tokens1 = n1.split(' ').filter(Boolean)
  const tokens2 = n2.split(' ').filter(Boolean)

  if (tokens1.length > 0 && tokens2.length > 0) {
    // Check if last name and first name match
    const lastName1 = tokens1[0] // or tokens1[tokens1.length-1]
    const firstName1 = tokens1[1] || ''

    const hasLastName = tokens2.some((t) => t === lastName1 || levenshteinDistance(t, lastName1) <= 1)
    const hasFirstName = tokens2.some(
      (t) => t === firstName1 || (firstName1.length > 0 && t.startsWith(firstName1.charAt(0)))
    )

    if (hasLastName && hasFirstName) {
      return 0.85
    }
  }

  const maxLen = Math.max(n1.length, n2.length)
  if (maxLen === 0) return 1
  const dist = levenshteinDistance(n1, n2)
  return Math.max(0, 1 - dist / maxLen)
}

/**
 * Parses flexible dates (Excel numeric serial, "June 19, 1976", "1976-06-19", "06/19/1976", etc.)
 * Returns a standardized human-readable string and a comparison key YYYY-MM-DD
 */
export function parseEmployeeDate(val: any): { display: string; normalizedKey: string; isValid: boolean } {
  if (val === null || val === undefined || val === '') {
    return { display: '', normalizedKey: '', isValid: true }
  }

  // Handle Excel Serial Number (e.g. 27929 for June 19, 1976)
  if (typeof val === 'number' && val > 1000) {
    try {
      const date = XLSX.SSF.parse_date_code(val)
      if (date) {
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ]
        const m = String(date.m).padStart(2, '0')
        const d = String(date.d).padStart(2, '0')
        const y = String(date.y)
        const monthName = monthNames[date.m - 1] || m
        return {
          display: `${monthName} ${date.d}, ${y}`,
          normalizedKey: `${y}-${m}-${d}`,
          isValid: true,
        }
      }
    } catch {
      // fallback to string parsing
    }
  }

  const str = String(val).trim()
  if (!str) return { display: '', normalizedKey: '', isValid: true }

  // Try parsing Date
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return {
      display: str,
      normalizedKey: `${y}-${m}-${d}`,
      isValid: true,
    }
  }

  // String check for common Philippine dates like "June 19, 1976"
  const monthMatch = str.match(
    /(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+(\d{1,2})[,\s]+(\d{4})/i
  )
  if (monthMatch) {
    return {
      display: str,
      normalizedKey: str.toLowerCase().replace(/[^a-z0-9]/g, ''),
      isValid: true,
    }
  }

  return { display: str, normalizedKey: str.toLowerCase().replace(/[^a-z0-9]/g, ''), isValid: true }
}

// -------------------------------------------------------------
// Column Mapping Detection
// -------------------------------------------------------------

export function mapRawHeadersToEmployeeFields(rawHeaders: string[]): Record<string, keyof EmployeeRecord | null> {
  const mapping: Record<string, keyof EmployeeRecord | null> = {}

  rawHeaders.forEach((header) => {
    const clean = header.trim().toLowerCase()
    let matchedField: keyof EmployeeRecord | null = null

    for (const [field, aliases] of Object.entries(HEADER_MAPPINGS) as [keyof EmployeeRecord, string[]][]) {
      if (aliases.includes(clean)) {
        matchedField = field
        break
      }
    }

    // Secondary fuzzy contains match if not exact
    if (!matchedField) {
      for (const [field, aliases] of Object.entries(HEADER_MAPPINGS) as [keyof EmployeeRecord, string[]][]) {
        if (aliases.some((alias) => clean === alias || clean.includes(alias))) {
          matchedField = field
          break
        }
      }
    }

    mapping[header] = matchedField
  })

  return mapping
}

// -------------------------------------------------------------
// Intelligent Duplicate & Redundancy Detection
// -------------------------------------------------------------

export function analyzeImportRecord(
  rawRecord: Record<string, any>,
  rowNumber: number,
  existingItems: VaultItem[],
  alreadyAnalyzedBatch: AnalyzedImportRow[]
): AnalyzedImportRow {
  // Extract and map data
  const data: EmployeeRecord = {
    name: cleanText(rawRecord.name || rawRecord.full_name || rawRecord["EMPLOYEE'S NAME"] || rawRecord['Employee Name']),
    department: cleanText(rawRecord.department || rawRecord.Department),
    position: cleanText(rawRecord.position || rawRecord.POSITION || rawRecord['Job Title']),
    contract: cleanText(rawRecord.contract || rawRecord.CONTRACT || 'Regular'),
    status: cleanText(rawRecord.status || rawRecord.STATUS || 'Active'),
    sss_no: cleanText(rawRecord.sss_no || rawRecord['SSS NO.'] || rawRecord['SSS No.'] || rawRecord.sss),
    hdmf_no: cleanText(
      rawRecord.hdmf_no ||
        rawRecord['HDMF NO.'] ||
        rawRecord['HDMF No.'] ||
        rawRecord['PAG-IBIG NO.'] ||
        rawRecord.pagibig_no
    ),
    phic_no: cleanText(
      rawRecord.phic_no ||
        rawRecord['PHIC NO.'] ||
        rawRecord['PHIC No.'] ||
        rawRecord['PHILHEALTH NO.'] ||
        rawRecord.philhealth_no
    ),
    tin_no: cleanText(rawRecord.tin_no || rawRecord['TIN NO.'] || rawRecord['TIN No.'] || rawRecord.tin),
    birthdate: cleanText(rawRecord.birthdate || rawRecord.BIRTHDATE || rawRecord['Birth Date']),
    address: cleanText(rawRecord.address || rawRecord.ADDRESS || rawRecord['Home Address']),
    dmbb_id: cleanText(
      rawRecord.dmbb_id ||
        rawRecord['DMBB ID NO.'] ||
        rawRecord['DMBB ID No.'] ||
        rawRecord['Employee ID'] ||
        rawRecord.employee_id
    ),
    contact_no: cleanText(
      rawRecord.contact_no ||
        rawRecord['CONTACT NO.'] ||
        rawRecord['Contact No.'] ||
        rawRecord.phone ||
        rawRecord.work_phone
    ),
    emergency_contact: cleanText(
      rawRecord.emergency_contact ||
        rawRecord['IN CASE OF EMERGENCY'] ||
        rawRecord['In Case of Emergency'] ||
        rawRecord.ice
    ),
    work_email: cleanText(rawRecord.work_email || rawRecord.email || rawRecord['Work Email']),
  }

  // Missing info & Format validation checks
  const missingInfoReasons: string[] = []
  const formatWarnings: string[] = []

  if (!data.name) {
    missingInfoReasons.push("Employee's Name is missing")
  }
  if (!data.dmbb_id && !data.sss_no && !data.tin_no && !data.hdmf_no && !data.phic_no) {
    missingInfoReasons.push('No government ID or DMBB ID provided')
  }

  const dateCheck = parseEmployeeDate(data.birthdate)
  if (data.birthdate && !dateCheck.isValid) {
    formatWarnings.push(`Birthdate "${data.birthdate}" could not be safely verified`)
  }

  // Normalized values for comparison
  const normDmbb = normalizeAlphanumeric(data.dmbb_id)
  const normSss = normalizeAlphanumeric(data.sss_no)
  const normHdmf = normalizeAlphanumeric(data.hdmf_no)
  const normPhic = normalizeAlphanumeric(data.phic_no)
  const normTin = normalizeAlphanumeric(data.tin_no)
  const normContact = normalizePhone(data.contact_no)
  const normBirthdate = dateCheck.normalizedKey

  // Check against existing employees (vault items of type === 'identity')
  const employeeItems = existingItems.filter((i) => i.type === 'identity' && !i.is_trash)

  let bestMatch: VaultItem | null = null
  let matchReasons: MatchReason[] = []
  let confidence: 'exact' | 'possible' | 'none' = 'none'

  for (const existing of employeeItems) {
    const existingDmbb = normalizeAlphanumeric(existing.dmbb_id || existing.employee_id)
    const existingSss = normalizeAlphanumeric(existing.sss_no)
    const existingHdmf = normalizeAlphanumeric(existing.hdmf_no || existing.pagibig_no)
    const existingPhic = normalizeAlphanumeric(existing.phic_no || existing.philhealth_no)
    const existingTin = normalizeAlphanumeric(existing.tin_no)
    const existingContact = normalizePhone(existing.contact_no || existing.work_phone || existing.phone)
    const existingBirthdate = parseEmployeeDate(existing.birthdate).normalizedKey

    const reasons: MatchReason[] = []

    // Strong Identifiers Matching (High Confidence / Exact)
    if (normDmbb && existingDmbb && normDmbb === existingDmbb) {
      reasons.push({
        field: 'dmbb_id',
        label: 'Same DMBB ID No.',
        description: `Matched DMBB ID: ${data.dmbb_id}`,
        matchedValue: data.dmbb_id,
        existingValue: existing.dmbb_id || existing.employee_id || '',
      })
    }
    if (normSss && existingSss && normSss === existingSss) {
      reasons.push({
        field: 'sss_no',
        label: 'Same SSS No.',
        description: `Matched SSS: ${data.sss_no}`,
        matchedValue: data.sss_no,
        existingValue: existing.sss_no || '',
      })
    }
    if (normHdmf && existingHdmf && normHdmf === existingHdmf) {
      reasons.push({
        field: 'hdmf_no',
        label: 'Same HDMF / Pag-IBIG No.',
        description: `Matched HDMF: ${data.hdmf_no}`,
        matchedValue: data.hdmf_no,
        existingValue: existing.hdmf_no || existing.pagibig_no || '',
      })
    }
    if (normPhic && existingPhic && normPhic === existingPhic) {
      reasons.push({
        field: 'phic_no',
        label: 'Same PHIC / PhilHealth No.',
        description: `Matched PHIC: ${data.phic_no}`,
        matchedValue: data.phic_no,
        existingValue: existing.phic_no || existing.philhealth_no || '',
      })
    }
    if (normTin && existingTin && normTin === existingTin) {
      reasons.push({
        field: 'tin_no',
        label: 'Same TIN No.',
        description: `Matched TIN: ${data.tin_no}`,
        matchedValue: data.tin_no,
        existingValue: existing.tin_no || '',
      })
    }

    // Name similarity test
    const existingName = existing.full_name || existing.name || ''
    const similarity = calculateNameSimilarity(data.name, existingName)
    const exactNameMatch = normalizeName(data.name) === normalizeName(existingName)

    if (exactNameMatch) {
      reasons.push({
        field: 'name',
        label: 'Identical Employee Name',
        description: `Identical Name: ${data.name}`,
        matchedValue: data.name,
        existingValue: existingName,
      })
    } else if (similarity >= 0.75) {
      reasons.push({
        field: 'name',
        label: `Similar Employee Name (${Math.round(similarity * 100)}% match)`,
        description: `Similar Name to ${existingName}`,
        matchedValue: data.name,
        existingValue: existingName,
      })
    }

    // Birthdate match
    if (normBirthdate && existingBirthdate && normBirthdate === existingBirthdate) {
      reasons.push({
        field: 'birthdate',
        label: 'Same Birthdate',
        description: `Same Birthdate: ${data.birthdate}`,
        matchedValue: data.birthdate,
        existingValue: existing.birthdate || '',
      })
    }

    // Contact number match
    if (normContact && existingContact && normContact === existingContact) {
      reasons.push({
        field: 'contact_no',
        label: 'Same Contact Number',
        description: `Same Contact: ${data.contact_no}`,
        matchedValue: data.contact_no,
        existingValue: existing.contact_no || existing.work_phone || existing.phone || '',
      })
    }

    // Determine confidence level
    const hasStrongGovOrIdMatch = reasons.some((r) =>
      ['dmbb_id', 'sss_no', 'hdmf_no', 'phic_no', 'tin_no'].includes(r.field)
    )

    if (hasStrongGovOrIdMatch || (exactNameMatch && normBirthdate && existingBirthdate && normBirthdate === existingBirthdate)) {
      confidence = 'exact'
      bestMatch = existing
      matchReasons = reasons
      break
    } else if (reasons.length >= 2 || (exactNameMatch && data.name.trim().length > 0)) {
      confidence = 'possible'
      bestMatch = existing
      matchReasons = reasons
    }
  }

  // Also check if it duplicates an item already in the SAME import batch
  if (confidence === 'none') {
    for (const prev of alreadyAnalyzedBatch) {
      const prevDmbb = normalizeAlphanumeric(prev.data.dmbb_id)
      const prevSss = normalizeAlphanumeric(prev.data.sss_no)
      const prevTin = normalizeAlphanumeric(prev.data.tin_no)

      if (
        (normDmbb && prevDmbb && normDmbb === prevDmbb) ||
        (normSss && prevSss && normSss === prevSss) ||
        (normTin && prevTin && normTin === prevTin)
      ) {
        confidence = 'exact'
        matchReasons = [
          {
            field: 'batch',
            label: `Duplicate of Row #${prev.rowNumber} in this file`,
            description: `Duplicate of Row #${prev.rowNumber} (${prev.data.name})`,
            matchedValue: data.name,
            existingValue: prev.data.name,
          },
        ]
        break
      }
    }
  }

  // Calculate conflict fields if matched with existing item
  const conflictFields: AnalyzedImportRow['conflictFields'] = []
  if (bestMatch) {
    const fieldsToCompare: (keyof EmployeeRecord)[] = [
      'name',
      'department',
      'position',
      'contract',
      'status',
      'sss_no',
      'hdmf_no',
      'phic_no',
      'tin_no',
      'birthdate',
      'address',
      'dmbb_id',
      'contact_no',
      'emergency_contact',
      'work_email',
    ]

    for (const f of fieldsToCompare) {
      const importedVal = cleanText(data[f])
      const existingVal = cleanText(
        (bestMatch as any)[f] ||
          (f === 'name' ? bestMatch.full_name || bestMatch.name : '') ||
          (f === 'dmbb_id' ? bestMatch.employee_id : '') ||
          (f === 'contact_no' ? bestMatch.work_phone || bestMatch.phone : '') ||
          (f === 'address' ? bestMatch.office_address : '')
      )

      if (importedVal && existingVal && importedVal !== existingVal) {
        const fieldMeta = EMPLOYEE_FIELDS.find((meta) => meta.key === f)
        conflictFields.push({
          field: f,
          label: fieldMeta?.label || f,
          importedValue: importedVal,
          existingValue: existingVal,
          resolvedValue: existingVal, // Default to keeping existing on merge
        })
      }
    }
  }

  // Default recommended action based on confidence
  let defaultAction: AnalyzedImportRow['action'] = 'new'
  if (confidence === 'exact') {
    defaultAction = 'skip'
  } else if (confidence === 'possible') {
    defaultAction = 'review'
  }

  return {
    rowNumber,
    data,
    originalRawData: rawRecord,
    confidence,
    matchReasons,
    matchedItem: bestMatch,
    action: defaultAction,
    hasMissingImportantInfo: missingInfoReasons.length > 0,
    missingInfoReasons,
    formatWarnings,
    conflictFields,
  }
}

export function analyzeImportRows(
  rawRows: Record<string, any>[],
  existingItems: VaultItem[],
  _headerMapping?: Record<string, keyof EmployeeRecord | null>
): AnalyzedImportRow[] {
  const analyzed: AnalyzedImportRow[] = []
  for (let i = 0; i < rawRows.length; i++) {
    const row = analyzeImportRecord(rawRows[i], i + 1, existingItems, analyzed)
    analyzed.push(row)
  }
  return analyzed
}

// -------------------------------------------------------------
// JSON, Excel and CSV File Parsing
// -------------------------------------------------------------

export async function parseEmployeeImportFile(file: File): Promise<{
  headers: string[]
  headerMapping: Record<string, keyof EmployeeRecord | null>
  rawRows: Record<string, any>[]
}> {
  const isJsonFile = file.name.toLowerCase().endsWith('.json') || file.type.includes('json')

  if (isJsonFile) {
    const textContent = await file.text()
    let parsed: any
    try {
      parsed = JSON.parse(textContent)
    } catch {
      throw new Error('Failed to parse JSON file. Please ensure the file contains valid JSON formatting.')
    }

    let rawList: any[] = []
    if (Array.isArray(parsed)) {
      rawList = parsed
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.employees)) rawList = parsed.employees
      else if (Array.isArray(parsed.items)) rawList = parsed.items
      else if (Array.isArray(parsed.records)) rawList = parsed.records
      else if (Array.isArray(parsed.data)) rawList = parsed.data
      else if (parsed.vault && Array.isArray(parsed.vault.items)) rawList = parsed.vault.items
      else {
        // Single object or key-value map
        const values = Object.values(parsed).filter((v) => typeof v === 'object' && v !== null)
        if (values.length > 0) rawList = values
        else rawList = [parsed]
      }
    }

    if (!rawList || rawList.length === 0) {
      throw new Error('No employee records found in the uploaded JSON file.')
    }

    // Collect all unique keys present across all objects
    const keySet = new Set<string>()
    rawList.forEach((row) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((k) => keySet.add(k))
      }
    })

    const rawHeaders = Array.from(keySet)
    const headerMapping = mapRawHeadersToEmployeeFields(rawHeaders)

    const rows: Record<string, any>[] = []
    for (const rawItem of rawList) {
      if (!rawItem || typeof rawItem !== 'object') continue

      const rowObj: Record<string, any> = {}
      rawHeaders.forEach((headerName) => {
        const mappedField = headerMapping[headerName]
        const cellVal = rawItem[headerName]
        if (mappedField) {
          rowObj[mappedField] = cellVal
        }
        rowObj[headerName] = cellVal
      })

      // Also map standard Vault item attributes if it's a Vault export JSON
      if (rawItem.full_name && !rowObj.name) rowObj.name = rawItem.full_name
      if (rawItem.name && !rowObj.name) rowObj.name = rawItem.name
      if (rawItem.employee_id && !rowObj.dmbb_id) rowObj.dmbb_id = rawItem.employee_id
      if (rawItem.work_phone && !rowObj.contact_no) rowObj.contact_no = rawItem.work_phone
      if (rawItem.phone && !rowObj.contact_no) rowObj.contact_no = rawItem.phone
      if (rawItem.office_address && !rowObj.address) rowObj.address = rawItem.office_address
      if (rawItem.pagibig_no && !rowObj.hdmf_no) rowObj.hdmf_no = rawItem.pagibig_no
      if (rawItem.philhealth_no && !rowObj.phic_no) rowObj.phic_no = rawItem.philhealth_no

      // Filter out obvious sample rows
      const nameVal = String(rowObj.name || rowObj["EMPLOYEE'S NAME"] || '').toLowerCase()
      if (nameVal.includes('sample') && (nameVal.includes('do not import') || nameVal.includes('juan dela cruz (sample)'))) {
        continue
      }

      rows.push(rowObj)
    }

    return {
      headers: rawHeaders,
      headerMapping,
      rawRows: rows,
    }
  }

  // Fallback to Excel / CSV Parsing
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('The selected workbook has no sheets.')
  }

  const sheet = workbook.Sheets[firstSheetName]
  const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, raw: true, defval: '' })

  if (!jsonData || jsonData.length === 0) {
    throw new Error('The uploaded file appears to be empty.')
  }

  // Find header row (skip empty rows if any)
  let headerRowIndex = 0
  while (
    headerRowIndex < jsonData.length &&
    (!Array.isArray(jsonData[headerRowIndex]) || jsonData[headerRowIndex].every((c: any) => !c))
  ) {
    headerRowIndex++
  }

  if (headerRowIndex >= jsonData.length) {
    throw new Error('No valid header row could be found in the file.')
  }

  const rawHeaders = (jsonData[headerRowIndex] as any[]).map((h) => String(h || '').trim())
  const headerMapping = mapRawHeadersToEmployeeFields(rawHeaders)

  const rows: Record<string, any>[] = []
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const rawRow = jsonData[i] as any[]
    if (!rawRow || rawRow.every((val) => val === '' || val === null || val === undefined)) {
      continue // Skip completely blank lines
    }

    const rowObj: Record<string, any> = {}
    rawHeaders.forEach((headerName, colIdx) => {
      const mappedField = headerMapping[headerName]
      const cellVal = rawRow[colIdx]
      if (mappedField) {
        rowObj[mappedField] = cellVal
      }
      rowObj[headerName] = cellVal
    })

    // Filter out obvious sample rows
    const nameVal = String(rowObj.name || rowObj["EMPLOYEE'S NAME"] || '').toLowerCase()
    if (nameVal.includes('sample') && (nameVal.includes('do not import') || nameVal.includes('juan dela cruz (sample)'))) {
      continue
    }

    rows.push(rowObj)
  }

  return {
    headers: rawHeaders,
    headerMapping,
    rawRows: rows,
  }
}

// -------------------------------------------------------------
// Merge Employee Records
// -------------------------------------------------------------

export function mergeEmployeeRecord(existing: VaultItem, imported: EmployeeRecord, customResolutions?: Record<string, string>): VaultItem {
  const merged = { ...existing }

  // Fields to intelligently combine
  const fieldMap: { target: keyof VaultItem; source: keyof EmployeeRecord; fallbackTarget?: keyof VaultItem }[] = [
    { target: 'full_name', source: 'name' },
    { target: 'name', source: 'name' },
    { target: 'department', source: 'department' },
    { target: 'position', source: 'position' },
    { target: 'contract', source: 'contract' },
    { target: 'status', source: 'status' },
    { target: 'sss_no', source: 'sss_no' },
    { target: 'hdmf_no', source: 'hdmf_no' },
    { target: 'phic_no', source: 'phic_no' },
    { target: 'tin_no', source: 'tin_no' },
    { target: 'birthdate', source: 'birthdate' },
    { target: 'office_address', source: 'address', fallbackTarget: 'address' },
    { target: 'address', source: 'address' },
    { target: 'employee_id', source: 'dmbb_id', fallbackTarget: 'dmbb_id' },
    { target: 'dmbb_id', source: 'dmbb_id' },
    { target: 'work_phone', source: 'contact_no', fallbackTarget: 'phone' },
    { target: 'phone', source: 'contact_no' },
    { target: 'contact_no', source: 'contact_no' },
    { target: 'emergency_contact', source: 'emergency_contact' },
    { target: 'work_email', source: 'work_email' },
  ]

  for (const { target, source, fallbackTarget } of fieldMap) {
    const existingVal = cleanText(merged[target] || (fallbackTarget ? merged[fallbackTarget] : ''))
    const importedVal = cleanText(imported[source])

    if (customResolutions && customResolutions[source] !== undefined) {
      // User explicitly picked a value
      (merged as any)[target] = customResolutions[source]
      if (fallbackTarget) (merged as any)[fallbackTarget] = customResolutions[source]
    } else if (!existingVal && importedVal) {
      // Intelligently fill empty existing field
      (merged as any)[target] = importedVal
      if (fallbackTarget) (merged as any)[fallbackTarget] = importedVal
    }
  }

  merged.name = deriveItemName(merged)
  merged.updated_at = new Date().toISOString()
  return merged
}

// -------------------------------------------------------------
// Convert EmployeeRecord to VaultItem
// -------------------------------------------------------------

export function employeeRecordToVaultItem(rec: EmployeeRecord): Partial<VaultItem> & { type: 'identity'; name: string } {
  const resolvedName = rec.name.trim() || 'Employee Profile'
  return {
    type: 'identity',
    name: resolvedName,
    full_name: rec.name.trim(),
    department: rec.department.trim(),
    position: rec.position.trim(),
    contract: rec.contract.trim() || 'Regular',
    status: rec.status.trim() || 'Active',
    sss_no: rec.sss_no.trim(),
    hdmf_no: rec.hdmf_no.trim(),
    pagibig_no: rec.hdmf_no.trim(),
    phic_no: rec.phic_no.trim(),
    philhealth_no: rec.phic_no.trim(),
    tin_no: rec.tin_no.trim(),
    birthdate: rec.birthdate.trim(),
    address: rec.address.trim(),
    office_address: rec.address.trim(),
    dmbb_id: rec.dmbb_id.trim(),
    employee_id: rec.dmbb_id.trim(),
    contact_no: rec.contact_no.trim(),
    work_phone: rec.contact_no.trim(),
    phone: rec.contact_no.trim(),
    emergency_contact: rec.emergency_contact.trim(),
    work_email: rec.work_email?.trim() || '',
    category: 'General',
    company: 'DBB',
  }
}

// -------------------------------------------------------------
// Export Employees to Excel / CSV
// -------------------------------------------------------------

export function prepareEmployeeExportRows(items: VaultItem[]): Record<string, string>[] {
  return items.map((item) => ({
    "EMPLOYEE'S NAME": item.full_name || item.name || '',
    Department: item.department || '',
    POSITION: item.position || '',
    CONTRACT: item.contract || 'Regular',
    STATUS: item.status || 'Active',
    'SSS NO.': item.sss_no || '',
    'HDMF NO.': item.hdmf_no || item.pagibig_no || '',
    'PHIC NO.': item.phic_no || item.philhealth_no || '',
    'TIN NO.': item.tin_no || '',
    BIRTHDATE: item.birthdate || '',
    ADDRESS: item.address || item.office_address || '',
    'DMBB ID NO.': item.dmbb_id || item.employee_id || '',
    'CONTACT NO.': item.contact_no || item.work_phone || item.phone || '',
    'IN CASE OF EMERGENCY': item.emergency_contact || '',
    'WORK EMAIL': item.work_email || '',
  }))
}

export function exportEmployeesToFile(
  items: VaultItem[],
  format: 'json' | 'xlsx' | 'csv' = 'json',
  filenamePrefix = 'DBB_Employees'
) {
  const dateStr = new Date().toISOString().split('T')[0]
  const fullName = `${filenamePrefix}_${dateStr}.${format}`

  if (format === 'json') {
    const exportData = prepareEmployeeExportRows(items)
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fullName
    link.click()
    URL.revokeObjectURL(link.href)
    return
  }

  const exportData = prepareEmployeeExportRows(items)
  const worksheet = XLSX.utils.json_to_sheet(exportData)

  // Format column widths nicely
  worksheet['!cols'] = [
    { wch: 28 }, // Name
    { wch: 18 }, // Dept
    { wch: 22 }, // Position
    { wch: 14 }, // Contract
    { wch: 12 }, // Status
    { wch: 16 }, // SSS
    { wch: 18 }, // HDMF
    { wch: 18 }, // PHIC
    { wch: 18 }, // TIN
    { wch: 16 }, // Birthdate
    { wch: 32 }, // Address
    { wch: 16 }, // DMBB ID
    { wch: 16 }, // Contact No
    { wch: 26 }, // ICE
    { wch: 26 }, // Work Email
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees')

  XLSX.writeFile(workbook, fullName, { bookType: format })
}

// -------------------------------------------------------------
// Download Template with Sample Data
// -------------------------------------------------------------

export function downloadEmployeeTemplate(format: 'json' | 'xlsx' | 'csv' = 'json') {
  const templateRows = [
    {
      "EMPLOYEE'S NAME": 'Abalo, Oliver Bacsinila',
      Department: 'Warehouse',
      POSITION: 'Expediter',
      CONTRACT: 'Regular',
      STATUS: 'Active',
      'SSS NO.': '06-1802091-9',
      'HDMF NO.': '1210-1324-5701',
      'PHIC NO.': '12-025938426-0',
      'TIN NO.': '225-254-775-000',
      BIRTHDATE: 'June 19, 1976',
      ADDRESS: 'Laguna, Philippines',
      'DMBB ID NO.': '2022-00130',
      'CONTACT NO.': '0917-123-4567',
      'IN CASE OF EMERGENCY': 'Maria Abalo - 0918-987-6543',
      'WORK EMAIL': 'oliver.abalo@dbb.com',
    },
    {
      "EMPLOYEE'S NAME": 'Dela Cruz, Juan Santos',
      Department: 'IT & Infrastructure',
      POSITION: 'Systems Administrator',
      CONTRACT: 'Regular',
      STATUS: 'Active',
      'SSS NO.': '34-5678901-2',
      'HDMF NO.': '1211-9876-5432',
      'PHIC NO.': '01-234567890-1',
      'TIN NO.': '123-456-789-000',
      BIRTHDATE: 'August 15, 1988',
      ADDRESS: 'Makati City, Metro Manila',
      'DMBB ID NO.': '2021-00045',
      'CONTACT NO.': '0918-555-1234',
      'IN CASE OF EMERGENCY': 'Clara Dela Cruz - 0917-222-3333',
      'WORK EMAIL': 'juan.delacruz@dbb.com',
    },
  ]

  if (format === 'json') {
    const jsonStr = JSON.stringify(templateRows, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `DBB_Employee_Import_Template.json`
    link.click()
    URL.revokeObjectURL(link.href)
    return
  }

  const worksheet = XLSX.utils.json_to_sheet(templateRows)
  worksheet['!cols'] = [
    { wch: 35 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 32 },
    { wch: 16 },
    { wch: 16 },
    { wch: 32 },
    { wch: 26 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Template')

  XLSX.writeFile(workbook, `DBB_Employee_Import_Template.${format}`, { bookType: format })
}

// -------------------------------------------------------------
// Execute Import Plan
// -------------------------------------------------------------

export function executeImportPlan(
  analyzedRows: AnalyzedImportRow[],
  existingVaultItems: VaultItem[]
): {
  updatedItems: VaultItem[]
  report: ImportExecutionReport
} {
  const allItems = [...existingVaultItems]
  const now = new Date().toISOString()

  let addedCount = 0
  let updatedCount = 0
  let mergedCount = 0
  let skippedCount = 0

  for (const row of analyzedRows) {
    if (row.action === 'skip') {
      skippedCount++
      continue
    }

    if (row.action === 'new' || !row.matchedItem) {
      const newItemPart = employeeRecordToVaultItem(row.data)
      const newItem: VaultItem = {
        id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: now,
        updated_at: now,
        favorite: false,
        tags: ['employee', (row.data.department || '').toLowerCase()].filter(Boolean),
        notes: '',
        is_trash: false,
        deleted_at: null,
        company: 'DBB',
        location: '',
        team: '',
        assigned_to: '',
        ...newItemPart,
      } as VaultItem

      allItems.unshift(newItem)
      addedCount++
      continue
    }

    if (row.action === 'update' && row.matchedItem) {
      const existingIdx = allItems.findIndex((i) => i.id === row.matchedItem!.id)
      if (existingIdx !== -1) {
        const newItemPart = employeeRecordToVaultItem(row.data)
        allItems[existingIdx] = {
          ...allItems[existingIdx],
          ...newItemPart,
          updated_at: now,
        } as VaultItem
        updatedCount++
      }
      continue
    }

    if (row.action === 'merge' && row.matchedItem) {
      const existingIdx = allItems.findIndex((i) => i.id === row.matchedItem!.id)
      if (existingIdx !== -1) {
        const customResolutions: Record<string, string> = {}
        if (row.conflictFields) {
          row.conflictFields.forEach((cf) => {
            if (cf.resolvedValue !== undefined) {
              customResolutions[cf.field] = cf.resolvedValue
            }
          })
        }

        const merged = mergeEmployeeRecord(allItems[existingIdx], row.data, customResolutions)
        allItems[existingIdx] = merged
        mergedCount++
      }
      continue
    }
  }

  return {
    updatedItems: allItems,
    report: {
      fileName: 'Imported Masterlist',
      totalProcessed: analyzedRows.length,
      addedCount,
      updatedCount,
      mergedCount,
      skippedCount,
      reviewCount: 0,
      timestamp: now,
      items: [],
    },
  }
}
