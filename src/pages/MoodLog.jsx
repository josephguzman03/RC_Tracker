import { useMemo, useState } from 'react'
import useClimberStats from '../hooks/useClimberStats'
import { checkOllama, DEFAULT_OLLAMA_MODEL } from '../ai/ollama'
import { analyzeMoodWithOllama, getMoodBaselineSummary, scoreNote } from '../utils/moodAnalysis'
import './MoodLog.css'

const SENT_COLOR = { positive: '#4caf82', neutral: '#4fc3f7', negative: '#ff6b35', mixed: '#f59e0b' }
const THEME_COLOR = { fear: '#ef4444', burnout: '#ff6b35', physical: '#f59e0b', flow: '#4caf82', progress: '#4fc3f7' }

function MoodTimeline({ sessions }) {
  const scored = useMemo(() =>
    [...sessions].filter(s => s.notes).sort((a, b) => new Date(a.date) - new Date(b.date)).map(s => ({ ...s, mood: scoreNote(s.notes) }))
  , [sessions])

  if (!scored.length) return <p className="mood-empty">No session notes found — add notes to your Excel to unlock NLP analysis</p>

  const W = 800, H = 160, pad = { t: 16, r: 16, b: 24, l: 40 }
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b
  const pts = scored.map((s, i) => ({ x: pad.l + (i / Math.max(scored.length - 1, 1)) * iw, y: pad.t + (1 - s.mood.score / 100) * ih, ...s }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = pts.length > 1 ? line + ` L${pts.at(-1).x},${pad.t+ih} L${pts[0].x},${pad.t+ih} Z` : ''

  return (
    <div className="mood-timeline-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="mood-svg">
        {[25, 50, 75].map(v => {
          const y = pad.t + (1 - v / 100) * ih
          return <g key={v}>
            <line x1={pad.l} y1={y} x2={W-pad.r} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={pad.l-6} y={y+4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">{v}</text>
          </g>
        })}
        <path d={area} fill="rgba(79,195,247,0.06)" />
        <path d={line} fill="none" stroke="rgba(79,195,247,0.4)" strokeWidth="1.5" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill={SENT_COLOR[p.mood.sentiment]} opacity="0.9" />)}
      </svg>
      <div className="mood-cards">
        {scored.slice(-4).reverse().map((s, i) => (
          <div key={i} className="mood-card" style={{ borderLeftColor: SENT_COLOR[s.mood.sentiment] }}>
            <div className="mood-card-top">
              <span className="mood-card-date">{s.date}</span>
              <span className="mood-card-score" style={{ color: SENT_COLOR[s.mood.sentiment] }}>{s.mood.score}</span>
            </div>
            <p className="mood-card-note">{s.notes}</p>
            {s.mood.themes.length > 0 && <div className="mood-card-themes">{s.mood.themes.map(t => <span key={t} className="mood-theme-tag">{t}</span>)}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function MoodSendCorrelation({ sessions }) {
  const buckets = { positive: { sent: 0, total: 0 }, neutral: { sent: 0, total: 0 }, negative: { sent: 0, total: 0 } }
  sessions.filter(s => s.notes).forEach(s => {
    const { sentiment } = scoreNote(s.notes)
    buckets[sentiment].total++
    if (s.sent) buckets[sentiment].sent++
  })
  return <div className="correlation-bars">{Object.entries(buckets).map(([sentiment, data]) => {
    const rate = data.total ? Math.round((data.sent / data.total) * 100) : 0
    return <div key={sentiment} className="corr-row"><span className="corr-label" style={{ color: SENT_COLOR[sentiment] }}>{sentiment}</span><div className="corr-track"><div className="corr-fill" style={{ width: `${rate}%`, background: SENT_COLOR[sentiment] }} /></div><span className="corr-stat">{rate}% sent</span><span className="corr-n">n={data.total}</span></div>
  })}</div>
}

function ThemeBreakdown({ sessions }) {
  const counts = {}
  sessions.filter(s => s.notes).forEach(s => scoreNote(s.notes).themes.forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return <div className="theme-breakdown">{Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([theme, count]) => <div key={theme} className="theme-row"><span className="theme-name" style={{ color: THEME_COLOR[theme] || '#888' }}>{theme}</span><div className="theme-track"><div className="theme-fill" style={{ width: `${(count/total)*100}%`, background: THEME_COLOR[theme] || '#888' }} /></div><span className="theme-count">{count}x</span></div>)}{!Object.keys(counts).length && <p className="mood-empty">No themes detected yet</p>}</div>
}

function BurnoutRadar({ sessions }) {
  const recent = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).filter(s => s.notes)
  const burnoutFlags = recent.filter(s => scoreNote(s.notes).themes.includes('burnout'))
  const fearFlags = recent.filter(s => scoreNote(s.notes).themes.includes('fear'))
  const avgMood = recent.length ? Math.round(recent.reduce((a, s) => a + scoreNote(s.notes).score, 0) / recent.length) : 50
  const trend = recent.length >= 4 ? scoreNote(recent[0]?.notes).score - scoreNote(recent.at(-1)?.notes).score : 0
  const moodColor = avgMood >= 60 ? '#4caf82' : avgMood >= 40 ? '#f59e0b' : '#ff6b35'
  const alerts = []
  if (burnoutFlags.length >= 2) alerts.push({ text: `Burnout language in ${burnoutFlags.length} of last 8 sessions — consider a deload week`, color: '#ff6b35' })
  if (fearFlags.length >= 2) alerts.push({ text: 'Fear patterns detected — deliberate falling practice may help', color: '#f59e0b' })
  if (trend < -15) alerts.push({ text: `Mood score trending down ${Math.abs(Math.round(trend))} pts over last 8 sessions`, color: '#ff6b35' })
  if (!alerts.length) alerts.push({ text: `Mood trending stable at ${avgMood}/100 — no burnout signals detected`, color: '#4caf82' })
  return <div className="burnout-wrap"><div className="burnout-score"><span className="burnout-avg" style={{ color: moodColor }}>{avgMood}</span><span className="burnout-label">avg mood score</span><span className="burnout-trend" style={{ color: trend >= 0 ? '#4caf82' : '#ff6b35' }}>{trend >= 0 ? '+' : ''}{Math.round(trend)} trend</span></div><div className="burnout-alerts">{alerts.map((a, i) => <div key={i} className="burnout-alert"><span className="burnout-alert-bar" style={{ background: a.color }} /><span className="burnout-alert-text">{a.text}</span></div>)}</div></div>
}

function AiMoodAnalysis({ sessions }) {
  const [status, setStatus] = useState('idle')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const baseline = getMoodBaselineSummary(sessions)

  const runAnalysis = async () => {
    setStatus('checking')
    setError('')
    try {
      const health = await checkOllama(DEFAULT_OLLAMA_MODEL)
      if (!health.available) throw new Error(health.error || 'Ollama is not running.')
      if (!health.modelAvailable) throw new Error(`${DEFAULT_OLLAMA_MODEL} is not installed in Ollama.`)
      setStatus('analyzing')
      const result = await analyzeMoodWithOllama(sessions, DEFAULT_OLLAMA_MODEL)
      setAnalysis(result)
      setStatus('complete')
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  return <div className="mood-card-wrap mood-card-wrap--wide ai-mood-card">
    <div className="ai-mood-header">
      <div>
        <p className="mood-section-title">Local AI Mood Analysis</p>
        <p className="mood-section-sub">Ollama · {DEFAULT_OLLAMA_MODEL} · runs entirely on this computer</p>
      </div>
      <button className="ai-analyze-button" onClick={runAnalysis} disabled={status === 'checking' || status === 'analyzing' || !sessions.some(s => s.notes)}>
        {status === 'checking' ? 'Checking Ollama…' : status === 'analyzing' ? 'Analyzing notes…' : status === 'complete' ? 'Re-analyze' : 'Analyze with Ollama'}
      </button>
    </div>

    {!analysis && status !== 'error' && <div className="ai-mood-empty"><span className="ai-status-dot" /> Baseline NLP is active at {baseline.score}/100. Run local AI analysis to extract emotion, performance barriers, and mental-performance impact from your recent notes.</div>}
    {status === 'error' && <div className="ai-mood-error"><strong>Local AI unavailable.</strong><span>{error}</span><small>Your normal keyword-based mood analysis continues to work without Ollama.</small></div>}
    {analysis && <>
      <div className="ai-mood-summary">
        <div className="ai-metric"><span className="ai-metric-value" style={{ color: SENT_COLOR[analysis.sentiment] }}>{analysis.overallMoodScore}</span><span>Mood</span></div>
        <div className="ai-metric"><span className="ai-metric-value">{analysis.confidence}%</span><span>AI confidence</span></div>
        <div className="ai-metric"><span className="ai-metric-value">{analysis.sessionsAnalyzed}</span><span>Notes analyzed</span></div>
        <div className="ai-metric"><span className="ai-metric-value ai-metric-text">{analysis.performanceBarrier || 'none'}</span><span>Primary barrier</span></div>
      </div>
      <p className="ai-mood-summary-text">{analysis.summary}</p>
      <div className="ai-detail-grid">
        <div><span className="ai-detail-label">Mental state</span><strong>{analysis.mentalState || '—'}</strong></div>
        <div><span className="ai-detail-label">Physical state</span><strong>{analysis.physicalState || '—'}</strong></div>
        <div><span className="ai-detail-label">Mental impact</span><strong>{analysis.mentalPerformanceImpact}</strong></div>
        <div><span className="ai-detail-label">Themes</span><strong>{analysis.themes.length ? analysis.themes.join(' · ') : 'None detected'}</strong></div>
      </div>
    </>}
  </div>
}

export default function MoodLog() {
  const { sessions, isReal } = useClimberStats()
  return <div className="mood-page">
    <div className="mood-header"><p className="mood-eyebrow">{isReal ? 'Live Data' : 'Sample Data'}</p><h1 className="mood-title">Mood Log</h1></div>
    <div className="mood-grid">
      <div className="mood-card-wrap mood-card-wrap--wide"><p className="mood-section-title">Mood Over Time</p><p className="mood-section-sub">Baseline NLP score derived from session notes · Green = positive · Orange = negative</p><MoodTimeline sessions={sessions} /></div>
      <div className="mood-card-wrap"><p className="mood-section-title">Mood vs Send Rate</p><p className="mood-section-sub">Does how you feel predict whether you send?</p><MoodSendCorrelation sessions={sessions} /></div>
      <div className="mood-card-wrap"><p className="mood-section-title">Theme Breakdown</p><p className="mood-section-sub">Recurring patterns in your notes</p><ThemeBreakdown sessions={sessions} /></div>
      <div className="mood-card-wrap mood-card-wrap--wide"><p className="mood-section-title">Wellbeing Analysis</p><p className="mood-section-sub">Baseline burnout and fear signal detection across recent sessions</p><BurnoutRadar sessions={sessions} /></div>
      <AiMoodAnalysis sessions={sessions} />
    </div>
  </div>
}
