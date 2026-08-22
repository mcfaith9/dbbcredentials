import { ref } from 'vue'
import type { VaultItem } from '@/types'
import { formatDate, formatDateTime, getEmployeeTenureDisplay, formatPhilippinePhone } from '@/lib/dateUtils'

export interface PrintColumn<T = any> {
  header: string
  key?: string
  format?: (row: T) => string
  align?: 'left' | 'center' | 'right'
  width?: string
}

export interface PrintTableOptions<T = any> {
  title: string
  subtitle?: string
  columns: PrintColumn<T>[]
  data: T[]
  confidentialityNotice?: string
  orientation?: 'portrait' | 'landscape'
  companyName?: string
}

export interface PrintItemOptions {
  title: string
  subtitle?: string
  item: VaultItem
  confidentialityNotice?: string
  companyName?: string
}

export function usePrint() {
  const isPrinting = ref(false)

  function getBasePrintStyles(orientation: 'portrait' | 'landscape' = 'portrait') {
    return `
      @page {
        size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
        margin: 12mm 15mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #18181b;
        background: #ffffff;
        margin: 0;
        padding: 0;
        font-size: 10pt;
        line-height: 1.4;
      }
      .print-container {
        width: 100%;
        max-width: 100%;
      }
      .print-header {
        border-bottom: 2px solid #0f172a;
        padding-bottom: 8px;
        margin-bottom: 14px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .print-title {
        font-size: 16pt;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        letter-spacing: -0.02em;
      }
      .print-subtitle {
        font-size: 9pt;
        color: #64748b;
        margin-top: 3px;
      }
      .print-meta {
        text-align: right;
        font-size: 8pt;
        color: #64748b;
      }
      .print-badge {
        display: inline-block;
        padding: 2px 6px;
        font-size: 7.5pt;
        font-weight: 700;
        text-transform: uppercase;
        border-radius: 4px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #334155;
      }
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 8.5pt;
      }
      .print-table th {
        background-color: #f1f5f9;
        color: #334155;
        font-weight: 700;
        text-align: left;
        padding: 6px 8px;
        border-top: 1px solid #cbd5e1;
        border-bottom: 1.5px solid #94a3b8;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .print-table td {
        padding: 6px 8px;
        border-bottom: 1px solid #e2e8f0;
        color: #1e293b;
        vertical-align: top;
      }
      .print-table tr:nth-child(even) td {
        background-color: #fafbfc;
      }
      .print-footer {
        margin-top: 20px;
        padding-top: 8px;
        border-top: 1px dashed #cbd5e1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 7.5pt;
        color: #94a3b8;
      }
      .confidential-tag {
        font-weight: 700;
        color: #b91c1c;
        letter-spacing: 0.04em;
      }
      .dossier-card {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        margin-bottom: 12px;
        overflow: hidden;
        page-break-inside: avoid;
      }
      .dossier-card-header {
        background-color: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 6px 12px;
        font-size: 9pt;
        font-weight: 700;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .dossier-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px 16px;
        padding: 10px 12px;
      }
      .dossier-grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px 16px;
        padding: 10px 12px;
      }
      .field-label {
        font-size: 7.5pt;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        display: block;
        margin-bottom: 2px;
      }
      .field-value {
        font-size: 9pt;
        color: #0f172a;
        font-weight: 500;
        word-break: break-word;
      }
      .field-value-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 8.5pt;
      }
      .masked-secret {
        font-style: italic;
        color: #94a3b8;
        font-size: 8pt;
      }
    `
  }

  function executePrintHtml(html: string) {
    isPrinting.value = true

    // Create a hidden print iframe to prevent messing with the current SPA DOM
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.id = 'reusable-print-frame'

    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      isPrinting.value = false
      return
    }

    doc.open()
    doc.write(html)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      try {
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('Print trigger failed:', err)
      } finally {
        isPrinting.value = false
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, 1000)
      }
    }, 250)
  }

  /**
   * Reusable Table Printing for Employees, WiFi, Credentials, etc.
   */
  function printTable<T = any>(options: PrintTableOptions<T>) {
    const {
      title,
      subtitle,
      columns,
      data,
      confidentialityNotice = 'CONFIDENTIAL & PROPRIETARY • STRICTLY FOR INTERNAL AUTHORIZED USE ONLY',
      orientation = 'landscape',
      companyName = 'COMPANY VAULT & ASSET MANAGEMENT',
    } = options

    const printTime = formatDateTime(new Date().toISOString())

    const tableHeaders = columns
      .map((col) => {
        const align = col.align || 'left'
        const width = col.width ? `style="width: ${col.width}; text-align: ${align};"` : `style="text-align: ${align};"`
        return `<th ${width}>${col.header}</th>`
      })
      .join('')

    const tableRows = data
      .map((row) => {
        const cells = columns
          .map((col) => {
            const align = col.align || 'left'
            let val = ''
            if (col.format) {
              val = col.format(row)
            } else if (col.key && (row as any)[col.key] !== undefined && (row as any)[col.key] !== null) {
              val = String((row as any)[col.key])
            }
            return `<td style="text-align: ${align};">${val || '<span style="color:#cbd5e1">—</span>'}</td>`
          })
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>${getBasePrintStyles(orientation)}</style>
        </head>
        <body>
          <div class="print-container">
            <div class="print-header">
              <div>
                <div style="font-size: 8pt; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
                  ${companyName}
                </div>
                <h1 class="print-title">${title}</h1>
                ${subtitle ? `<div class="print-subtitle">${subtitle}</div>` : ''}
              </div>
              <div class="print-meta">
                <div><strong>Records:</strong> ${data.length}</div>
                <div><strong>Date Generated:</strong> ${printTime}</div>
                <div class="print-badge" style="margin-top: 4px;">System Export</div>
              </div>
            </div>

            <table class="print-table">
              <thead>
                <tr>${tableHeaders}</tr>
              </thead>
              <tbody>
                ${tableRows || '<tr><td colspan="' + columns.length + '" style="text-align:center; padding: 20px; color: #94a3b8;">No records to display.</td></tr>'}
              </tbody>
            </table>

            <div class="print-footer">
              <div class="confidential-tag">${confidentialityNotice}</div>
              <div>Page 1 • Auto-generated by Company Vault System</div>
            </div>
          </div>
        </body>
      </html>
    `

    executePrintHtml(html)
  }

  /**
   * Reusable Single Item / Employee Dossier Printing
   */
  function printEmployeeDossier(emp: VaultItem) {
    const printTime = formatDateTime(new Date().toISOString())
    const tenureInfo = getEmployeeTenureDisplay(emp.start_date, emp.end_date, emp.status)

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Employee Record — ${emp.full_name || emp.name}</title>
          <style>${getBasePrintStyles('portrait')}</style>
        </head>
        <body>
          <div class="print-container">
            <div class="print-header">
              <div>
                <div style="font-size: 8pt; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
                  COMPANY EMPLOYEE DIRECTORY & RECORDS
                </div>
                <h1 class="print-title">${emp.full_name || emp.name}</h1>
                <div class="print-subtitle">
                  ${emp.position || 'Staff'} • ${emp.department || 'Department Unassigned'}
                  ${emp.dmbb_id ? ` • ID: <strong>${emp.dmbb_id}</strong>` : ''}
                </div>
              </div>
              <div class="print-meta">
                <div><span class="print-badge">${emp.status || 'Active'}</span></div>
                ${emp.contract ? `<div style="margin-top: 3px;"><span class="print-badge" style="background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8;">${emp.contract}</span></div>` : ''}
                <div style="margin-top: 4px; font-size: 7.5pt;">Generated: ${printTime}</div>
              </div>
            </div>

            <!-- 1. Personal & Employment Information -->
            <div class="dossier-card">
              <div class="dossier-card-header">1. Personal & Employment Overview</div>
              <div class="dossier-grid-3">
                <div>
                  <span class="field-label">Full Name</span>
                  <span class="field-value">${emp.full_name || emp.name || '—'}</span>
                </div>
                <div>
                  <span class="field-label">DMBB / DBB ID</span>
                  <span class="field-value field-value-mono">${emp.dmbb_id || emp.employee_id || '—'}</span>
                </div>
                <div>
                  <span class="field-label">Birthdate</span>
                  <span class="field-value">${emp.birthdate || '—'}</span>
                </div>
                <div>
                  <span class="field-label">Department</span>
                  <span class="field-value">${emp.department || '—'}</span>
                </div>
                <div>
                  <span class="field-label">Position / Role</span>
                  <span class="field-value">${emp.position || '—'}</span>
                </div>
                <div>
                  <span class="field-label">Competency (For LBT)</span>
                  <span class="field-value">${emp.competency || '—'}</span>
                </div>
                <div>
                  <span class="field-label">Contract Type</span>
                  <span class="field-value">${emp.contract || 'Regular'}</span>
                </div>
                <div>
                  <span class="field-label">Employment Status</span>
                  <span class="field-value">${emp.status || 'Active'}</span>
                </div>
                <div>
                  <span class="field-label">Company / Entity</span>
                  <span class="field-value">${emp.company || '—'}</span>
                </div>
              </div>
            </div>

            <!-- 2. Employment Timeline & Calculated Tenure -->
            <div class="dossier-card">
              <div class="dossier-card-header">2. Employment Timeline & Tenure</div>
              <div class="dossier-grid-3">
                <div>
                  <span class="field-label">Start Date</span>
                  <span class="field-value">${emp.start_date ? formatDate(emp.start_date) : '—'}</span>
                </div>
                <div>
                  <span class="field-label">End Date</span>
                  <span class="field-value">${emp.end_date ? formatDate(emp.end_date) : ((emp.status || '').toLowerCase() === 'active' ? 'Present (Active)' : '—')}</span>
                </div>
                <div>
                  <span class="field-label">Calculated Tenure</span>
                  <span class="field-value" style="font-weight: 700; color: #1e3a8a;">${tenureInfo}</span>
                </div>
              </div>
            </div>

            <!-- 3. Philippine Government Identification -->
            <div class="dossier-card">
              <div class="dossier-card-header">3. Philippine Government Identification</div>
              <div class="dossier-grid">
                <div>
                  <span class="field-label">SSS Number</span>
                  <span class="field-value field-value-mono">${emp.sss_no || '—'}</span>
                </div>
                <div>
                  <span class="field-label">HDMF / Pag-IBIG Number</span>
                  <span class="field-value field-value-mono">${emp.hdmf_no || emp.pagibig_no || '—'}</span>
                </div>
                <div>
                  <span class="field-label">PHIC / PhilHealth Number</span>
                  <span class="field-value field-value-mono">${emp.phic_no || emp.philhealth_no || '—'}</span>
                </div>
                <div>
                  <span class="field-label">TIN (Tax Identification) Number</span>
                  <span class="field-value field-value-mono">${emp.tin_no || '—'}</span>
                </div>
              </div>
            </div>

            <!-- 4. Contact & Location Information -->
            <div class="dossier-card">
              <div class="dossier-card-header">4. Contact & Office Location</div>
              <div class="dossier-grid">
                <div>
                  <span class="field-label">Mobile / Contact Number</span>
                  <span class="field-value field-value-mono">${emp.contact_no || emp.work_phone || emp.phone ? formatPhilippinePhone(emp.contact_no || emp.work_phone || emp.phone) : '—'}</span>
                </div>
                <div>
                  <span class="field-label">Work Email</span>
                  <span class="field-value">${emp.work_email || emp.email || '—'}</span>
                </div>
                <div style="grid-column: span 2;">
                  <span class="field-label">Permanent / Home Address</span>
                  <span class="field-value">${emp.address || '—'}</span>
                </div>
                <div style="grid-column: span 2;">
                  <span class="field-label">Office / Station Address</span>
                  <span class="field-value">${emp.office_address || '—'}</span>
                </div>
              </div>
            </div>

            <!-- 5. Emergency Contact Information (ICE) -->
            <div class="dossier-card" style="border-color: #fcd34d;">
              <div class="dossier-card-header" style="background-color: #fffbeb; color: #92400e;">
                5. In Case of Emergency (ICE)
              </div>
              <div class="dossier-grid">
                <div>
                  <span class="field-label">Emergency Contact Person</span>
                  <span class="field-value">${emp.emergency_contact || '—'}</span>
                </div>
                <div>
                  <span class="field-label">Emergency Contact Number</span>
                  <span class="field-value field-value-mono">${emp.emergency_contact_no ? formatPhilippinePhone(emp.emergency_contact_no) : '—'}</span>
                </div>
                <div style="grid-column: span 2;">
                  <span class="field-label">Emergency Contact Address</span>
                  <span class="field-value">${emp.emergency_contact_address || '—'}</span>
                </div>
              </div>
            </div>

            <div class="print-footer">
              <div class="confidential-tag">CONFIDENTIAL EMPLOYEE FILE • UNAUTHORIZED DISCLOSURE PROHIBITED</div>
              <div>Page 1 of 1 • System Dossier</div>
            </div>
          </div>
        </body>
      </html>
    `

    executePrintHtml(html)
  }

  /**
   * Reusable Item Printing for other Vault Item types (Wi-Fi, Servers, Licenses, Accounts)
   * Note: Passwords are NEVER printed in plaintext for security!
   */
  function printGenericVaultItem(item: VaultItem) {
    const printTime = formatDateTime(new Date().toISOString())

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Credential Record — ${item.name}</title>
          <style>${getBasePrintStyles('portrait')}</style>
        </head>
        <body>
          <div class="print-container">
            <div class="print-header">
              <div>
                <div style="font-size: 8pt; font-weight: 700; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
                  COMPANY ASSET & CREDENTIAL VAULT
                </div>
                <h1 class="print-title">${item.name}</h1>
                <div class="print-subtitle">
                  Category: ${item.category || 'General'} • Type: ${item.type}
                </div>
              </div>
              <div class="print-meta">
                <div><span class="print-badge">${item.type.toUpperCase()}</span></div>
                <div style="margin-top: 4px; font-size: 7.5pt;">Generated: ${printTime}</div>
              </div>
            </div>

            <div class="dossier-card">
              <div class="dossier-card-header">Asset Details</div>
              <div class="dossier-grid">
                <div>
                  <span class="field-label">Asset / Account Name</span>
                  <span class="field-value">${item.name}</span>
                </div>
                <div>
                  <span class="field-label">Company / Department</span>
                  <span class="field-value">${item.company || '—'} ${item.department ? `(${item.department})` : ''}</span>
                </div>
                ${item.username ? `<div><span class="field-label">Username / Login ID</span><span class="field-value field-value-mono">${item.username}</span></div>` : ''}
                ${item.ssid ? `<div><span class="field-label">Wi-Fi SSID</span><span class="field-value">${item.ssid}</span></div>` : ''}
                ${item.security_type ? `<div><span class="field-label">Security Protocol</span><span class="field-value">${item.security_type}</span></div>` : ''}
                ${item.hostname ? `<div><span class="field-label">Hostname / Server IP</span><span class="field-value field-value-mono">${item.hostname}</span></div>` : ''}
                ${item.url ? `<div><span class="field-label">Access URL</span><span class="field-value">${item.url}</span></div>` : ''}
                <div>
                  <span class="field-label">Master Password / Secret Key</span>
                  <span class="field-value masked-secret">[PROTECTED IN VAULT - NOT PRINTED FOR SECURITY]</span>
                </div>
              </div>
            </div>

            ${item.notes ? `
            <div class="dossier-card">
              <div class="dossier-card-header">Operational Notes</div>
              <div style="padding: 10px 12px; font-size: 8.5pt; white-space: pre-wrap; color: #334155;">
                ${item.notes}
              </div>
            </div>
            ` : ''}

            <div class="print-footer">
              <div class="confidential-tag">CONFIDENTIAL CREDENTIAL SPECIFICATION • DO NOT DISTRIBUTE</div>
              <div>System Printout</div>
            </div>
          </div>
        </body>
      </html>
    `

    executePrintHtml(html)
  }

  return {
    isPrinting,
    printTable,
    printEmployeeDossier,
    printGenericVaultItem,
  }
}
