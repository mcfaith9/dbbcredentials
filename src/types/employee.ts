import type { VaultItem } from './index'

export interface EmployeeRecord {
  name: string
  department: string
  position: string
  contract: string
  status: string
  sss_no: string
  hdmf_no: string
  phic_no: string
  tin_no: string
  birthdate: string
  address: string
  dmbb_id: string
  contact_no: string
  emergency_contact: string
  work_email?: string
}

export type DuplicateConfidence = 'exact' | 'possible' | 'none'
export type ImportRowAction = 'new' | 'update' | 'merge' | 'skip' | 'review'

export interface MatchReason {
  field: string
  label: string
  matchedValue: string
  existingValue: string
  description?: string
}

export interface AnalyzedImportRow {
  rowNumber: number
  data: EmployeeRecord
  originalRawData: Record<string, any>
  confidence: DuplicateConfidence
  matchReasons: MatchReason[]
  matchedItem: VaultItem | null
  action: ImportRowAction
  hasMissingImportantInfo: boolean
  missingInfoReasons: string[]
  formatWarnings: string[]
  conflictFields?: {
    field: keyof EmployeeRecord
    label: string
    importedValue: string
    existingValue: string
    resolvedValue?: string
  }[]
}

export interface ImportAnalysisSummary {
  totalRecords: number
  newCount: number
  possibleDuplicateCount: number
  exactDuplicateCount: number
  missingInfoCount: number
  invalidCount: number
}

export interface ImportReportItem {
  rowNumber: number
  name: string
  dmbbId: string
  actionTaken: 'added' | 'updated' | 'merged' | 'skipped' | 'needs_review'
  details: string
}

export interface ImportExecutionReport {
  timestamp: string
  fileName: string
  totalProcessed: number
  addedCount: number
  updatedCount: number
  mergedCount: number
  skippedCount: number
  reviewCount: number
  items: ImportReportItem[]
}
