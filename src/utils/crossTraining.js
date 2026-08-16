import { normalizeSessionDate } from './sessionSchema'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function numberOr(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value)
  return Number.isFinite(n) ? clamp(n, min, max) : fallback
}

function normalizeFingerLoad(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (['high', 'heavy', 'max'].includes(raw)) return 'high'
  if (['medium', 'moderate', 'med'].includes(raw)) return 'medium'
  if (['low', 'light'].includes(raw)) return 'low'
  return 'none'
}

export function normalizeCrossTrainingEntry(entry = {}) {
  return {
    ...entry,
    date: normalizeSessionDate(entry.date ?? entry.Date),
    type: String(entry.type ?? entry.Type ?? '').trim().toLowerCase(),
    focus: String(entry.focus ?? entry.Focus ?? entry.activity ?? entry.Activity ?? '').trim().toLowerCase(),
    durationMinutes: Math.round(numberOr(
      entry.durationMinutes ?? entry.Duration ?? entry['Duration Minutes'] ?? entry.Minutes,
      0,
      0,
      1440,
    )),
    rpe: numberOr(entry.rpe ?? entry.RPE, 5, 0, 10),
    fingerLoad: normalizeFingerLoad(entry.fingerLoad ?? entry['Finger Load']),
    notes: String(entry.notes ?? entry.Notes ?? '').replace(/<br\s*\/?\s*>/gi, '\n').trim(),
  }
}

export function isValidCrossTrainingEntry(entry) {
  return Boolean(
    entry &&
    entry.date &&
    ['strength', 'cardio'].includes(entry.type) &&
    Number.isFinite(entry.durationMinutes) &&
    entry.durationMinutes > 0 &&
    Number.isFinite(entry.rpe)
  )
}

export function crossTrainingFingerprint(entry) {
  return [
    entry?.date,
    entry?.type,
    entry?.focus,
    entry?.durationMinutes,
    entry?.rpe,
    entry?.fingerLoad,
    entry?.notes,
  ].map(value => String(value ?? '').trim().toLowerCase()).join('::')
}

export function getCrossTrainingLoad(entry) {
  if (!entry) return 0
  return Math.round((Number(entry.durationMinutes) || 0) * (Number(entry.rpe) || 0))
}

function startOfWeek(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const day = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getCrossTrainingSummary(entries = []) {
  const valid = entries.filter(isValidCrossTrainingEntry)
  if (!valid.length) {
    return {
      totalEntries: 0,
      totalMinutes: 0,
      totalLoad: 0,
      strength: { sessions: 0, minutes: 0, load: 0 },
      cardio: { sessions: 0, minutes: 0, load: 0 },
      fingerLoadSessions: 0,
      thisWeek: { sessions: 0, minutes: 0, load: 0 },
    }
  }

  const latestDate = valid.reduce((max, entry) => entry.date > max ? entry.date : max, valid[0].date)
  const latestWeek = startOfWeek(latestDate)
  const nextWeek = latestWeek ? new Date(latestWeek.getTime() + 7 * 86400000) : null

  const result = {
    totalEntries: valid.length,
    totalMinutes: 0,
    totalLoad: 0,
    strength: { sessions: 0, minutes: 0, load: 0 },
    cardio: { sessions: 0, minutes: 0, load: 0 },
    fingerLoadSessions: 0,
    thisWeek: { sessions: 0, minutes: 0, load: 0 },
  }

  valid.forEach(entry => {
    const load = getCrossTrainingLoad(entry)
    result.totalMinutes += entry.durationMinutes
    result.totalLoad += load
    result[entry.type].sessions += 1
    result[entry.type].minutes += entry.durationMinutes
    result[entry.type].load += load
    if (entry.fingerLoad !== 'none') result.fingerLoadSessions += 1

    if (latestWeek && nextWeek) {
      const d = new Date(`${entry.date}T12:00:00`)
      if (d >= latestWeek && d < nextWeek) {
        result.thisWeek.sessions += 1
        result.thisWeek.minutes += entry.durationMinutes
        result.thisWeek.load += load
      }
    }
  })

  return result
}
