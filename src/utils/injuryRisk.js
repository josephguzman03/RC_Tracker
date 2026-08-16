const HALF_LIFE_DAYS = 21
const RECENT_WINDOW_DAYS = 14
const INJURY_LOOKBACK_DAYS = 28

const WEIGHTS = {
  loadIncrease: 0.24,
  recovery: 0.18,
  highIntensity: 0.17,
  rpeSpike: 0.15,
  crimpExposure: 0.14,
  injuryHistory: 0.12,
}

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max)
const round = (value, decimals = 2) => Number(value.toFixed(decimals))
const asDate = value => new Date(value)

function sortNewest(sessions) {
  return [...sessions]
    .filter(session => session?.date)
    .sort((a, b) => asDate(b.date) - asDate(a.date))
}

function latestTimestamp(sessions) {
  return Math.max(...sessions.map(session => asDate(session.date).getTime()))
}

function daysSince(date, latest) {
  return Math.max((latest - asDate(date).getTime()) / 86400000, 0)
}

function recencyWeight(session, latest) {
  return Math.pow(0.5, daysSince(session.date, latest) / HALF_LIFE_DAYS)
}

function sessionLoad(session) {
  const rpe = clamp((Number(session.rpe) || 0) / 10)
  const attempts = Math.max(Number(session.attempts) || 1, 1)
  const attemptFactor = 0.8 + Math.min(attempts / 8, 1) * 0.2
  return (Number(session.rpe) || 0) * attemptFactor + rpe * 2
}

function weightedAverage(rows) {
  const weight = rows.reduce((sum, row) => sum + row.weight, 0)
  if (!weight) return 0
  return rows.reduce((sum, row) => sum + row.value * row.weight, 0) / weight
}

function getWindow(sessions, latest, days) {
  return sessions.filter(session => daysSince(session.date, latest) <= days)
}

function loadIncreaseSignal(sessions, latest) {
  const recent = getWindow(sessions, latest, RECENT_WINDOW_DAYS)
  const previous = sessions.filter(session => {
    const age = daysSince(session.date, latest)
    return age > RECENT_WINDOW_DAYS && age <= RECENT_WINDOW_DAYS * 2
  })

  if (recent.length < 2 || previous.length < 2) return 0

  const recentLoad = recent.reduce((sum, session) => sum + sessionLoad(session), 0) / recent.length
  const previousLoad = previous.reduce((sum, session) => sum + sessionLoad(session), 0) / previous.length

  if (!previousLoad) return 0
  return clamp((recentLoad / previousLoad - 1) / 0.5)
}

function recoverySignal(sessions, latest) {
  const recent = getWindow(sessions, latest, RECENT_WINDOW_DAYS)
  if (!recent.length) return 0

  const chronological = [...recent].sort((a, b) => asDate(a.date) - asDate(b.date))
  let shortRecovery = 0
  let transitions = 0

  for (let i = 1; i < chronological.length; i += 1) {
    const gap = (asDate(chronological[i].date) - asDate(chronological[i - 1].date)) / 86400000
    transitions += 1
    if (gap < 2) shortRecovery += 1
  }

  const transitionSignal = transitions ? shortRecovery / transitions : 0
  const latestGap = sessions.length > 1
    ? (asDate(chronological[chronological.length - 1].date) - asDate(chronological[Math.max(0, chronological.length - 2)].date)) / 86400000
    : 2

  const latestSignal = latestGap < 2 ? 1 : latestGap < 3 ? 0.5 : 0
  return clamp(transitionSignal * 0.7 + latestSignal * 0.3)
}

function highIntensitySignal(sessions, latest) {
  const recent = getWindow(sessions, latest, RECENT_WINDOW_DAYS)
  if (!recent.length) return 0

  const weighted = recent.map(session => ({
    value: clamp(((Number(session.rpe) || 0) - 6) / 4),
    weight: recencyWeight(session, latest),
  }))

  return clamp(weightedAverage(weighted))
}

function rpeSpikeSignal(sessions, latest) {
  const recent = getWindow(sessions, latest, 14)
  const previous = sessions.filter(session => {
    const age = daysSince(session.date, latest)
    return age > 14 && age <= 42
  })

  if (recent.length < 2 || previous.length < 2) return 0

  const recentRpe = recent.reduce((sum, session) => sum + (Number(session.rpe) || 0), 0) / recent.length
  const previousRpe = previous.reduce((sum, session) => sum + (Number(session.rpe) || 0), 0) / previous.length

  return clamp((recentRpe - previousRpe) / 2)
}

function crimpExposureSignal(sessions, latest) {
  const recent = getWindow(sessions, latest, RECENT_WINDOW_DAYS)
  if (!recent.length) return 0

  const weighted = recent.map(session => {
    const holds = Array.isArray(session.holds) ? session.holds : []
    const crimpCount = holds.filter(hold => String(hold).toLowerCase() === 'crimp').length
    const exposure = holds.length ? clamp(crimpCount / Math.min(holds.length, 3)) : 0
    return { value: exposure, weight: recencyWeight(session, latest) }
  })

  return clamp(weightedAverage(weighted))
}

function injuryHistorySignal(sessions, latest) {
  const recentInjuries = sessions.filter(session => {
    const flag = String(session.injuryFlag || 'none').toLowerCase()
    return flag !== 'none' && daysSince(session.date, latest) <= INJURY_LOOKBACK_DAYS
  })

  if (!recentInjuries.length) return 0

  const mostRecent = Math.min(...recentInjuries.map(session => daysSince(session.date, latest)))
  const recency = clamp(1 - mostRecent / INJURY_LOOKBACK_DAYS)
  const frequency = clamp(recentInjuries.length / 3)
  return clamp(recency * 0.7 + frequency * 0.3)
}

function riskLabel(score) {
  if (score >= 75) return 'High Risk'
  if (score >= 50) return 'Elevated'
  if (score >= 25) return 'Moderate'
  return 'Low Risk'
}

function confidenceLabel(confidence, sessions) {
  if (sessions < 5) return 'Early signal'
  if (confidence >= 0.72) return 'High'
  if (confidence >= 0.45) return 'Moderate'
  return 'Low'
}

function getConfidence(sessions, latest) {
  const countScore = clamp(sessions.length / 12)
  const recentCount = getWindow(sessions, latest, 28).length
  const recentScore = clamp(recentCount / 8)
  return round(0.6 * countScore + 0.4 * recentScore)
}

function buildRecommendations(signals) {
  const recommendations = []

  if (signals.loadIncrease >= 0.35) {
    recommendations.push({
      key: 'load',
      text: 'Recent training load is above your recent baseline — consider reducing intensity or volume before another hard session.',
      tone: 'orange',
    })
  }

  if (signals.recovery >= 0.35) {
    recommendations.push({
      key: 'recovery',
      text: 'Several recent sessions are closely spaced — give your fingers and connective tissue more recovery between hard sessions.',
      tone: 'amber',
    })
  }

  if (signals.highIntensity >= 0.55) {
    recommendations.push({
      key: 'intensity',
      text: 'Recent sessions have been consistently high effort — consider inserting a lower-intensity or technique-focused day.',
      tone: 'orange',
    })
  }

  if (signals.rpeSpike >= 0.4) {
    recommendations.push({
      key: 'rpe',
      text: 'Recent RPE is elevated compared with your earlier sessions — monitor fatigue before adding more intensity.',
      tone: 'amber',
    })
  }

  if (signals.crimpExposure >= 0.6) {
    recommendations.push({
      key: 'crimp',
      text: 'Crimp exposure is high recently — rotate grip types and avoid stacking another maximal finger session immediately.',
      tone: 'orange',
    })
  }

  if (signals.injuryHistory >= 0.35) {
    recommendations.push({
      key: 'injury',
      text: 'A recent injury flag is contributing to the risk score — treat it as a recovery signal rather than pushing through worsening symptoms.',
      tone: 'red',
    })
  }

  if (!recommendations.length) {
    recommendations.push({
      key: 'balanced',
      text: 'Recent training signals look relatively balanced — continue monitoring recovery, intensity, and recurring injury patterns.',
      tone: 'green',
    })
  }

  return recommendations
}

export function analyzeInjuryRisk(sessions = []) {
  const valid = sessions.filter(session => session?.date)
  if (!valid.length) {
    return {
      score: 0,
      label: 'Low Risk',
      confidence: 0,
      confidenceLabel: 'Early signal',
      signals: [],
      recommendations: [],
      latestDate: null,
    }
  }

  const latest = latestTimestamp(valid)
  const signalValues = {
    loadIncrease: loadIncreaseSignal(valid, latest),
    recovery: recoverySignal(valid, latest),
    highIntensity: highIntensitySignal(valid, latest),
    rpeSpike: rpeSpikeSignal(valid, latest),
    crimpExposure: crimpExposureSignal(valid, latest),
    injuryHistory: injuryHistorySignal(valid, latest),
  }

  const score = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + signalValues[key] * weight, 0) * 100
  )

  const confidence = getConfidence(valid, latest)

  const signalMeta = [
    ['loadIncrease', 'Recent load increase'],
    ['recovery', 'Short recovery windows'],
    ['highIntensity', 'High-intensity sessions'],
    ['rpeSpike', 'RPE spike'],
    ['crimpExposure', 'Recent crimp exposure'],
    ['injuryHistory', 'Recent injury history'],
  ]

  const signals = signalMeta
    .map(([key, label]) => ({ key, label, value: round(signalValues[key]), active: signalValues[key] >= 0.25 }))
    .sort((a, b) => b.value - a.value)

  return {
    score: Math.min(score, 100),
    label: riskLabel(score),
    confidence,
    confidenceLabel: confidenceLabel(confidence, valid.length),
    signals,
    recommendations: buildRecommendations(signalValues),
    latestDate: new Date(latest).toISOString().slice(0, 10),
  }
}
