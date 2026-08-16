import { chatWithOllama, DEFAULT_OLLAMA_MODEL } from './ollama'

const SYSTEM_PROMPT = `You are the narrative layer for a private local rock-climbing progress tracker.
The analytics supplied to you are the source of truth. Do not recalculate them and do not invent sends, grades, injuries, or trends.
A decimal ability such as V3.6 is the tracker's continuous progression score: V3 is established with evidence toward V4. It is not an official V-scale grade.
Write a concise progress-report summary in 2 short paragraphs. Cover: current progression, strongest positive signal, main limiter or risk, and one practical next-block focus.
Do not diagnose injuries. If an injury/risk signal exists, describe training-load or recovery considerations and advise appropriate professional evaluation for persistent or worsening symptoms.
Use plain text only, no markdown headings or bullet points.`

export async function generateReportInsight(reportData, model = DEFAULT_OLLAMA_MODEL) {
  if (!reportData) throw new Error('No report data is available.')
  return chatWithOllama({
    model,
    temperature: 0.2,
    timeoutMs: 90000,
    format: null,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Create the report summary from this local analytics snapshot:\n${JSON.stringify(reportData)}` },
    ],
  })
}
