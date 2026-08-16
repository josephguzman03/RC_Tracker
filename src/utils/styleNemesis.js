import { getGymSandbagRatings } from './gymCalibration'
import { buildPrediction } from './prediction'

const MIN_SIGNAL = 3
const FULL_CONFIDENCE = 8
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const round = (value, decimals = 2) => Number(value.toFixed(decimals))

function safeAttempts(session) {
  return Math.max(Number(session.attempts) || 1, 1)
}

function gymMap(sessions) {
  return new Map(getGymSandbagRatings(sessions).map(row => [row.gym, row.difficultyDelta]))
}

function sessionPerformance(session, currentAbility, gymAdjustments) {
  const grade = Number(session.grade) || 0
  const gymDelta = gymAdjustments.get(session.gym) || 0
  const adjustedGrade = grade + gymDelta
  const gradeDelta = adjustedGrade - currentAbility
  const attempts = safeAttempts(session)
  const efficiency = clamp(1 - (attempts - 1) / 8, 0, 1)

  // The score is centered around zero so groups can be compared even when
  // the user climbs different posted grades in different styles.
  const outcome = session.sent ? 0.55 : -0.45
  const attemptEffect = session.sent ? efficiency * 0.22 : -(1 - efficiency) * 0.12
  const gradeEffect = clamp(gradeDelta * 0.22, -0.35, 0.35)

  return clamp(outcome + attemptEffect + gradeEffect, -1, 1)
}

function buildGroups(sessions, selector, currentAbility, gymAdjustments) {
  const groups = new Map()

  sessions.forEach(session => {
    const values = selector(session)
    values.filter(Boolean).forEach(value => {
      if (!groups.has(value.key)) groups.set(value.key, { ...value, rows: [] })
      groups.get(value.key).rows.push({
        session,
        score: sessionPerformance(session, currentAbility, gymAdjustments),
      })
    })
  })

  return [...groups.values()]
}

function summarizeGroup(group, overallMean) {
  const rows = group.rows
  const count = rows.length
  const sent = rows.filter(row => row.session.sent).length
  const mean = rows.reduce((sum, row) => sum + row.score, 0) / count
  const attempts = rows.reduce((sum, row) => sum + safeAttempts(row.session), 0) / count
  const avgGrade = rows.reduce((sum, row) => sum + Number(row.session.grade || 0), 0) / count
  const rawGap = mean - overallMean
  const shrinkage = count / (count + 5)
  const performanceGap = rawGap * shrinkage
  const sample = clamp(count / FULL_CONFIDENCE, 0, 1)
  const effect = clamp(Math.abs(performanceGap) / 0.35, 0, 1)
  const confidence = clamp(sample * 0.72 + effect * 0.28, 0, 1)

  return {
    key: group.key,
    label: group.label,
    type: group.type,
    sessions: count,
    sendRate: round(sent / count),
    avgAttempts: round(attempts, 1),
    avgGrade: round(avgGrade, 1),
    performanceGap: round(performanceGap),
    confidence: round(confidence),
    confidenceLabel: count < MIN_SIGNAL ? 'Early signal' : confidence >= 0.68 ? 'High' : confidence >= 0.42 ? 'Moderate' : 'Low',
  }
}

export function detectStyleNemesis(sessions = []) {
  const valid = sessions.filter(session => session?.date && Number.isFinite(Number(session.grade)))
  if (!valid.length) return { nemesis: null, strength: null, patterns: [], currentAbility: 0 }

  const prediction = buildPrediction(valid)
  const currentAbility = prediction?.currentAbility ?? Math.max(...valid.filter(s => s.sent).map(s => Number(s.grade)), 0)
  const gymAdjustments = gymMap(valid)
  const overallScores = valid.map(session => sessionPerformance(session, currentAbility, gymAdjustments))
  const overallMean = overallScores.reduce((sum, value) => sum + value, 0) / overallScores.length

  const styleGroups = buildGroups(valid, session => [{
    key: `style:${session.style || 'unknown'}`,
    label: `${session.style || 'Unknown'}`,
    type: 'Style',
  }], currentAbility, gymAdjustments)

  const holdGroups = buildGroups(valid, session => [...new Set(session.holds || [])].map(hold => ({
    key: `hold:${hold}`,
    label: hold,
    type: 'Hold',
  })), currentAbility, gymAdjustments)

  const comboGroups = buildGroups(valid, session => [...new Set(session.holds || [])].map(hold => ({
    key: `combo:${session.style || 'unknown'}:${hold}`,
    label: `${session.style || 'Unknown'} + ${hold}`,
    type: 'Style + Hold',
  })), currentAbility, gymAdjustments)

  const patterns = [...styleGroups, ...holdGroups, ...comboGroups]
    .map(group => summarizeGroup(group, overallMean))
    .filter(group => group.sessions >= 2)
    .sort((a, b) => a.performanceGap - b.performanceGap)

  // Prefer patterns with enough repeat observations. If the dataset is still
  // sparse, show the best early signal but label it accordingly.
  const reliable = patterns.filter(pattern => pattern.sessions >= MIN_SIGNAL)
  const pool = reliable.length ? reliable : patterns
  const nemesis = pool.find(pattern => pattern.performanceGap < -0.025) || null
  const strength = [...pool].reverse().find(pattern => pattern.performanceGap > 0.025) || null

  return {
    nemesis,
    strength,
    patterns,
    currentAbility: round(currentAbility, 1),
    baselinePerformance: round(overallMean),
  }
}
