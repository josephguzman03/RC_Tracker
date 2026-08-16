const DAY_MS = 86400000

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function pad2(value) {
  return String(value).padStart(2, '0')
}

function isoFromParts(year, month, day) {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return ''
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return ''

  const check = new Date(Date.UTC(y, m - 1, d))
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) return ''

  return `${y}-${pad2(m)}-${pad2(d)}`
}

/**
 * Convert Excel serial dates, JS Dates, ISO strings, and common US date strings
 * into one stable YYYY-MM-DD representation.
 */
export function normalizeSessionDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return isoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel's serial-date epoch. 25569 is 1970-01-01.
    const utcMs = Math.round((value - 25569) * DAY_MS)
    const date = new Date(utcMs)
    if (!Number.isNaN(date.getTime())) {
      return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
    }
  }

  const raw = String(value ?? '').trim()
  if (!raw) return ''

  // Numeric text can also be an Excel serial after JSON conversion/storage.
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw)
    if (serial > 20000 && serial < 100000) return normalizeSessionDate(serial)
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/)
  if (iso) return isoFromParts(iso[1], iso[2], iso[3])

  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (us) {
    let year = Number(us[3])
    if (year < 100) year += year >= 70 ? 1900 : 2000
    return isoFromParts(year, us[1], us[2])
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return isoFromParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
  }

  return ''
}

export function normalizeGrade(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(value, 0, 15)
  }

  const raw = String(value ?? '').trim()
  if (!raw) return null

  const match = raw.match(/(?:^|\b)V?\s*(\d+(?:\.\d+)?)/i)
  if (!match) return null

  const grade = Number(match[1])
  return Number.isFinite(grade) ? clamp(grade, 0, 15) : null
}

export function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  const raw = String(value ?? '').trim().toLowerCase()
  return ['true', 'yes', 'y', '1', 'sent', 'send', 'complete', 'completed'].includes(raw)
}

function numberOr(value, fallback, min = -Infinity, max = Infinity) {
  const n = Number(value)
  return Number.isFinite(n) ? clamp(n, min, max) : fallback
}

function normalizeHolds(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap(item => String(item ?? '').toLowerCase().split(/[\/,;|]+/))
      .map(item => item.trim())
      .filter(Boolean)
  }

  return String(value ?? '')
    .toLowerCase()
    .split(/[\/,;|]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

/**
 * Canonical session schema consumed by the tracker.
 * Invalid date/grade values remain explicit so callers can reject the row.
 */
export function normalizeSession(session = {}) {
  const date = normalizeSessionDate(session.date ?? session.Date)
  const grade = normalizeGrade(session.grade ?? session.Grade)

  return {
    ...session,
    date,
    gym: String(session.gym ?? session.Gym ?? '').trim(),
    grade,
    wallAngle: numberOr(session.wallAngle ?? session['Wall Angle'], 90, 0, 180),
    style: String(session.style ?? session.Style ?? '').toLowerCase().trim(),
    holds: normalizeHolds(session.holds ?? session.Holds),
    attempts: Math.round(numberOr(session.attempts ?? session.Attempts, 1, 1, 999)),
    sent: normalizeBoolean(session.sent ?? session.Sent),
    rpe: numberOr(session.rpe ?? session.RPE, 5, 0, 10),
    restDays: Math.round(numberOr(session.restDays ?? session['Rest Days'], 0, 0, 365)),
    sessionType: String(session.sessionType ?? session['Session Type'] ?? '').toLowerCase().trim(),
    injuryFlag: String(session.injuryFlag ?? session['Injury Flag'] ?? 'none').toLowerCase().trim() || 'none',
    notes: String(session.notes ?? session.Notes ?? '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .trim(),
  }
}

export function isValidSession(session) {
  return Boolean(
    session &&
    session.date &&
    typeof session.grade === 'number' &&
    Number.isFinite(session.grade)
  )
}