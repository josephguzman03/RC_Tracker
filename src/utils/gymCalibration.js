const MIN_SESSIONS = 5
const MIN_CONFIDENCE_SESSIONS = 12
const HALF_LIFE_DAYS = 90
const MAX_DELTA = 1.5

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function safeAttempts(session) {
  return Math.max(Number(session.attempts) || 1, 1)
}

function performanceOffset(session) {
  const attempts = safeAttempts(session)
  const attemptPenalty = 0.08 * Math.log2(attempts)

  // A send is evidence that the climber was above the posted grade;
  // a failure is evidence that the posted grade was above their current level.
  const raw = session.sent
    ? 0.25 - attemptPenalty
    : -0.12 - attemptPenalty

  return clamp(raw, -0.5, 0.25)
}

function contextKey(session) {
  return `${session.style || 'unknown'}::${session.sessionType || 'unknown'}`
}

function getSessionWeight(session, latestTime) {
  const ageDays = Math.max((latestTime - new Date(session.date).getTime()) / 86400000, 0)
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS)
}

function weightedMean(rows) {
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0)
  if (!totalWeight) return 0
  return rows.reduce((sum, row) => sum + row.value * row.weight, 0) / totalWeight
}

function buildContextBaselines(sessions) {
  const overall = weightedMean(
    sessions.map(session => ({
      value: performanceOffset(session),
      weight: 1,
    }))
  )

  const groups = sessions.reduce((acc, session) => {
    const key = contextKey(session)
    if (!acc[key]) acc[key] = []
    acc[key].push(performanceOffset(session))
    return acc
  }, {})

  return { overall, groups }
}

function getExpectedOffset(session, baselines) {
  const values = baselines.groups[contextKey(session)]

  // Require a little evidence before allowing a context to override the
  // overall baseline. This keeps small datasets from producing noisy ratings.
  if (!values || values.length < 3) return baselines.overall

  const contextMean = values.reduce((sum, value) => sum + value, 0) / values.length
  const contextWeight = Math.min(values.length / 8, 1)
  return baselines.overall + (contextMean - baselines.overall) * contextWeight
}

function getCalibrationLabel(delta, confidence, sessions) {
  if (sessions < MIN_SESSIONS) return 'Early signal'
  if (confidence < 0.45) return 'Emerging pattern'
  if (delta >= 0.35) return 'Sandbagged'
  if (delta >= 0.15) return 'Hard'
  if (delta <= -0.35) return 'Soft'
  return 'Fair'
}

function getConfidence(sessionCount, weightShare, spread) {
  const sampleScore = Math.min(sessionCount / MIN_CONFIDENCE_SESSIONS, 1)
  const weightScore = Math.min(weightShare * 2, 1)
  const stabilityScore = 1 / (1 + spread)
  return clamp(0.55 * sampleScore + 0.25 * weightScore + 0.20 * stabilityScore, 0, 1)
}

function confidenceLabel(confidence, sessions) {
  if (sessions < MIN_SESSIONS) return 'Low'
  if (confidence >= 0.72) return 'High'
  if (confidence >= 0.45) return 'Moderate'
  return 'Low'
}

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals))
}

export function getGymSandbagRatings(sessions) {
  if (!sessions?.length) return []

  const valid = sessions.filter(session =>
    session.gym && Number.isFinite(Number(session.grade)) && session.date
  )

  if (!valid.length) return []

  const latestTime = Math.max(...valid.map(session => new Date(session.date).getTime()))
  const baselines = buildContextBaselines(valid)

  const enriched = valid.map(session => {
    const weight = getSessionWeight(session, latestTime)
    const actual = performanceOffset(session)
    const expected = getExpectedOffset(session, baselines)

    return {
      ...session,
      weight,
      residual: actual - expected,
    }
  })

  const totalWeight = enriched.reduce((sum, session) => sum + session.weight, 0)
  const overallMeanResidual = weightedMean(
    enriched.map(session => ({ value: session.residual, weight: session.weight }))
  )

  const byGym = enriched.reduce((acc, session) => {
    if (!acc[session.gym]) acc[session.gym] = []
    acc[session.gym].push(session)
    return acc
  }, {})

  return Object.entries(byGym)
    .map(([gym, gymSessions]) => {
      const gymWeight = gymSessions.reduce((sum, session) => sum + session.weight, 0)
      const rawDelta = weightedMean(
        gymSessions.map(session => ({ value: session.residual, weight: session.weight }))
      ) - overallMeanResidual

      const shrinkage = gymSessions.length / (gymSessions.length + 6)
      const difficultyDelta = clamp(rawDelta * shrinkage, -MAX_DELTA, MAX_DELTA)

      const weightedMeanResidualForGym = weightedMean(
        gymSessions.map(session => ({ value: session.residual, weight: session.weight }))
      )
      const spread = Math.sqrt(
        weightedMean(
          gymSessions.map(session => ({
            value: Math.pow(session.residual - weightedMeanResidualForGym, 2),
            weight: session.weight,
          }))
        )
      )

      const confidence = getConfidence(
        gymSessions.length,
        totalWeight ? gymWeight / totalWeight : 0,
        spread
      )

      const sent = gymSessions.filter(session => session.sent).length
      const sentGrades = gymSessions.filter(session => session.sent).map(session => session.grade)
      const avgGrade = sentGrades.length
        ? sentGrades.reduce((sum, grade) => sum + grade, 0) / sentGrades.length
        : gymSessions.reduce((sum, session) => sum + session.grade, 0) / gymSessions.length

      const strongestContexts = gymSessions.reduce((acc, session) => {
        const key = contextKey(session)
        if (!acc[key]) acc[key] = { residual: 0, weight: 0, style: session.style, sessionType: session.sessionType }
        acc[key].residual += session.residual * session.weight
        acc[key].weight += session.weight
        return acc
      }, {})

      const strongestContext = Object.values(strongestContexts)
        .filter(context => context.weight > 0)
        .map(context => ({
          ...context,
          residual: context.residual / context.weight,
        }))
        .sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual))[0]

      return {
        gym,
        sessions: gymSessions.length,
        sendRate: round(sent / gymSessions.length),
        avgGrade: round(avgGrade, 1),
        difficultyDelta: round(difficultyDelta),
        calibration: getCalibrationLabel(difficultyDelta, confidence, gymSessions.length),
        confidence: round(confidence),
        confidenceLabel: confidenceLabel(confidence, gymSessions.length),
        strongestContext: strongestContext
          ? {
              style: strongestContext.style,
              sessionType: strongestContext.sessionType,
              effect: round(strongestContext.residual),
            }
          : null,
      }
    })
    .sort((a, b) => b.difficultyDelta - a.difficultyDelta)
}
