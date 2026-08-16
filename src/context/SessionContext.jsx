import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isValidSession, normalizeSession } from '../utils/sessionSchema'
import {
  crossTrainingFingerprint,
  isValidCrossTrainingEntry,
  normalizeCrossTrainingEntry,
} from '../utils/crossTraining'

const SessionContext = createContext(null)

const STORAGE_KEY = 'rc-tracker.sessions.v1'
const STORAGE_META_KEY = 'rc-tracker.sessions.meta.v1'
const CROSS_TRAINING_KEY = 'rc-tracker.cross-training.v1'

function safeUuid(prefix = 'session') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeForKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function sessionFingerprint(session) {
  const holds = Array.isArray(session?.holds)
    ? [...session.holds].map(normalizeForKey).sort().join('|')
    : normalizeForKey(session?.holds)

  return [
    session?.date, session?.gym, session?.grade, session?.wallAngle, session?.style,
    holds, session?.attempts, Boolean(session?.sent), session?.rpe, session?.restDays,
    session?.sessionType, session?.injuryFlag, session?.notes,
  ].map(normalizeForKey).join('::')
}

function prepareSessions(input = []) {
  return input
    .filter(Boolean)
    .map(normalizeSession)
    .filter(isValidSession)
    .map(session => ({ ...session, id: session.id || safeUuid('session') }))
}

function prepareCrossTraining(input = []) {
  return input
    .filter(Boolean)
    .map(normalizeCrossTrainingEntry)
    .filter(isValidCrossTrainingEntry)
    .map(entry => ({ ...entry, id: entry.id || safeUuid('training') }))
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function readStoredSessions() {
  const parsed = readJson(STORAGE_KEY, [])
  return Array.isArray(parsed) ? prepareSessions(parsed) : []
}

function readStoredCrossTraining() {
  const parsed = readJson(CROSS_TRAINING_KEY, [])
  return Array.isArray(parsed) ? prepareCrossTraining(parsed) : []
}

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(readStoredSessions)
  const [crossTraining, setCrossTraining] = useState(readStoredCrossTraining)
  const [storageReady, setStorageReady] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(() => readJson(STORAGE_META_KEY, null)?.lastSavedAt || null)

  useEffect(() => setStorageReady(true), [])

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
      window.localStorage.setItem(CROSS_TRAINING_KEY, JSON.stringify(crossTraining))
      const savedAt = new Date().toISOString()
      window.localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ lastSavedAt: savedAt }))
      setLastSavedAt(savedAt)
    } catch (error) {
      console.error('Could not save tracker data locally:', error)
    }
  }, [sessions, crossTraining, storageReady])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    function onStorage(event) {
      try {
        if (event.key === STORAGE_KEY) setSessions(prepareSessions(event.newValue ? JSON.parse(event.newValue) : []))
        if (event.key === CROSS_TRAINING_KEY) setCrossTraining(prepareCrossTraining(event.newValue ? JSON.parse(event.newValue) : []))
        if (event.key === STORAGE_META_KEY) setLastSavedAt(event.newValue ? JSON.parse(event.newValue)?.lastSavedAt || null : null)
      } catch (error) {
        console.error('Could not sync tracker data between tabs:', error)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const replaceSessions = useCallback(incoming => {
    const next = prepareSessions(incoming)
    setSessions(next)
    return { mode: 'replace', added: next.length, skipped: 0, total: next.length }
  }, [])

  const mergeSessions = useCallback(incoming => {
    const nextIncoming = prepareSessions(incoming)
    const known = new Set(sessions.map(sessionFingerprint))
    const additions = []
    let skipped = 0
    nextIncoming.forEach(session => {
      const key = sessionFingerprint(session)
      if (known.has(key)) { skipped += 1; return }
      known.add(key)
      additions.push(session)
    })
    const merged = [...sessions, ...additions]
    setSessions(merged)
    return { mode: 'merge', added: additions.length, skipped, total: merged.length }
  }, [sessions])

  const replaceCrossTraining = useCallback(incoming => {
    const next = prepareCrossTraining(incoming)
    setCrossTraining(next)
    return { mode: 'replace', added: next.length, skipped: 0, total: next.length }
  }, [])

  const mergeCrossTraining = useCallback(incoming => {
    const nextIncoming = prepareCrossTraining(incoming)
    const known = new Set(crossTraining.map(crossTrainingFingerprint))
    const additions = []
    let skipped = 0
    nextIncoming.forEach(entry => {
      const key = crossTrainingFingerprint(entry)
      if (known.has(key)) { skipped += 1; return }
      known.add(key)
      additions.push(entry)
    })
    const merged = [...crossTraining, ...additions]
    setCrossTraining(merged)
    return { mode: 'merge', added: additions.length, skipped, total: merged.length }
  }, [crossTraining])

  const clearSessions = useCallback(() => setSessions([]), [])
  const clearCrossTraining = useCallback(() => setCrossTraining([]), [])
  const clearAllData = useCallback(() => { setSessions([]); setCrossTraining([]) }, [])

  const value = useMemo(() => ({
    sessions,
    setSessions,
    crossTraining,
    setCrossTraining,
    replaceSessions,
    mergeSessions,
    replaceCrossTraining,
    mergeCrossTraining,
    clearSessions,
    clearCrossTraining,
    clearAllData,
    storageReady,
    lastSavedAt,
    hasSavedSessions: sessions.length > 0,
    hasCrossTraining: crossTraining.length > 0,
  }), [
    sessions, crossTraining, replaceSessions, mergeSessions, replaceCrossTraining,
    mergeCrossTraining, clearSessions, clearCrossTraining, clearAllData, storageReady, lastSavedAt,
  ])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext() {
  return useContext(SessionContext)
}
