import { checkOllama, chatWithOllama, parseJsonResponse, DEFAULT_OLLAMA_MODEL } from './ollama'

function compactPrediction(prediction) {
  return {
    currentAbility: prediction.currentAbility,
    trajectory: prediction.trajectory,
    monthlyTrend: prediction.monthlyTrend,
    confidence: prediction.confidence,
    confidenceLabel: prediction.confidenceLabel,
    likelyTrack: prediction.likelyTrack,
    projections: prediction.tracks[prediction.likelyTrack],
    metrics: {
      sendRate: prediction.sendRate,
      sessionsPerWeek: prediction.vol,
      recovery: prediction.recovery,
      injuryRisk: prediction.injuryRisk,
      sendEfficiency: prediction.efficiency,
      consistency: prediction.consistency,
    },
    drivers: prediction.drivers.slice(0, 5),
    blockers: prediction.blockers,
    data: prediction.data,
  }
}

export async function getPredictionInsight(prediction, model = DEFAULT_OLLAMA_MODEL) {
  if (!prediction) throw new Error('No prediction is available to explain.')

  const status = await checkOllama(model)
  if (!status.available) throw new Error(status.error || 'Ollama is not running.')
  if (!status.modelAvailable) throw new Error(`${model} is not installed in Ollama.`)

  const payload = compactPrediction(prediction)
  const messages = [
    {
      role: 'system',
      content: `You are a local climbing analytics interpreter. Explain a deterministic prediction model; do not recalculate grades, invent measurements, diagnose injuries, or overstate certainty. Treat the supplied numbers as source of truth. Return JSON only with this schema: {"summary":"2-3 concise sentences","why":"1-2 concise sentences about the strongest drivers","watch":"1 concise sentence about the most important blocker or uncertainty","confidenceNote":"1 concise sentence explaining how much trust to place in the projection"}.`,
    },
    {
      role: 'user',
      content: `Interpret this climbing prediction:\n${JSON.stringify(payload)}`,
    },
  ]

  const content = await chatWithOllama({ messages, model, temperature: 0.15, timeoutMs: 75000 })
  const parsed = parseJsonResponse(content)

  return {
    summary: String(parsed.summary || '').trim(),
    why: String(parsed.why || '').trim(),
    watch: String(parsed.watch || '').trim(),
    confidenceNote: String(parsed.confidenceNote || '').trim(),
    model,
  }
}
