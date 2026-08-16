import { chatWithOllama, DEFAULT_OLLAMA_MODEL } from './ollama'

const SYSTEM_PROMPT = `You are a private local rock-climbing training coach inside a personal progress tracker.

Use the supplied analytics context as the source of truth. Do not invent sends, grades, injuries, trends, gym difficulty, or model confidence that are not in the context.

Important interpretation rules:
- "currentAbility" can be fractional. V3.6 means the tracker's continuous evidence score between an established V3 and V4; it is not an official climbing grade.
- "establishedGrade" is the grade supported by repeated performance evidence.
- Future projected ability is a model estimate, not a promise of a send.
- During prediction mode "learning", explain that the model is still collecting its first 30 days and do not fabricate a future projection.
- Gym difficulty deltas are personalized to this climber, not objective statements about the gym.
- Injury risk is a training-load signal, not a medical diagnosis. Never diagnose an injury. If symptoms sound severe, worsening, or persistent, recommend appropriate professional evaluation without claiming a condition.
- Mood baseline may be a simple keyword signal; do not overstate its certainty.

Coaching style:
- Answer the user's actual question first.
- Be concise but useful: usually 2-5 short paragraphs or a few bullets when that is clearer.
- Tie recommendations to specific tracker signals when available.
- Prefer concrete next-session actions over generic climbing advice.
- Acknowledge uncertainty when data is sparse or confidence is low.
- Never claim to have observed anything outside the provided context.`

function serializeContext(context) {
  return JSON.stringify(context, null, 2)
}

export async function askLocalCoach({
  question,
  context,
  history = [],
  model = DEFAULT_OLLAMA_MODEL,
}) {
  const cleanQuestion = String(question || '').trim()
  if (!cleanQuestion) throw new Error('Ask the coach a question first.')

  const recentHistory = history
    .filter(message => message?.role === 'user' || message?.role === 'assistant')
    .slice(-6)
    .map(message => ({ role: message.role, content: String(message.content || '').slice(0, 1800) }))

  const contextMessage = `CURRENT TRACKER CONTEXT\n${serializeContext(context)}`

  const content = await chatWithOllama({
    model,
    temperature: 0.25,
    timeoutMs: 120000,
    format: null,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contextMessage },
      ...recentHistory,
      { role: 'user', content: cleanQuestion },
    ],
  })

  return content.trim()
}
