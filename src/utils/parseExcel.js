import * as XLSX from 'xlsx'
import { isValidSession, normalizeSession } from './sessionSchema'

const REQUIRED_HEADERS = [
  'Date', 'Gym', 'Grade', 'Wall Angle', 'Style',
  'Holds', 'Attempts', 'Sent', 'RPE', 'Rest Days',
  'Session Type', 'Injury Flag', 'Notes'
]

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })

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
          .map(raw => normalizeSession({
            date: raw['Date'],
            gym: raw['Gym'],
            grade: raw['Grade'],
            wallAngle: raw['Wall Angle'],
            style: raw['Style'],
            holds: raw['Holds'],
            attempts: raw['Attempts'],
            sent: raw['Sent'],
            rpe: raw['RPE'],
            restDays: raw['Rest Days'],
            sessionType: raw['Session Type'],
            injuryFlag: raw['Injury Flag'],
            notes: raw['Notes'],
          }))
          .filter(isValidSession)

        if (!sessions.length) {
          reject(new Error('No valid climbing rows found — check Date and Grade values'))
          return
        }

        resolve(sessions)
      } catch (error) {
        console.error(error)
        reject(new Error('Could not read file — make sure it is a valid .xlsx'))
      }
    }

    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsArrayBuffer(file)
  })
}