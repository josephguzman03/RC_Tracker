import { useEffect, useMemo, useRef, useState } from 'react'
import useClimberStats from '../hooks/useClimberStats'
import { askLocalCoach } from '../ai/coach'
import { buildCoachContext, getCoachContextChips } from '../ai/coachContext'
import { checkOllama, DEFAULT_OLLAMA_MODEL } from '../ai/ollama'
import './AICoach.css'

const QUICK_PROMPTS = [
  'What should I train next?',
  'What is holding me back right now?',
  'How should I approach my next session?',
  'Am I progressing toward my next grade?',
]

function statusCopy(status) {
  if (status === 'checking') return 'Checking local AI…'
  if (status === 'online') return DEFAULT_OLLAMA_MODEL
  if (status === 'missing-model') return `${DEFAULT_OLLAMA_MODEL} not installed`
  return 'Offline'
}

export default function AICoach() {
  const { sessions, isReal } = useClimberStats()
  const context = useMemo(() => buildCoachContext(sessions), [sessions])
  const chips = useMemo(() => getCoachContextChips(context), [context])

  const [status, setStatus] = useState('checking')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const chatEndRef = useRef(null)

  const refreshStatus = async () => {
    setStatus('checking')
    const result = await checkOllama()
    if (!result.available) setStatus('offline')
    else if (!result.modelAvailable) setStatus('missing-model')
    else setStatus('online')
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (rawQuestion = input) => {
    const question = String(rawQuestion || '').trim()
    if (!question || loading || status !== 'online') return

    const priorHistory = messages.map(message => ({ role: message.role, content: message.content }))
    const userMessage = { id: crypto.randomUUID?.() || `${Date.now()}-user`, role: 'user', content: question }

    setMessages(current => [...current, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const answer = await askLocalCoach({
        question,
        context,
        history: priorHistory,
      })

      setMessages(current => [
        ...current,
        { id: crypto.randomUUID?.() || `${Date.now()}-assistant`, role: 'assistant', content: answer },
      ])
    } catch (err) {
      setError(err?.message || 'The local coach could not answer that question.')
      const result = await checkOllama()
      if (!result.available) setStatus('offline')
      else if (!result.modelAvailable) setStatus('missing-model')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const ready = status === 'online'

  return (
    <div className="coach-page">
      <div className="coach-header">
        <div>
          <p className="coach-eyebrow">{isReal ? 'Local AI · Live Data' : 'Local AI · Sample Data'}</p>
          <h1 className="coach-title">AI Coach</h1>
        </div>

        <button className="ollama-status ollama-status--button" type="button" onClick={refreshStatus} disabled={status === 'checking'} title="Recheck Ollama">
          <span className={`ollama-dot ${ready ? 'on' : status === 'checking' ? 'checking' : 'off'}`} />
          <span className="ollama-label">{statusCopy(status)}</span>
        </button>
      </div>

      {!ready && (
        <div className="coach-offline-banner">
          <p className="coach-offline-title">
            {status === 'checking' ? 'Checking your local model' : status === 'missing-model' ? 'Model not found' : 'Local AI is offline'}
          </p>
          <p className="coach-offline-steps">
            {status === 'missing-model'
              ? <>Ollama is running, but <code>{DEFAULT_OLLAMA_MODEL}</code> is not installed. Your non-AI analytics still work normally.</>
              : status === 'offline'
                ? <>Start Ollama on this computer, then click the status pill to reconnect. Your tracker data and deterministic analytics remain available while AI is offline.</>
                : 'Connecting to Ollama at localhost:11434…'}
          </p>
        </div>
      )}

      <div className="coach-body">
        <div className="coach-context-bar">
          <span className="context-label">Coach context</span>
          <div className="context-chips">
            {chips.map(chip => <span className="context-chip" key={chip}>{chip}</span>)}
          </div>
        </div>

        <div className="chat-window" aria-live="polite">
          {!messages.length && !loading ? (
            <div className="chat-empty">
              <p className="chat-empty-title">Ask about your climbing data</p>
              <p className="chat-empty-sub">The coach uses your prediction, load risk, gym calibration, mood baseline, and recent sessions.</p>
            </div>
          ) : messages.map(message => (
            <div key={message.id} className={`chat-msg chat-msg--${message.role}`}>
              <span className="chat-msg-role">{message.role === 'user' ? 'You' : 'Local Coach'}</span>
              <div className="chat-msg-text">{message.content}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-msg chat-msg--assistant">
              <span className="chat-msg-role">Local Coach</span>
              <div className="chat-typing" aria-label="Coach is thinking"><span /><span /><span /></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {error && <div className="chat-error">{error}</div>}

        <div className="quick-prompts">
          {QUICK_PROMPTS.map(prompt => (
            <button key={prompt} className="quick-prompt-btn" type="button" disabled={!ready || loading} onClick={() => sendMessage(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            rows="2"
            value={input}
            disabled={!ready || loading}
            onChange={event => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ready ? 'Ask about your progress, next session, blockers, recovery…' : 'Local AI must be online to chat'}
          />
          <button className="chat-send-btn" type="button" disabled={!ready || loading || !input.trim()} onClick={() => sendMessage()} aria-label="Send message">
            ↑
          </button>
        </div>

        <p className="coach-disclaimer">Local analysis only · The coach interprets tracker signals and does not diagnose injuries.</p>
      </div>
    </div>
  )
}
