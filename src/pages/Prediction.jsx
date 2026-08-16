import { useMemo, useState } from 'react'
import useClimberStats from '../hooks/useClimberStats'
import { buildPrediction } from '../utils/prediction'
import { getPredictionInsight } from '../ai/predictionInsight'
import './Prediction.css'

const META = {
  improve: { color: '#4caf82', label: 'Improve', desc: 'Next-grade evidence, training and recovery support continued progress.' },
  plateau: { color: '#4fc3f7', label: 'Plateau', desc: 'Current ability stays relatively stable without a stronger progress signal.' },
  decline: { color: '#ff6b35', label: 'Decline', desc: 'Load, recovery, or performance signals pull the projection downward.' },
}

function AbilityProgress({ pred }) {
  const pct = Math.round(pred.gradeProgress * 100)
  return (
    <div className="pred-card ability-progress-card">
      <div className="ability-progress-header">
        <div>
          <p className="pred-card-title">Grade Progression</p>
          <p className="pred-card-sub">V{pred.currentAbility.toFixed(1)} means V{pred.establishedGrade} is established, with {pct}% model evidence toward V{pred.nextGrade}</p>
        </div>
        <strong className="ability-progress-score">V{pred.currentAbility.toFixed(1)}</strong>
      </div>

      <div className="ability-progress-scale">
        <span>V{pred.establishedGrade}</span>
        <div className="ability-progress-track"><div className="ability-progress-fill" style={{ width: `${pct}%` }} /></div>
        <span>V{pred.nextGrade}</span>
      </div>

      <div className="ability-evidence-grid">
        <div><span>Established Grade</span><strong>V{pred.establishedGrade}</strong></div>
        <div><span>Next Grade</span><strong>V{pred.nextGrade}</strong></div>
        <div><span>Next-Grade Logs</span><strong>{pred.evidence.next.count}</strong></div>
        <div><span>Next-Grade Sends</span><strong>{pred.evidence.next.sends}</strong></div>
      </div>
    </div>
  )
}

function LearningMode({ pred, Header }) {
  const pct = Math.round(pred.learning.progress * 100)
  return (
    <div className="pred-page">
      <div className="pred-header"><Header /></div>

      <div className="pred-card prediction-learning-card">
        <p className="pred-card-title">30-Day Learning Period</p>
        <p className="pred-card-sub">The model is observing your baseline before it makes future grade projections.</p>

        <div className="learning-progress-row">
          <strong>{pred.learning.daysObserved} / 30 days</strong>
          <span>{pred.learning.daysRemaining} days remaining</span>
        </div>
        <div className="learning-progress-track"><div className="learning-progress-fill" style={{ width: `${pct}%` }} /></div>

        <div className="learning-stats">
          <div><span>Baseline Progress</span><strong>{pct}%</strong></div>
          <div><span>Sessions Observed</span><strong>{pred.learning.sessionCount}</strong></div>
          <div><span>Current Evidence</span><strong>V{pred.currentAbility.toFixed(1)}</strong></div>
        </div>

        <p className="learning-note">During these first 30 calendar days, the tracker can learn your grade behavior, attempts and gym patterns, but it intentionally does not forecast 30/60/90-day performance yet.</p>
      </div>

      <AbilityProgress pred={pred} />
    </div>
  )
}

function Chart({ pred }) {
  const { tracks, currentAbility: ability, likelyTrack } = pred
  const all = Object.values(tracks).flatMap(track => track.map(point => point.grade))
  const minG = Math.max(1, Math.floor(Math.min(ability - 1, ...all)))
  const maxG = Math.min(15, Math.ceil(Math.max(ability + 1, ...all)))
  const range = maxG - minG || 1
  const [W, H, pad] = [800, 280, { t: 24, r: 32, b: 40, l: 56 }]
  const [iw, ih] = [W - pad.l - pad.r, H - pad.t - pad.b]
  const xy = (day, grade) => ({
    x: pad.l + (day / 90) * iw,
    y: pad.t + (1 - (grade - minG) / range) * ih,
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pred-svg" aria-label="90-day climbing grade projection">
      {Array.from({ length: maxG - minG + 1 }, (_, i) => minG + i).map(grade => {
        const y = pad.t + (1 - (grade - minG) / range) * ih
        return (
          <g key={grade}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-mono)">V{grade}</text>
          </g>
        )
      })}

      {[30, 60, 90].map(day => {
        const x = pad.l + (day / 90) * iw
        return (
          <g key={day}>
            <line x1={x} y1={pad.t} x2={x} y2={pad.t + ih} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={x} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">{day}d</text>
          </g>
        )
      })}

      <circle cx={xy(0, ability).x} cy={xy(0, ability).y} r="6" fill="white" opacity="0.65" />

      {Object.entries(tracks).map(([key, points]) => {
        const meta = META[key]
        const likely = key === likelyTrack
        const d = [{ day: 0, grade: ability }, ...points]
          .map((point, index) => `${index === 0 ? 'M' : 'L'}${xy(point.day, point.grade).x},${xy(point.day, point.grade).y}`)
          .join(' ')

        return (
          <g key={key}>
            <path d={d} fill="none" stroke={meta.color} strokeWidth={likely ? 2.5 : 1.2} strokeDasharray={likely ? 'none' : '6 4'} opacity={likely ? 1 : 0.4} strokeLinejoin="round" />
            {likely && points.map((point, index) => <circle key={index} cx={xy(point.day, point.grade).x} cy={xy(point.day, point.grade).y} r="4" fill={meta.color} />)}
          </g>
        )
      })}
    </svg>
  )
}

function DriverRow({ driver }) {
  const positive = driver.direction === 'positive'
  return (
    <div className="driver-row">
      <div className="driver-main">
        <span className={`driver-arrow ${positive ? 'driver-arrow--positive' : 'driver-arrow--negative'}`}>{positive ? '↑' : '↓'}</span>
        <div><span className="driver-label">{driver.label}</span><p className="driver-detail">{driver.detail}</p></div>
      </div>
      <span className={`driver-strength driver-strength--${driver.strength}`}>{driver.strength}</span>
    </div>
  )
}

export default function Prediction() {
  const { sessions, isReal } = useClimberStats()
  const pred = useMemo(() => buildPrediction(sessions), [sessions])
  const [insight, setInsight] = useState(null)
  const [aiState, setAiState] = useState('idle')
  const [aiError, setAiError] = useState('')

  const analyzePrediction = async () => {
    if (!pred || pred.mode !== 'prediction' || aiState === 'loading') return
    setAiState('loading')
    setAiError('')
    try {
      const result = await getPredictionInsight(pred)
      setInsight(result)
      setAiState('ready')
    } catch (error) {
      setAiError(error?.message || 'Unable to get a local Ollama explanation.')
      setAiState('error')
    }
  }

  const Header = () => (
    <><p className="pred-eyebrow">{isReal ? 'Live Data' : 'Sample Data'}</p><h1 className="pred-title">Prediction</h1></>
  )

  if (!pred) return <div className="pred-page"><div className="pred-header"><Header /></div><div className="pred-empty"><p>Upload climbing sessions to begin the 30-day learning period.</p></div></div>

  if (pred.mode === 'learning') return <LearningMode pred={pred} Header={Header} />

  if (pred.mode === 'insufficient') {
    return (
      <div className="pred-page">
        <div className="pred-header"><Header /></div>
        <div className="pred-empty"><p>{pred.reason}</p></div>
        <AbilityProgress pred={pred} />
      </div>
    )
  }

  const likely = pred.tracks[pred.likelyTrack]
  const metrics = [
    { label: 'Current Ability', value: `V${pred.currentAbility.toFixed(1)}`, tone: 'neutral' },
    { label: 'Established', value: `V${pred.establishedGrade}`, tone: 'neutral' },
    { label: 'Trajectory', value: pred.trajectory, tone: pred.trajectory === 'Improving' ? 'good' : pred.trajectory === 'Regressing' ? 'bad' : 'neutral' },
    { label: 'Confidence', value: pred.confidenceLabel, tone: pred.confidence >= 0.55 ? 'good' : 'neutral' },
    { label: 'Injury Risk', value: `${pred.injuryRisk}/100`, tone: pred.injuryRisk < 45 ? 'good' : 'bad' },
  ]

  return (
    <div className="pred-page">
      <div className="pred-header"><Header /></div>

      <div className="metric-strip prediction-overview">
        {metrics.map(metric => <div key={metric.label} className="metric-chip"><span className={`metric-chip-value metric-chip-value--${metric.tone}`}>{metric.value}</span><span className="metric-chip-label">{metric.label}</span></div>)}
      </div>

      <AbilityProgress pred={pred} />

      <div className="projection-window-grid">
        {likely.map(point => (
          <div className="projection-window" key={point.day}>
            <span className="projection-window-day">{point.day} Day</span>
            <strong>V{point.grade.toFixed(1)}</strong>
            <span>{point.grade >= pred.currentAbility ? '+' : ''}{(point.grade - pred.currentAbility).toFixed(1)} vs now</span>
          </div>
        ))}
      </div>

      <div className="pred-card">
        <p className="pred-card-title">90-Day Grade Projection</p>
        <p className="pred-card-sub">Decimals represent progression between established whole V-grades; the model only forecasts after a 30-day baseline.</p>
        <Chart pred={pred} />
      </div>

      <div className="track-cards">
        {Object.entries(META).map(([key, meta]) => {
          const end = pred.tracks[key].at(-1).grade
          const delta = end - pred.currentAbility
          const likelyTrack = key === pred.likelyTrack
          return (
            <div key={key} className={`track-card ${likelyTrack ? 'track-card--likely' : ''}`} style={{ borderTopColor: meta.color }}>
              {likelyTrack && <span className="track-likely-badge">Most Likely</span>}
              <span className="track-card-label" style={{ color: meta.color }}>{meta.label}</span>
              <span className="track-card-grade">V{pred.currentAbility.toFixed(1)} → V{end.toFixed(1)}</span>
              <span className="track-card-delta" style={{ color: delta >= 0 ? '#4caf82' : '#ff6b35' }}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)} in 90d</span>
              <p className="track-card-desc">{meta.desc}</p>
            </div>
          )
        })}
      </div>

      <div className="pred-two-column">
        <div className="pred-card"><p className="pred-card-title">Prediction Drivers</p><p className="pred-card-sub">Signals pushing the evidence-based projection up or down</p><div className="driver-list">{pred.drivers.slice(0, 6).map(driver => <DriverRow key={driver.label} driver={driver} />)}</div></div>
        <div className="pred-card"><p className="pred-card-title">Training Blockers</p><p className="pred-card-sub">Current factors limiting the improvement scenario</p>{pred.blockers.length ? <div className="blocker-list">{pred.blockers.map((blocker, index) => <div key={index} className="blocker-item"><div className="blocker-header"><span className="blocker-dot" /><span className="blocker-label">{blocker.label}</span></div><p className="blocker-detail">{blocker.detail}</p></div>)}</div> : <div className="blocker-clear"><span className="blocker-clear-dot" />No major blockers detected</div>}</div>
      </div>

      <div className="pred-card prediction-ai-card">
        <div className="prediction-ai-header"><div><p className="pred-card-title">Local AI Interpretation</p><p className="pred-card-sub">Ollama explains the deterministic model; it does not calculate the projection</p></div><button className="prediction-ai-button" onClick={analyzePrediction} disabled={aiState === 'loading'}>{aiState === 'loading' ? 'Analyzing…' : insight ? 'Refresh Explanation' : 'Explain with Ollama'}</button></div>
        {aiState === 'idle' && !insight && <div className="prediction-ai-empty">Uses your local <strong>llama3.2:3b</strong> model. No climbing data is sent to a cloud API.</div>}
        {aiState === 'error' && <div className="prediction-ai-error"><strong>Ollama unavailable</strong><span>{aiError}</span></div>}
        {insight && <div className="prediction-ai-result"><p className="prediction-ai-summary">{insight.summary}</p><div className="prediction-ai-details"><div><span>Why</span><p>{insight.why}</p></div><div><span>Watch</span><p>{insight.watch}</p></div><div><span>Confidence</span><p>{insight.confidenceNote}</p></div></div></div>}
      </div>
    </div>
  )
}
