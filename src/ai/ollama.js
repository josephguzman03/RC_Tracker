const OLLAMA_URL = 'http://localhost:11434'
export const DEFAULT_OLLAMA_MODEL = 'llama3.2:3b'

async function request(path, options = {}, timeoutMs = 30000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${OLLAMA_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Ollama returned ${response.status}${detail ? `: ${detail}` : ''}`)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Ollama request timed out. The local model may still be loading.')
    }
    if (error instanceof TypeError) {
      throw new Error('Ollama is not reachable at localhost:11434. Start Ollama and try again.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkOllama(model = DEFAULT_OLLAMA_MODEL) {
  try {
    const data = await request('/api/tags', {}, 5000)
    const models = data?.models || []
    const available = models.some(item => item.name === model || item.model === model)
    return { available: true, modelAvailable: available, model }
  } catch (error) {
    return { available: false, modelAvailable: false, model, error: error.message }
  }
}

export async function chatWithOllama({
  messages,
  model = DEFAULT_OLLAMA_MODEL,
  temperature = 0.1,
  timeoutMs = 60000,
  format = 'json',
}) {
  const payload = {
    model,
    messages,
    stream: false,
    options: { temperature },
  }

  // Mood/prediction extraction still defaults to structured JSON.
  // The coach passes format: null so Ollama can return normal conversational text.
  if (format) payload.format = format

  const data = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, timeoutMs)

  const content = data?.message?.content
  if (!content) throw new Error('Ollama returned an empty response.')
  return content
}

export function parseJsonResponse(content) {
  if (typeof content !== 'string') throw new Error('Ollama response was not text.')

  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new Error('Ollama returned invalid JSON.')
  }
}
