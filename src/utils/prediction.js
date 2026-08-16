import { getGymSandbagRatings } from './gymCalibration'
import { analyzeInjuryRisk } from './injuryRisk'

const DAY = 86400000
const LEARNING_DAYS = 30
const HALF_LIFE_DAYS = 75
const TREND_WINDOW_DAYS = 140
const MIN_GRADE = 1
const MAX_GRADE = 15

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const round = (value, decimals = 2) => Number(value.toFixed(decimals))

function timestamp(value) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function validSessions(sessions = []) {
  return sessions
    .filter(session => timestamp(session?.date) !== null && Number.isFinite(Number(session?.grade)))
    .map(session => ({ ...session, grade: clamp(Number(session.grade), MIN_GRADE, MAX_GRADE) }))
    .sort((a, b) => timestamp(a.date) - timestamp(b.date))
}

function safeAttempts(session) {
  const attempts = Number(session?.attempts)
  return Number.isFinite(attempts) && attempts > 0 ? attempts : 1
}

function recencyWeight(date, latestTime, halfLife = HALF_LIFE_DAYS) {
  const age = Math.max(0, (latestTime - timestamp(date)) / DAY)
  return Math.pow(0.5, age / halfLife)
}

function weightedMean(rows) {
  const weight = rows.reduce((sum, row) => sum + row.weight, 0)
  if (!weight) return 0
  return rows.reduce((sum, row) => sum + row.value * row.weight, 0) / weight
}

function gymAdjustment(session, gymMap) {
  const gym = gymMap.get(session.gym)
  if (!gym) return 0
  return clamp(gym.difficultyDelta * gym.confidence * 0.65, -0.55, 0.55)
}

function normalizedGrade(session, gymMap) {
  return clamp(session.grade + gymAdjustment(session, gymMap), MIN_GRADE, MAX_GRADE)
}

function sendQuality(session) {
  const attempts = safeAttempts(session)
  if (!session.sent) return 0
  if (attempts <= 1) return 1
  if (attempts === 2) return 0.95
  if (attempts === 3) return 0.90
  if (attempts <= 5) return 0.82
  if (attempts <= 8) return 0.74
  return 0.66
}

function unsentEvidence(session) {
  // Without a high-point/progress field, failed attempts are deliberately weak evidence.
  // More attempts can indicate meaningful project exposure, but cannot prove move completion.
  const attempts = safeAttempts(session)
  if (attempts <= 1) return 0.06
  if (attempts <= 3) return 0.12
  if (attempts <= 6) return 0.19
  return 0.24
}

function sessionsNearGrade(sessions, grade, gymMap, tolerance = 0.55) {
  return sessions.filter(session => Math.abs(normalizedGrade(session, gymMap) - grade) <= tolerance)
}

function gradeStats(sessions, grade, gymMap, latestTime) {
  const rows = sessionsNearGrade(sessions, grade, gymMap)
  if (!rows.length) {
    return { grade, count: 0, sends: 0, weightedSendRate: 0, mastery: 0, nextEvidence: 0 }
  }

  const weighted = rows.map(session => {
    const weight = recencyWeight(session.date, latestTime, 60)
    return {
      session,
      weight,
      send: session.sent ? 1 : 0,
      mastery: session.sent ? sendQuality(session) : unsentEvidence(session) * 0.35,
      nextEvidence: session.sent ? sendQuality(session) : unsentEvidence(session),
    }
  })

  const sends = rows.filter(session => session.sent).length
  return {
    grade,
    count: rows.length,
    sends,
    weightedSendRate: weightedMean(weighted.map(row => ({ value: row.send, weight: row.weight }))),
    mastery: weightedMean(weighted.map(row => ({ value: row.mastery, weight: row.weight }))),
    nextEvidence: weightedMean(weighted.map(row => ({ value: row.nextEvidence, weight: row.weight }))),
  }
}

function findEstablishedGrade(sessions, gymMap, latestTime) {
  const sentGrades = sessions.filter(session => session.sent).map(session => normalizedGrade(session, gymMap))
  if (!sentGrades.length) return MIN_GRADE

  const maxObserved = clamp(Math.floor(Math.max(...sentGrades)), MIN_GRADE, MAX_GRADE)

  for (let grade = maxObserved; grade >= MIN_GRADE; grade -= 1) {
    const stats = gradeStats(sessions, grade, gymMap, latestTime)
    const established =
      stats.sends >= 3 ||
      (stats.sends >= 2 && stats.weightedSendRate >= 0.42) ||
      (stats.count >= 4 && stats.sends >= 2 && stats.mastery >= 0.56)

    if (established) return grade
  }

  // Early fallback: one hard send is evidence of capability, but not full mastery.
  return clamp(Math.floor(Math.max(...sentGrades)), MIN_GRADE, MAX_GRADE)
}

function abilityEvidence(sessions, gymMap, latestTime) {
  const establishedGrade = findEstablishedGrade(sessions, gymMap, latestTime)
  const nextGrade = Math.min(MAX_GRADE, establishedGrade + 1)
  const base = gradeStats(sessions, establishedGrade, gymMap, latestTime)
  const next = gradeStats(sessions, nextGrade, gymMap, latestTime)

  // Mastery of the established grade can move the climber through roughly the first third.
  // Direct evidence on the next grade is required for the rest of the progression score.
  const baseReadiness = clamp((base.mastery - 0.42) / 0.50, 0, 1)
  const nextExposure = clamp(next.count / 4, 0, 1)
  const nextSendBonus = clamp(next.sends / 3, 0, 1)
  const nextReadiness = clamp(next.nextEvidence * (0.55 + nextExposure * 0.20 + nextSendBonus * 0.25), 0, 1)

  let progress = clamp(baseReadiness * 0.30 + nextReadiness * 0.70, 0, 0.99)

  // If there is no direct next-grade exposure, do not imply near-readiness from easier climbs alone.
  if (!next.count) progress = Math.min(progress, 0.34)

  const currentAbility = establishedGrade >= MAX_GRADE
    ? MAX_GRADE
    : clamp(establishedGrade + progress, MIN_GRADE, MAX_GRADE)

  return {
    establishedGrade,
    nextGrade,
    progress: round(progress, 2),
    currentAbility: round(currentAbility, 2),
    evidence: {
      established: base,
      next,
    },
  }
}

function historicalAbilityPoints(sessions, gymMap, latestTime) {
  const recent = sessions.filter(session => latestTime - timestamp(session.date) <= TREND_WINDOW_DAYS * DAY)
  if (recent.length < 4) return []

  const firstTime = timestamp(recent[0].date)
  const points = []

  for (let cursor = firstTime + 30 * DAY; cursor <= latestTime; cursor += 14 * DAY) {
    const available = recent.filter(session => timestamp(session.date) <= cursor)
    if (available.length < 4) continue
    const evidence = abilityEvidence(available, gymMap, cursor)
    points.push({ x: (cursor - firstTime) / DAY, y: evidence.currentAbility })
  }

  const finalEvidence = abilityEvidence(recent, gymMap, latestTime)
  const finalPoint = { x: (latestTime - firstTime) / DAY, y: finalEvidence.currentAbility }
  if (!points.length || Math.abs(points.at(-1).x - finalPoint.x) > 2) points.push(finalPoint)

  return points
}

function regression(points) {
  if (points.length < 2) return { slope: 0, r2: 0 }
  const mx = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const my = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const numerator = points.reduce((sum, point) => sum + (point.x - mx) * (point.y - my), 0)
  const denominator = points.reduce((sum, point) => sum + Math.pow(point.x - mx, 2), 0)
  const slope = denominator ? numerator / denominator : 0
  const intercept = my - slope * mx
  const ssTotal = points.reduce((sum, point) => sum + Math.pow(point.y - my, 2), 0)
  const ssResidual = points.reduce((sum, point) => sum + Math.pow(point.y - (slope * point.x + intercept), 2), 0)
  const r2 = ssTotal ? clamp(1 - ssResidual / ssTotal, 0, 1) : 0
  return { slope, r2 }
}

function volumePerWeek(sessions, latestTime) {
  const recent = sessions.filter(session => latestTime - timestamp(session.date) <= 56 * DAY)
  if (!recent.length) return 0
  const earliest = Math.min(...recent.map(session => timestamp(session.date)))
  const observedWeeks = clamp((latestTime - earliest) / DAY / 7 + 1 / 7, 1, 8)
  return recent.length / observedWeeks
}

function recentSendRate(sessions, latestTime) {
  const recent = sessions.filter(session => latestTime - timestamp(session.date) <= 60 * DAY)
  if (!recent.length) return 0
  return weightedMean(recent.map(session => ({ value: session.sent ? 1 : 0, weight: recencyWeight(session.date, latestTime, 45) })))
}

function sendEfficiency(sessions, latestTime) {
  const recent = sessions.filter(session => latestTime - timestamp(session.date) <= 60 * DAY)
  if (!recent.length) return 0
  return weightedMean(recent.map(session => ({
    value: session.sent ? sendQuality(session) : unsentEvidence(session),
    weight: recencyWeight(session.date, latestTime, 45),
  })))
}

function recoveryScore(sessions, latestTime, injury) {
  const recent = sessions.filter(session => latestTime - timestamp(session.date) <= 35 * DAY)
  if (!recent.length) return 0.5

  const restRows = recent.map(session => ({
    value: clamp(Number(session.restDays || 0) / 2.5, 0, 1),
    weight: recencyWeight(session.date, latestTime, 28),
  }))
  const rpeRows = recent.map(session => ({
    value: clamp(1 - Math.max(0, Number(session.rpe || 5) - 6) / 5, 0, 1),
    weight: recencyWeight(session.date, latestTime, 28),
  }))
  const injuryPenalty = clamp((injury?.score || 0) / 100, 0, 1)
  return clamp(weightedMean(restRows) * 0.42 + weightedMean(rpeRows) * 0.33 + (1 - injuryPenalty) * 0.25, 0, 1)
}

function consistencyScore(sessions, latestTime) {
  const recent = sessions.filter(session => latestTime - timestamp(session.date) <= 56 * DAY)
  if (recent.length < 3) return 0.35

  const byWeek = new Map()
  for (const session of recent) {
    const date = new Date(session.date)
    date.setHours(0, 0, 0, 0)
    const mondayOffset = (date.getDay() + 6) % 7
    date.setDate(date.getDate() - mondayOffset)
    const key = date.toISOString().slice(0, 10)
    byWeek.set(key, (byWeek.get(key) || 0) + 1)
  }

  const counts = [...byWeek.values()]
  const mean = counts.reduce((sum, value) => sum + value, 0) / counts.length
  if (!mean) return 0
  const variance = counts.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / counts.length
  const cv = Math.sqrt(variance) / mean
  return clamp(1 - cv / 1.1, 0, 1)
}

function confidenceLabel(confidence) {
  if (confidence >= 0.78) return 'High'
  if (confidence >= 0.55) return 'Moderate'
  if (confidence >= 0.34) return 'Low'
  return 'Early signal'
}

function trajectoryLabel(monthlyTrend) {
  if (monthlyTrend > 0.08) return 'Improving'
  if (monthlyTrend < -0.08) return 'Regressing'
  return 'Stable'
}

function driverStrength(value) {
  const abs = Math.abs(value)
  if (abs >= 0.72) return 'strong'
  if (abs >= 0.45) return 'moderate'
  return 'slight'
}

function buildDrivers({ monthlyTrend, sendRate, efficiency, consistency, recovery, injuryRisk, volume, gradeProgress }) {
  const trendValue = clamp(monthlyTrend / 0.35, -1, 1)
  const sendValue = clamp((sendRate - 0.5) / 0.38, -1, 1)
  const efficiencyValue = clamp((efficiency - 0.55) / 0.35, -1, 1)
  const consistencyValue = clamp((consistency - 0.55) / 0.45, -1, 1)
  const recoveryValue = clamp((recovery - 0.55) / 0.45, -1, 1)
  const riskValue = -clamp((injuryRisk - 25) / 60, 0, 1)
  const volumeValue = volume < 1.5 ? -clamp((1.5 - volume) / 1.5, 0, 1) : volume > 4.5 ? -clamp((volume - 4.5) / 2.5, 0, 1) : clamp((volume - 1.5) / 3, 0, 0.55)
  const progressValue = clamp((gradeProgress - 0.35) / 0.65, -0.4, 1)

  const specs = [
    ['Next-grade evidence', progressValue, `${Math.round(gradeProgress * 100)}% progression toward the next established grade`],
    ['Recent performance trend', trendValue, `${monthlyTrend >= 0 ? '+' : ''}${monthlyTrend.toFixed(2)} grades/month`],
    ['Send rate', sendValue, `${Math.round(sendRate * 100)}% recent weighted send rate`],
    ['Send efficiency', efficiencyValue, `${Math.round(efficiency * 100)}% attempt efficiency score`],
    ['Training consistency', consistencyValue, `${Math.round(consistency * 100)}% consistency score`],
    ['Recovery', recoveryValue, `${Math.round(recovery * 100)}% recovery score`],
    ['Injury / load risk', riskValue, `${Math.round(injuryRisk)} / 100 risk score`],
    ['Training volume', volumeValue, `${volume.toFixed(1)} sessions/week`],
  ]

  return specs
    .map(([label, value, detail]) => ({
      label,
      value: round(value),
      detail,
      direction: value >= 0 ? 'positive' : 'negative',
      strength: driverStrength(value),
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

function buildBlockers({ injuryRisk, recovery, consistency, sendRate, efficiency, volume, evidence }) {
  const blockers = []
  if (injuryRisk >= 55) blockers.push({ label: 'Elevated injury / load risk', detail: `${Math.round(injuryRisk)}/100 risk is limiting the aggressive projection.` })
  if (recovery < 0.42) blockers.push({ label: 'Recovery is lagging', detail: 'Recent rest and RPE signals suggest less adaptation capacity.' })
  if (consistency < 0.42) blockers.push({ label: 'Training consistency', detail: 'Week-to-week session frequency is uneven enough to lower prediction confidence.' })
  if (sendRate < 0.38) blockers.push({ label: 'Low recent send rate', detail: `${Math.round(sendRate * 100)}% recent send rate makes upward grade movement less certain.` })
  if (efficiency < 0.40) blockers.push({ label: 'Attempt efficiency', detail: 'Recent sends are taking more attempts, or unsent sessions dominate the recent history.' })
  if (volume < 1.25) blockers.push({ label: 'Low training volume', detail: `${volume.toFixed(1)} sessions/week gives the model less evidence of sustained adaptation.` })
  if (evidence.next.count === 0) blockers.push({ label: 'No next-grade exposure', detail: `There are no recent V${evidence.next.grade} observations, so progression is capped until you test that grade.` })
  return blockers
}

function learningState(sessions) {
  if (!sessions.length) return { daysObserved: 0, daysRemaining: LEARNING_DAYS, progress: 0, sessionCount: 0, complete: false }
  const first = timestamp(sessions[0].date)
  const latest = timestamp(sessions.at(-1).date)
  const daysObserved = Math.max(1, Math.floor((latest - first) / DAY) + 1)
  const progress = clamp(daysObserved / LEARNING_DAYS, 0, 1)
  return {
    daysObserved,
    daysRemaining: Math.max(0, LEARNING_DAYS - daysObserved),
    progress: round(progress, 3),
    sessionCount: sessions.length,
    complete: daysObserved >= LEARNING_DAYS,
  }
}

export function buildPrediction(sessions = []) {
  const clean = validSessions(sessions)
  if (!clean.length) return null

  const learning = learningState(clean)
  const latestTime = timestamp(clean.at(-1).date)
  const gymRatings = getGymSandbagRatings(clean)
  const gymMap = new Map(gymRatings.map(gym => [gym.gym, gym]))
  const ability = abilityEvidence(clean, gymMap, latestTime)

  // The first 30 calendar days are baseline collection only. We can show what the
  // model has learned, but we deliberately do not produce a future projection yet.
  if (!learning.complete) {
    return {
      mode: 'learning',
      learning,
      currentAbility: ability.currentAbility,
      establishedGrade: ability.establishedGrade,
      nextGrade: ability.nextGrade,
      gradeProgress: ability.progress,
      evidence: ability.evidence,
    }
  }

  if (clean.length < 4) {
    return {
      mode: 'insufficient',
      learning,
      currentAbility: ability.currentAbility,
      establishedGrade: ability.establishedGrade,
      nextGrade: ability.nextGrade,
      gradeProgress: ability.progress,
      evidence: ability.evidence,
      reason: 'The 30-day baseline is complete, but at least 4 usable sessions are needed for a projection.',
    }
  }

  const injury = analyzeInjuryRisk(clean)
  const injuryRisk = Number(injury?.score || 0)
  const volume = volumePerWeek(clean, latestTime)
  const sendRate = recentSendRate(clean, latestTime)
  const efficiency = sendEfficiency(clean, latestTime)
  const recovery = recoveryScore(clean, latestTime, injury)
  const consistency = consistencyScore(clean, latestTime)

  const trendPoints = historicalAbilityPoints(clean, gymMap, latestTime)
  const trend = regression(trendPoints)
  const rawMonthlyTrend = trend.slope * 30
  const monthlyTrend = clamp(rawMonthlyTrend, -0.40, 0.55)
  const trajectory = trajectoryLabel(monthlyTrend)

  const dataConfidence = clamp((clean.length - 4) / 24, 0, 1)
  const historyConfidence = clamp((learning.daysObserved - LEARNING_DAYS) / 90, 0, 1)
  const trendConfidence = trendPoints.length >= 3 ? clamp(0.35 + trend.r2 * 0.65, 0, 1) : 0.25
  const nextEvidenceConfidence = clamp(ability.evidence.next.count / 4, 0, 1)
  const confidence = clamp(
    dataConfidence * 0.28 +
    historyConfidence * 0.18 +
    trendConfidence * 0.24 +
    consistency * 0.15 +
    nextEvidenceConfidence * 0.15,
    0,
    1,
  )

  const readiness = clamp(
    sendRate * 0.18 +
    efficiency * 0.16 +
    consistency * 0.15 +
    recovery * 0.16 +
    ability.progress * 0.25 +
    (1 - clamp(injuryRisk / 100, 0, 1)) * 0.10,
    0,
    1,
  )

  const likelyTrack = readiness >= 0.62 && monthlyTrend >= -0.02
    ? 'improve'
    : injuryRisk >= 68 || recovery < 0.28 || monthlyTrend < -0.16
      ? 'decline'
      : 'plateau'

  const growthBase = clamp(monthlyTrend, -0.12, 0.28)
  const improveMonthly = clamp(Math.max(0.06, growthBase) * (0.72 + readiness * 0.70), 0.04, 0.34)
  const plateauMonthly = clamp(growthBase * 0.18, -0.04, 0.05)
  const declineMonthly = -clamp(0.05 + injuryRisk / 100 * 0.16 + Math.max(0, 0.45 - recovery) * 0.18, 0.05, 0.28)

  const tracks = {
    improve: [30, 60, 90].map(day => ({ day, grade: round(clamp(ability.currentAbility + improveMonthly * (day / 30), MIN_GRADE, MAX_GRADE)) })),
    plateau: [30, 60, 90].map(day => ({ day, grade: round(clamp(ability.currentAbility + plateauMonthly * (day / 30), MIN_GRADE, MAX_GRADE)) })),
    decline: [30, 60, 90].map(day => ({ day, grade: round(clamp(ability.currentAbility + declineMonthly * (day / 30), MIN_GRADE, MAX_GRADE)) })),
  }

  const drivers = buildDrivers({ monthlyTrend, sendRate, efficiency, consistency, recovery, injuryRisk, volume, gradeProgress: ability.progress })
  const blockers = buildBlockers({ injuryRisk, recovery, consistency, sendRate, efficiency, volume, evidence: ability.evidence })

  return {
    mode: 'prediction',
    learning,
    currentAbility: ability.currentAbility,
    establishedGrade: ability.establishedGrade,
    nextGrade: ability.nextGrade,
    gradeProgress: ability.progress,
    evidence: ability.evidence,
    trajectory,
    confidence: round(confidence),
    confidenceLabel: confidenceLabel(confidence),
    injuryRisk: Math.round(injuryRisk),
    volume: round(volume, 1),
    sendRate: round(sendRate),
    efficiency: round(efficiency),
    recovery: round(recovery),
    consistency: round(consistency),
    monthlyTrend: round(monthlyTrend),
    likelyTrack,
    tracks,
    drivers,
    blockers,
  }
}
