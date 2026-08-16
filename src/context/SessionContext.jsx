import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isValidSession, normalizeSession } from '../utils/sessionSchema'

const SessionContext = createContext(null)

const STORAGE_KEY = 'rc-tracker.sessions.v1'
const STORAGE_META_KEY = 'rc-tracker.sessions.meta.v1'

function safeUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeForKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function sessionFingerprint(session) {
  const holds = Array.isArray(session?.holds)
    ? [...session.holds].map(normalizeForKey).sort().join('|')
    : normalizeForKey(session?.holds)

  return [
    session?.date,
    session?.gym,
    session?.grade,
    session?.wallAngle,
    session?.style,
    holds,
    session?.attempts,
    Boolean(session?.sent),
    session?.rpe,
    session?.restDays,
    session?.sessionType,
    session?.injuryFlag,
    session?.notes,
  ].map(normalizeForKey).join('::')
}

function prepareSessions(input = []) {
  return input
    .filter(Boolean)
    .map(session => normalizeSession(session))
    .filter(isValidSession)
    .map(session => ({
      ...session,
      id: session.id || safeUuid(),
    }))
}

function readStoredSessions() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? prepareSessions(parsed) : []
  } catch (error) {
    console.error('Could not restore saved climbing sessions:', error)
    return []
  }
}

function readStoredMeta() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_META_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState(readStoredSessions)
  const [storageReady, setStorageReady] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(() => readStoredMeta()?.lastSavedAt || null)

  useEffect(() => {
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
      const savedAt = new Date().toISOString()
      window.localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ lastSavedAt: savedAt }))
      setLastSavedAt(savedAt)
    } catch (error) {
      console.error('Could not save climbing sessions locally:', error)
    }
  }, [sessions, storageReady])

  // Keep multiple browser tabs in sync with the same locally saved data.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    function onStorage(event) {
      if (event.key === STORAGE_KEY) {
        try {
          const next = event.newValue ? JSON.parse(event.newValue) : []
          setSessions(Array.isArray(next) ? prepareSessions(next) : [])
        } catch (error) {
          console.error('Could not sync climbing sessions between tabs:', error)
        }
      }
      if (event.key === STORAGE_META_KEY) {
        try {
          setLastSavedAt(event.newValue ? JSON.parse(event.newValue)?.lastSavedAt || null : null)
        } catch {
          setLastSavedAt(null)
        }
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const replaceSessions = useCallback(incoming => {
    const next = prepareSessions(incoming)
    setSessions(next)
    return {
      mode: 'replace',
      added: next.length,
      skipped: 0,
      total: next.length,
    }
  }, [])

  const mergeSessions = useCallback(incoming => {
    const nextIncoming = prepareSessions(incoming)
    const known = new Set(sessions.map(sessionFingerprint))
    const additions = []
    let skipped = 0

    for (const session of nextIncoming) {
      const key = sessionFingerprint(session)
      if (known.has(key)) {
        skipped += 1
        continue
      }
      known.add(key)
      additions.push(session)
    }

    const merged = [...sessions, ...additions]
    setSessions(merged)

    return {
      mode: 'merge',
      added: additions.length,
      skipped,
      total: merged.length,
    }
  }, [sessions])

  const clearSessions = useCallback(() => {
    setSessions([])
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(STORAGE_META_KEY)
    }
    setLastSavedAt(null)
  }, [])

  const value = useMemo(() => ({
    sessions,
    setSessions,
    replaceSessions,
    mergeSessions,
    clearSessions,
    storageReady,
    lastSavedAt,
    hasSavedSessions: sessions.length > 0,
  }), [sessions, replaceSessions, mergeSessions, clearSessions, storageReady, lastSavedAt])

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSessionContext() {
  return useContext(SessionContext)
}
