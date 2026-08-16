import { buildPrediction } from './prediction'
import { analyzeInjuryRisk } from './injuryRisk'
import { getGymSandbagRatings } from './gymCalibration'
import { getMoodBaselineSummary } from './moodAnalysis'
import { getSessionArchetypes } from './sessionArchetypes'
import { detectStyleNemesis } from './styleNemesis'

const asTime = value => {
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

const pct = value => Math.round((Number(value) || 0) * 100)

function datasetSummary(sessions) {
  const valid = sessions.filter(s => s?.date)
  const chronological = [...valid].sort((a, b) => asTime(a.date) - asTime(b.date))
  const sent = valid.filter(s => s.sent)
  const highest = sent.length ? Math.max(...sent.map(s => Number(s.grade) || 0)) : null
  return {
    sessions: valid.length,
    sends: sent.length,
    sendRate: valid.length ? Math.round((sent.length / valid.length) * 100) : 0,
    highestSend: highest,
    firstDate: chronological[0]?.date || null,
    latestDate: chronological.at(-1)?.date || null,
  }
}

function predictionSummary(pred) {
  if (!pred) return { mode: 'unavailable' }
  const base = {
    mode: pred.mode,
    currentAbility: pred.currentAbility,
    establishedGrade: pred.establishedGrade,
    nextGrade: pred.nextGrade,
    nextGradeProgress: pct(pred.gradeProgress),
    learning: pred.learning,
  }
  if (pred.mode !== 'prediction') return { ...base, reason: pred.reason || null }
  return {
    ...base,
    trajectory: pred.trajectory,
    confidence: pred.confidenceLabel,
    likelyTrack: pred.likelyTrack,
    projectedGrades: (pred.tracks?.[pred.likelyTrack] || []).map(p => ({ day: p.day, grade: p.grade })),
    drivers: (pred.drivers || []).slice(0, 5),
    blockers: (pred.blockers || []).slice(0, 4),
  }
}

function injurySummary(injury) {
  return {
    score: injury?.score || 0,
    label: injury?.label || 'Low Risk',
    confidence: injury?.confidenceLabel || 'Early signal',
    signals: (injury?.signals || []).filter(s => s.active).slice(0, 4),
    recommendations: (injury?.recommendations || []).slice(0, 3),
  }
}

function recentRows(sessions) {
  return [...sessions]
    .filter(s => s?.date)
    .sort((a, b) => asTime(b.date) - asTime(a.date))
    .slice(0, 8)
    .map(s => ({
      date: s.date,
      gym: s.gym || '—',
      grade: Number.isFinite(Number(s.grade)) ? `V${Number(s.grade)}` : '—',
      sent: Boolean(s.sent),
      attempts: Number(s.attempts) || 0,
      rpe: Number(s.rpe) || 0,
      style: s.style || '—',
    }))
}

export function buildProgressReportData(sessions = []) {
  const valid = Array.isArray(sessions) ? sessions.filter(Boolean) : []
  const prediction = buildPrediction(valid)
  const injury = analyzeInjuryRisk(valid)
  const gyms = getGymSandbagRatings(valid)
  const mood = getMoodBaselineSummary(valid)
  const archetypes = getSessionArchetypes(valid)
  const nemesis = detectStyleNemesis(valid)

  return {
    generatedAt: new Date().toISOString(),
    dataset: datasetSummary(valid),
    prediction: predictionSummary(prediction),
    injury: injurySummary(injury),
    mood,
    gyms: gyms.slice(0, 6),
    archetypes: {
      dominant: archetypes.dominant,
      referenceGrade: archetypes.referenceGrade,
      summary: archetypes.summary.slice(0, 6),
    },
    style: {
      nemesis: nemesis.nemesis,
      strength: nemesis.strength,
      currentAbility: nemesis.currentAbility,
    },
    recentSessions: recentRows(valid),
  }
}
