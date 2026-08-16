import { getGymSandbagRatings } from '../utils/gymCalibration'
import { analyzeInjuryRisk } from '../utils/injuryRisk'
import { getMoodBaselineSummary } from '../utils/moodAnalysis'
import { buildPrediction } from '../utils/prediction'

const clampText = (value, max = 120) => {
  const text = String(value || '').trim().replace(/\s+/g, ' ')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function safeDate(value) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function recentSessions(sessions = [], limit = 8) {
  return [...sessions]
    .filter(session => session?.date)
    .sort((a, b) => safeDate(b.date) - safeDate(a.date))
    .slice(0, limit)
    .map(session => ({
      date: session.date,
      gym: session.gym || null,
      grade: Number.isFinite(Number(session.grade)) ? `V${Number(session.grade)}` : null,
      sent: Boolean(session.sent),
      attempts: Number(session.attempts) || null,
      rpe: Number(session.rpe) || null,
      style: session.style || null,
      wallAngle: Number(session.wallAngle) || null,
      sessionType: session.sessionType || null,
      holds: Array.isArray(session.holds) ? session.holds.slice(0, 5) : [],
      injuryFlag: session.injuryFlag && session.injuryFlag !== 'none' ? session.injuryFlag : null,
      notes: clampText(session.notes),
    }))
}

function predictionSummary(prediction) {
  if (!prediction) return { mode: 'unavailable' }

  if (prediction.mode === 'learning') {
    return {
      mode: 'learning',
      daysObserved: prediction.learning?.daysObserved || 0,
      daysRemaining: prediction.learning?.daysRemaining || 0,
      currentAbility: prediction.currentAbility,
      establishedGrade: prediction.establishedGrade,
      nextGrade: prediction.nextGrade,
      nextGradeProgress: Math.round((prediction.gradeProgress || 0) * 100),
    }
  }

  if (prediction.mode === 'insufficient') {
    return {
      mode: 'insufficient',
      currentAbility: prediction.currentAbility,
      establishedGrade: prediction.establishedGrade,
      nextGrade: prediction.nextGrade,
      nextGradeProgress: Math.round((prediction.gradeProgress || 0) * 100),
      reason: prediction.reason,
    }
  }

  const likely = prediction.tracks?.[prediction.likelyTrack] || []
  return {
    mode: 'prediction',
    currentAbility: prediction.currentAbility,
    establishedGrade: prediction.establishedGrade,
    nextGrade: prediction.nextGrade,
    nextGradeProgress: Math.round((prediction.gradeProgress || 0) * 100),
    trajectory: prediction.trajectory,
    likelyTrack: prediction.likelyTrack,
    confidence: prediction.confidence,
    confidenceLabel: prediction.confidenceLabel,
    injuryRisk: prediction.injuryRisk,
    sendRate: prediction.sendRate,
    efficiency: prediction.efficiency,
    recovery: prediction.recovery,
    consistency: prediction.consistency,
    volumePerWeek: prediction.volume,
    projectedGrades: likely.map(point => ({ day: point.day, ability: point.grade })),
    drivers: (prediction.drivers || []).slice(0, 5).map(driver => ({
      label: driver.label,
      direction: driver.direction,
      strength: driver.strength,
      detail: driver.detail,
    })),
    blockers: (prediction.blockers || []).slice(0, 5),
  }
}

function injurySummary(injury) {
  return {
    score: injury?.score || 0,
    label: injury?.label || 'Low Risk',
    confidence: injury?.confidenceLabel || 'Early signal',
    primarySignals: (injury?.signals || [])
      .filter(signal => signal.active)
      .slice(0, 4)
      .map(signal => ({ label: signal.label, value: Math.round(signal.value * 100) })),
    recommendations: (injury?.recommendations || []).slice(0, 3).map(item => item.text),
  }
}

export function buildCoachContext(sessions = []) {
  const valid = Array.isArray(sessions) ? sessions.filter(Boolean) : []
  const prediction = buildPrediction(valid)
  const injury = analyzeInjuryRisk(valid)
  const gyms = getGymSandbagRatings(valid)
  const mood = getMoodBaselineSummary(valid)

  const sent = valid.filter(session => session.sent)
  const highestSend = sent.length ? Math.max(...sent.map(session => Number(session.grade) || 0)) : null
  const sendRate = valid.length ? sent.length / valid.length : 0

  return {
    dataset: {
      sessions: valid.length,
      highestSend: highestSend ? `V${highestSend}` : null,
      overallSendRate: Math.round(sendRate * 100),
      firstDate: valid.length ? [...valid].sort((a, b) => safeDate(a.date) - safeDate(b.date))[0]?.date : null,
      latestDate: valid.length ? [...valid].sort((a, b) => safeDate(b.date) - safeDate(a.date))[0]?.date : null,
    },
    prediction: predictionSummary(prediction),
    injury: injurySummary(injury),
    mood: {
      baselineScore: mood.score,
      baselineSentiment: mood.sentiment,
      notesAnalyzed: mood.notes,
      note: 'Mood baseline is keyword-based unless the user separately ran the Mood Log Ollama analysis.',
    },
    gyms: gyms.slice(0, 6).map(gym => ({
      gym: gym.gym,
      sessions: gym.sessions,
      difficultyDelta: gym.difficultyDelta,
      calibration: gym.calibration,
      confidence: gym.confidenceLabel,
      strongestContext: gym.strongestContext,
    })),
    recentSessions: recentSessions(valid),
  }
}

export function getCoachContextChips(context) {
  if (!context) return []
  const chips = []
  const pred = context.prediction

  if (pred?.establishedGrade != null) chips.push(`Established V${pred.establishedGrade}`)
  if (pred?.nextGradeProgress != null && pred?.nextGrade != null) chips.push(`${pred.nextGradeProgress}% → V${pred.nextGrade}`)
  if (context.injury?.score != null) chips.push(`Risk ${context.injury.score}/100`)
  if (context.mood?.notesAnalyzed) chips.push(`Mood ${context.mood.baselineSentiment}`)
  if (context.dataset?.sessions) chips.push(`${context.dataset.sessions} sessions`)

  return chips.slice(0, 5)
}
