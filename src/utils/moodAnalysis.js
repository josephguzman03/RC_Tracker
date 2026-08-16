import { chatWithOllama, DEFAULT_OLLAMA_MODEL, parseJsonResponse } from '../ai/ollama'

export const ENERGY_MAP = {
  positive: ['strong', 'fresh', 'great', 'good', 'solid', 'light', 'powerful', 'motivated', 'confident', 'dialed', 'crispy', 'locked', 'flowing', 'on', 'sharp'],
  negative: ['tired', 'pumped', 'weak', 'heavy', 'scared', 'anxious', 'distracted', 'off', 'sore', 'dread', 'forced', 'stiff', 'slow', 'burnt', 'mechanical'],
  neutral: ['okay', 'fine', 'average', 'normal', 'decent', 'moderate', 'alright'],
}

export const THEME_MAP = {
  fear: ['scared', 'fear', 'anxious', 'nervous', 'hesitant', 'panic', 'terrified'],
  burnout: ['dread', 'forced', 'mechanical', 'burnt', 'unmotivated', 'bored', 'hollow'],
  physical: ['pumped', 'sore', 'tired', 'heavy', 'stiff', 'tight', 'weak'],
  flow: ['flowing', 'dialed', 'locked', 'crispy', 'sharp', 'on', 'smooth'],
  progress: ['clicked', 'breakthrough', 'finally', 'got', 'stuck', 'sent', 'worked'],
}

const clamp = (value, min = 0, max = 100) => Math.min(Math.max(value, min), max)

export function scoreNote(note) {
  if (!note) return { score: 50, sentiment: 'neutral', themes: [] }
  const words = note.toLowerCase().split(/\W+/)
  const pos = words.filter(word => ENERGY_MAP.positive.includes(word)).length
  const neg = words.filter(word => ENERGY_MAP.negative.includes(word)).length
  const themes = Object.entries(THEME_MAP)
    .filter(([, keywords]) => words.some(word => keywords.includes(word)))
    .map(([theme]) => theme)
  const score = clamp(50 + pos * 12 - neg * 12)
  const sentiment = score >= 62 ? 'positive' : score <= 38 ? 'negative' : 'neutral'
  return { score, sentiment, themes }
}

function recentNotes(sessions, limit = 8) {
  return [...sessions]
    .filter(session => session?.notes?.trim())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)
    .map((session, index) => ({
      id: index + 1,
      date: session.date,
      gym: session.gym,
      grade: session.grade,
      sent: Boolean(session.sent),
      attempts: session.attempts,
      rpe: session.rpe,
      style: session.style,
      wallAngle: session.wallAngle,
      notes: session.notes,
      baselineMood: scoreNote(session.notes),
    }))
}

const SYSTEM_PROMPT = `You are a local climbing-performance NLP assistant. Analyze climbing session notes conservatively and return ONLY valid JSON matching the requested schema. Do not diagnose medical conditions. Separate emotional mood from physical performance. Do not invent facts that are not supported by the notes. Scores are 0-100. Use null when there is not enough evidence.`

function buildPrompt(rows) {
  return `Analyze these recent climbing sessions. The baselineMood field is a simple keyword-based signal; use it as context, not as truth.

Return exactly this JSON shape:
{
  "overallMoodScore": number,
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "confidence": number,
  "emotions": {
    "frustration": number,
    "confidence": number,
    "fear": number,
    "motivation": number,
    "satisfaction": number,
    "anxiety": number
  },
  "physicalState": "fresh" | "normal" | "fatigued" | "sore" | "mixed" | null,
  "mentalState": "confident" | "focused" | "frustrated" | "anxious" | "unmotivated" | "mixed" | "neutral" | null,
  "performanceBarrier": "none" | "technique" | "strength" | "fear" | "commitment" | "pacing" | "fatigue" | "skin" | "beta" | "confidence" | "mixed" | null,
  "themes": [string],
  "mentalPerformanceImpact": "low" | "moderate" | "high" | "unclear",
  "summary": string
}

Rules:
- sentiment describes the emotional tone, not whether the climber succeeded.
- A failed session can still have positive mood and a successful session can still have negative mood.
- performanceBarrier should only be selected when the notes provide evidence.
- confidence is confidence in this analysis, not the climber's confidence.
- Keep summary under 45 words.

Sessions:
${JSON.stringify(rows, null, 2)}`
}

function normalizeAnalysis(raw, rows) {
  const clampScore = value => value == null ? null : clamp(Number(value) || 0)
  const allowed = (value, choices, fallback = null) => choices.includes(value) ? value : fallback
  const emotions = raw?.emotions || {}

  return {
    overallMoodScore: clampScore(raw?.overallMoodScore) ?? Math.round(rows.reduce((sum, row) => sum + row.baselineMood.score, 0) / Math.max(rows.length, 1)),
    sentiment: allowed(raw?.sentiment, ['positive', 'neutral', 'negative', 'mixed'], 'neutral'),
    confidence: clampScore(raw?.confidence) ?? 50,
    emotions: {
      frustration: clampScore(emotions.frustration) ?? 0,
      confidence: clampScore(emotions.confidence) ?? 0,
      fear: clampScore(emotions.fear) ?? 0,
      motivation: clampScore(emotions.motivation) ?? 0,
      satisfaction: clampScore(emotions.satisfaction) ?? 0,
      anxiety: clampScore(emotions.anxiety) ?? 0,
    },
    physicalState: allowed(raw?.physicalState, ['fresh', 'normal', 'fatigued', 'sore', 'mixed'], null),
    mentalState: allowed(raw?.mentalState, ['confident', 'focused', 'frustrated', 'anxious', 'unmotivated', 'mixed', 'neutral'], null),
    performanceBarrier: allowed(raw?.performanceBarrier, ['none', 'technique', 'strength', 'fear', 'commitment', 'pacing', 'fatigue', 'skin', 'beta', 'confidence', 'mixed'], null),
    themes: Array.isArray(raw?.themes) ? raw.themes.filter(item => typeof item === 'string').slice(0, 8) : [],
    mentalPerformanceImpact: allowed(raw?.mentalPerformanceImpact, ['low', 'moderate', 'high', 'unclear'], 'unclear'),
    summary: typeof raw?.summary === 'string' ? raw.summary.trim() : 'No concise AI summary was returned.',
  }
}

export async function analyzeMoodWithOllama(sessions, model = DEFAULT_OLLAMA_MODEL) {
  const rows = recentNotes(sessions)
  if (!rows.length) throw new Error('No session notes are available for AI analysis.')

  const content = await chatWithOllama({
    model,
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(rows) },
    ],
    timeoutMs: 90000,
  })

  return {
    ...normalizeAnalysis(parseJsonResponse(content), rows),
    model,
    sessionsAnalyzed: rows.length,
    generatedAt: new Date().toISOString(),
  }
}

export function getMoodBaselineSummary(sessions) {
  const scored = sessions.filter(session => session?.notes?.trim()).map(session => scoreNote(session.notes))
  if (!scored.length) return { score: 50, sentiment: 'neutral', notes: 0 }
  const score = Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length)
  return {
    score,
    sentiment: score >= 62 ? 'positive' : score <= 38 ? 'negative' : 'neutral',
    notes: scored.length,
  }
}
