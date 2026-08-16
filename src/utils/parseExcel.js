import * as XLSX from 'xlsx'
import { isValidSession, normalizeSession } from './sessionSchema'
import { isValidCrossTrainingEntry, normalizeCrossTrainingEntry } from './crossTraining'

const REQUIRED_HEADERS = [
  'Date', 'Gym', 'Grade', 'Wall Angle', 'Style',
  'Holds', 'Attempts', 'Sent', 'RPE', 'Rest Days',
  'Session Type', 'Injury Flag', 'Notes'
]

const CROSS_TRAINING_HEADERS = [
  'Date', 'Type', 'Focus', 'Duration', 'RPE', 'Finger Load', 'Notes'
]

function findSheetName(workbook, aliases) {
  const lowered = aliases.map(alias => alias.toLowerCase())
  return workbook.SheetNames.find(name => lowered.includes(name.trim().toLowerCase())) || null
}

function sheetRows(workbook, sheetName) {
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })
}

function parseClimbingRows(rows) {
  if (!rows.length) return []

  const headers = Object.keys(rows[0])
  const missing = REQUIRED_HEADERS.filter(header => !headers.includes(header))
  if (missing.length) throw new Error(`Missing climbing columns: ${missing.join(', ')}`)

  return rows
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
}

function parseCrossTrainingRows(rows) {
  if (!rows.length) return []

  const headers = Object.keys(rows[0])
  const missing = CROSS_TRAINING_HEADERS.filter(header => !headers.includes(header))
  if (missing.length) throw new Error(`Missing Cross Training columns: ${missing.join(', ')}`)

  return rows
    .map(raw => normalizeCrossTrainingEntry({
      date: raw['Date'],
      type: raw['Type'],
      focus: raw['Focus'],
      durationMinutes: raw['Duration'],
      rpe: raw['RPE'],
      fingerLoad: raw['Finger Load'],
      notes: raw['Notes'],
    }))
    .filter(isValidCrossTrainingEntry)
}

/**
 * Parse the complete tracker workbook.
 * Climbing remains required. Cross Training is optional and can be added later.
 */
export function parseTrackerWorkbookFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        if (!workbook.SheetNames.length) throw new Error('Workbook appears to be empty')

        const climbingSheet = findSheetName(workbook, ['Sessions', 'Climbing']) || workbook.SheetNames[0]
        const crossTrainingSheet = findSheetName(workbook, ['Cross Training', 'CrossTraining'])

        const sessions = parseClimbingRows(sheetRows(workbook, climbingSheet))
        if (!sessions.length) throw new Error('No valid climbing rows found — check Date and Grade values')

        const crossTraining = crossTrainingSheet
          ? parseCrossTrainingRows(sheetRows(workbook, crossTrainingSheet))
          : []

        resolve({ sessions, crossTraining, sheets: { climbing: climbingSheet, crossTraining: crossTrainingSheet } })
      } catch (error) {
        console.error(error)
        reject(error instanceof Error ? error : new Error('Could not read workbook'))
      }
    }

    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsArrayBuffer(file)
  })
}

// Backwards-compatible helper for any older code that only expects climbing rows.
export async function parseExcelFile(file) {
  const result = await parseTrackerWorkbookFile(file)
  return result.sessions
}