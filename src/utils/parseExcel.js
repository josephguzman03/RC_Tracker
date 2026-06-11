import * as XLSX from 'xlsx'

const REQUIRED_HEADERS = [
  'Date', 'Gym', 'Grade', 'Wall Angle', 'Style',
  'Holds', 'Attempts', 'Sent', 'RPE', 'Rest Days',
  'Session Type', 'Injury Flag', 'Notes'
]

function normalizeRow(raw) {
  return {
    date:        String(raw['Date'] ?? '').trim(),
    gym:         String(raw['Gym'] ?? '').trim(),
    grade:       Number(raw['Grade'] ?? 0),
    wallAngle:   Number(raw['Wall Angle'] ?? 90),
    style:       String(raw['Style'] ?? '').toLowerCase().trim(),
    holds:       String(raw['Holds'] ?? '').toLowerCase().split('/').map(h => h.trim()).filter(Boolean),
    attempts:    Number(raw['Attempts'] ?? 1),
    sent:        String(raw['Sent'] ?? 'false').toLowerCase() === 'true',
    rpe:         Number(raw['RPE'] ?? 5),
    restDays:    Number(raw['Rest Days'] ?? 0),
    sessionType: String(raw['Session Type'] ?? '').toLowerCase().trim(),
    injuryFlag:  String(raw['Injury Flag'] ?? 'none').toLowerCase().trim(),
    notes:       String(raw['Notes'] ?? '').trim(),
  }
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data     = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet    = workbook.Sheets[workbook.SheetNames[0]]
        const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        if (!rows.length) {
          reject(new Error('File appears to be empty'))
          return
        }

        const headers = Object.keys(rows[0])
        const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h))

        if (missing.length) {
          reject(new Error(`Missing columns: ${missing.join(', ')}`))
          return
        }

        const sessions = rows
          .filter(r => r['Date'] && r['Grade'])
          .map(normalizeRow)

        resolve(sessions)
      } catch {
        reject(new Error('Could not read file — make sure it is a valid .xlsx'))
      }
    }

    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsArrayBuffer(file)
  })
}