const ARCHETYPES = {
  limit: {
    label: 'Limit Project',
    short: 'Limit',
    description: 'High-effort work at or above your current ceiling.',
  },
  power: {
    label: 'Power / Strength',
    short: 'Power',
    description: 'Steep, intense climbing that emphasizes force and recruitment.',
  },
  volume: {
    label: 'Volume Builder',
    short: 'Volume',
    description: 'Efficient sends and repeatable work that build capacity.',
  },
  technique: {
    label: 'Technique Builder',
    short: 'Technique',
    description: 'Lower-cost sessions focused on movement quality and skill.',
  },
  recovery: {
    label: 'Recovery / Low Load',
    short: 'Recovery',
    description: 'Low-intensity climbing that keeps movement without adding much fatigue.',
  },
  balanced: {
    label: 'Balanced Session',
    short: 'Balanced',
    description: 'A mixed session without one dominant training stimulus.',
  },
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const safeAttempts = session => Math.max(Number(session.attempts) || 1, 1)
const safeRpe = session => clamp(Number(session.rpe) || 0, 0, 10)
const hasHold = (session, hold) => Array.isArray(session.holds) && session.holds.includes(hold)

function estimateReferenceGrade(sessions) {
  const sent = sessions
    .filter(session => session.sent && Number.isFinite(Number(session.grade)))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12)

  if (!sent.length) {
    const grades = sessions.map(s => Number(s.grade)).filter(Number.isFinite)
    return grades.length ? Math.max(...grades) : 0
  }

  const grades = sent.map(session => Number(session.grade)).sort((a, b) => b - a)
  const topCount = Math.max(1, Math.ceil(grades.length * 0.4))
  const top = grades.slice(0, topCount)
  return top.reduce((sum, grade) => sum + grade, 0) / top.length
}

function scoreSession(session, referenceGrade) {
  const grade = Number(session.grade) || 0
  const attempts = safeAttempts(session)
  const rpe = safeRpe(session)
  const angle = Number(session.wallAngle) || 90
  const delta = grade - referenceGrade
  const type = String(session.sessionType || '').toLowerCase()
  const style = String(session.style || '').toLowerCase()

  const scores = {
    limit: 0,
    power: 0,
    volume: 0,
    technique: 0,
    recovery: 0,
    balanced: 1,
  }

  const reasons = {
    limit: [], power: [], volume: [], technique: [], recovery: [], balanced: [],
  }

  if (type === 'project') { scores.limit += 3; reasons.limit.push('project-focused') }
  if (delta >= 0.4) { scores.limit += 3; reasons.limit.push('above current baseline') }
  else if (delta >= 0) { scores.limit += 1.5; reasons.limit.push('near current ceiling') }
  if (attempts >= 6) { scores.limit += 2; reasons.limit.push('high attempts') }
  else if (attempts >= 4) { scores.limit += 1; reasons.limit.push('repeat attempts') }
  if (rpe >= 8) { scores.limit += 2; reasons.limit.push('high RPE') }
  if (!session.sent && grade >= referenceGrade) { scores.limit += 1.5; reasons.limit.push('unsent limit work') }

  if (angle >= 115 || style === 'cave') { scores.power += 3; reasons.power.push('steep terrain') }
  else if (angle >= 105 || style === 'overhang') { scores.power += 2; reasons.power.push('overhanging terrain') }
  if (hasHold(session, 'crimp') || hasHold(session, 'pinch')) { scores.power += 1; reasons.power.push('strength-biased holds') }
  if (rpe >= 8) { scores.power += 2; reasons.power.push('high intensity') }
  if (delta >= 0) { scores.power += 1; reasons.power.push('hard grade exposure') }

  if (type === 'volume') { scores.volume += 4; reasons.volume.push('volume session') }
  if (session.sent) { scores.volume += 1.5; reasons.volume.push('successful climbing') }
  if (attempts <= 3) { scores.volume += 1.5; reasons.volume.push('efficient attempts') }
  if (rpe >= 5 && rpe <= 7) { scores.volume += 1; reasons.volume.push('repeatable intensity') }
  if (delta <= 0) { scores.volume += 1; reasons.volume.push('submaximal grade') }

  if (type === 'technique') { scores.technique += 4; reasons.technique.push('technique session') }
  if (style === 'slab' || style === 'vertical') { scores.technique += 2; reasons.technique.push(`${style || 'technical'} terrain`) }
  if (rpe <= 7) { scores.technique += 1; reasons.technique.push('manageable intensity') }
  if (attempts <= 4) { scores.technique += 1; reasons.technique.push('movement-focused attempts') }

  if (rpe <= 5) { scores.recovery += 4; reasons.recovery.push('low RPE') }
  else if (rpe <= 6) { scores.recovery += 2; reasons.recovery.push('low-moderate RPE') }
  if (delta <= -0.7) { scores.recovery += 2; reasons.recovery.push('well below current ceiling') }
  if (type !== 'project' && attempts <= 2) { scores.recovery += 1; reasons.recovery.push('low attempt load') }
  if (Number(session.restDays) <= 1 && rpe <= 6) { scores.recovery += 1; reasons.recovery.push('easy follow-up session') }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [winner, winnerScore] = entries[0]
  const runnerUpScore = entries[1]?.[1] ?? 0
  const key = winnerScore < 4 || winnerScore - runnerUpScore < 0.75 ? 'balanced' : winner

  const confidence = key === 'balanced'
    ? clamp(0.45 + (winnerScore / 12) * 0.2, 0.45, 0.65)
    : clamp(0.5 + ((scores[key] - runnerUpScore) / 8) + scores[key] / 20, 0.5, 0.95)

  return {
    key,
    label: ARCHETYPES[key].label,
    short: ARCHETYPES[key].short,
    description: ARCHETYPES[key].description,
    confidence: Number(confidence.toFixed(2)),
    reasons: (reasons[key].length ? reasons[key] : ['mixed training stimulus']).slice(0, 3),
    scores,
  }
}

export function classifySession(session, sessions = []) {
  const referenceGrade = estimateReferenceGrade(sessions.length ? sessions : [session])
  return scoreSession(session, referenceGrade)
}

export function getSessionArchetypes(sessions = []) {
  const valid = sessions.filter(session => session?.date && Number.isFinite(Number(session.grade)))
  if (!valid.length) return { sessions: [], summary: [], dominant: null, recent: [] }

  const referenceGrade = estimateReferenceGrade(valid)
  const classified = [...valid]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(session => ({ ...session, archetype: scoreSession(session, referenceGrade) }))

  const counts = classified.reduce((acc, session) => {
    const key = session.archetype.key
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const summary = Object.entries(counts)
    .map(([key, count]) => ({
      key,
      label: ARCHETYPES[key].label,
      short: ARCHETYPES[key].short,
      description: ARCHETYPES[key].description,
      count,
      pct: Math.round((count / classified.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  return {
    sessions: classified,
    summary,
    dominant: summary[0] || null,
    recent: classified.slice(-5).reverse(),
    referenceGrade: Number(referenceGrade.toFixed(1)),
  }
}
