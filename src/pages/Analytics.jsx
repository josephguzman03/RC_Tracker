import useClimberStats from '../hooks/useClimberStats'
import { detectPlateaus, getAcuteChronicRatio, getRestLoadStatus } from '../utils/analytics'
import { getGymSandbagRatings } from '../utils/gymCalibration'
import { getSessionArchetypes } from '../utils/sessionArchetypes'
import { detectStyleNemesis } from '../utils/styleNemesis'
import './Analytics.css'

const HOLD_COLORS  = { crimp: '#4fc3f7', sloper: '#ff6b35', pinch: '#a78bfa', pocket: '#4caf82', jug: '#f59e0b' }
const STYLE_COLORS = { slab: '#4fc3f7', vertical: '#a78bfa', overhang: '#ff6b35', cave: '#f59e0b' }
const ACR_META     = { optimal: { label: 'Optimal', color: '#4caf82' }, warning: { label: 'Elevated', color: '#f59e0b' }, danger: { label: 'Danger', color: '#ff6b35' }, low: { label: 'Low', color: '#8888a0' } }

function GradeChart({ sessions }) {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date))
  const grades = sorted.map(s => Number(s.grade)).filter(Number.isFinite)
  const maxGrade = Math.max(...grades, 0)
  const minGrade = Math.min(...grades, 0)
  const yMin = Math.max(0, minGrade - 1)
  const yMax = Math.max(yMin + 2, maxGrade + 1)
  const [W, H, pad] = [800, 240, { t: 24, r: 24, b: 46, l: 54 }]
  const [iw, ih] = [W - pad.l - pad.r, H - pad.t - pad.b]
  const yFor = grade => pad.t + (1 - (grade - yMin) / (yMax - yMin)) * ih
  const xFor = i => sorted.length === 1
    ? pad.l + iw / 2
    : pad.l + (i / (sorted.length - 1)) * iw
  const pts = sorted.map((s, i) => ({
    x: xFor(i),
    y: yFor(Number(s.grade) || 0),
    sent: s.sent,
    date: s.date,
  }))
  const line = pts.length > 1
    ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    : ''
  const tickStep = Math.max(1, Math.ceil((yMax - yMin) / 5))
  const yTicks = []
  for (let g = yMin; g <= yMax; g += tickStep) yTicks.push(g)
  if (yTicks.at(-1) !== yMax) yTicks.push(yMax)
  const labelEvery = sorted.length <= 6 ? 1 : Math.ceil(sorted.length / 5)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="analytics-svg analytics-svg--grade" role="img" aria-label="Grade progression over time">
      {yTicks.map(g => {
        const y = yFor(g)
        return <g key={g}>
          <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize="12" fill="var(--text-muted)" fontFamily="var(--font-mono)">V{g}</text>
        </g>
      })}
      {line && <path d={line} fill="none" stroke="rgba(79,195,247,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => <g key={`${p.date}-${i}`}>
        <circle cx={p.x} cy={p.y} r="5" fill={p.sent ? '#4fc3f7' : '#ff6b35'} stroke="var(--bg-card)" strokeWidth="2" />
        {(i % labelEvery === 0 || i === pts.length - 1) && (
          <text x={p.x} y={H - 14} textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-mono)">{String(p.date).slice(5)}</text>
        )}
      </g>)}
      {pts.length === 1 && (
        <text x={W / 2} y={pad.t + 18} textAnchor="middle" fontSize="12" fill="var(--text-muted)" fontFamily="var(--font-mono)">Add more sessions to build a trend line</text>
      )}
    </svg>
  )
}

function VolumeChart({ sessions }) {
  const byWeek = {}
  sessions.forEach(s => {
    const d = new Date(s.date), m = new Date(d)
    m.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const k = m.toISOString().slice(0, 10)
    if (!byWeek[k]) byWeek[k] = { total: 0, sent: 0 }
    byWeek[k].total++
    if (s.sent) byWeek[k].sent++
  })
  const weeks = Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0])).slice(-10)
  const maxTotal = Math.max(...weeks.map(w => w[1].total), 1)
  const [W, H, pad] = [520, 220, { t: 20, r: 18, b: 42, l: 42 }]
  const [iw, ih] = [W - pad.l - pad.r, H - pad.t - pad.b]
  const slot = iw / Math.max(weeks.length, 1)
  const bW = Math.min(42, slot * 0.58)
  const yFor = value => pad.t + (1 - value / maxTotal) * ih
  const ticks = Array.from({ length: Math.min(maxTotal, 4) + 1 }, (_, i) => Math.round((i / Math.min(maxTotal, 4)) * maxTotal))
    .filter((v, i, arr) => arr.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="analytics-svg analytics-svg--compact" role="img" aria-label="Weekly session volume">
      {ticks.map(v => {
        const y = yFor(v)
        return <g key={v}>
          <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-mono)">{v}</text>
        </g>
      })}
      {weeks.map(([week, d], i) => {
        const cx = pad.l + slot * (i + 0.5)
        const totalY = yFor(d.total)
        const sentY = yFor(d.sent)
        return <g key={week}>
          <rect x={cx - bW / 2} y={totalY} width={bW} height={pad.t + ih - totalY} fill="rgba(79,195,247,0.16)" rx="4" />
          <rect x={cx - bW / 2} y={sentY} width={bW} height={pad.t + ih - sentY} fill="#4fc3f7" rx="4" />
          <text x={cx} y={H - 14} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">{week.slice(5)}</text>
        </g>
      })}
    </svg>
  )
}

function LoadChart({ sessions }) {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12)
  const [W, H, pad] = [520, 220, { t: 20, r: 18, b: 42, l: 44 }]
  const [iw, ih] = [W - pad.l - pad.r, H - pad.t - pad.b]
  const xFor = i => sorted.length === 1
    ? pad.l + iw / 2
    : pad.l + (i / (sorted.length - 1)) * iw
  const yFor = value => pad.t + (1 - value / 10) * ih
  const pts = sorted.map((s, i) => ({ x: xFor(i), y: yFor(Number(s.rpe) || 0), date: s.date }))
  const line = pts.length > 1 ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') : ''
  const area = line && `${line} L${pts.at(-1).x},${pad.t + ih} L${pts[0].x},${pad.t + ih} Z`
  const labelEvery = sorted.length <= 6 ? 1 : Math.ceil(sorted.length / 5)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="analytics-svg analytics-svg--compact" role="img" aria-label="RPE over time">
      {[2, 4, 6, 8, 10].map(v => {
        const y = yFor(v)
        return <g key={v}>
          <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={pad.l - 9} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-mono)">{v}</text>
        </g>
      })}
      {area && <path d={area} fill="rgba(255,107,53,0.08)" />}
      {line && <path d={line} fill="none" stroke="#ff6b35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => <g key={`${p.date}-${i}`}>
        <circle cx={p.x} cy={p.y} r="5" fill="#ff6b35" stroke="var(--bg-card)" strokeWidth="2" />
        {(i % labelEvery === 0 || i === pts.length - 1) && (
          <text x={p.x} y={H - 14} textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="var(--font-mono)">{String(p.date).slice(5)}</text>
        )}
      </g>)}
    </svg>
  )
}

function HoldBar({ sessions }) {
  const counts = {}
  sessions.forEach(s => s.holds.forEach(h => { counts[h] = (counts[h] || 0) + 1 }))
  const total  = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return (
    <div className="hold-bars">
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([hold, count]) => (
        <div key={hold} className="hold-bar-row">
          <span className="hold-bar-label">{hold}</span>
          <div className="hold-bar-track">
            <div className="hold-bar-fill" style={{ width: `${(count / total) * 100}%`, background: HOLD_COLORS[hold] || '#888' }} />
          </div>
          <span className="hold-bar-pct">{Math.round((count / total) * 100)}%</span>
        </div>
      ))}
    </div>
  )
}

function StyleBreakdown({ sessions }) {
  const counts = {}
  sessions.forEach(s => { counts[s.style] = (counts[s.style] || 0) + 1 })
  const total  = sessions.length || 1
  return (
    <div className="style-grid">
      {Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([style, count]) => (
        <div key={style} className="style-card">
          <span className="style-card-dot" style={{ background: STYLE_COLORS[style] || '#888' }} />
          <span className="style-card-name">{style}</span>
          <span className="style-card-pct">{Math.round((count / total) * 100)}%</span>
          <span className="style-card-count">{count} sessions</span>
        </div>
      ))}
    </div>
  )
}

function PlateauAlert({ plateaus }) {
  if (!plateaus.length) return (
    <div className="plateau-clear">
      <span className="plateau-clear-dot" />
      No plateaus detected in current data
    </div>
  )
  return (
    <div className="plateau-list">
      {plateaus.map((p, i) => (
        <div key={i} className="plateau-item">
          <span className="plateau-grade">V{p.grade}</span>
          <div className="plateau-meta">
            <span className="plateau-date">{p.start} — {p.end}</span>
            <span className="plateau-sessions">{p.sessions} sessions at this level</span>
          </div>
          <span className="plateau-badge">Plateau</span>
        </div>
      ))}
    </div>
  )
}

function ACRMeter({ acr }) {
  const meta    = ACR_META[acr.status]
  const pct     = Math.min((acr.ratio / 1.5) * 100, 100)
  const markers = [{ pct: (0.8 / 1.5) * 100, label: '0.8' }, { pct: (1.1 / 1.5) * 100, label: '1.1' }, { pct: (1.3 / 1.5) * 100, label: '1.3' }]
  return (
    <div className="acr-wrap">
      <div className="acr-top">
        <span className="acr-ratio" style={{ color: meta.color }}>{acr.ratio}</span>
        <span className="acr-status" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      <div className="acr-track">
        <div className="acr-fill" style={{ width: `${pct}%`, background: meta.color }} />
        {markers.map(m => (
          <div key={m.label} className="acr-marker" style={{ left: `${m.pct}%` }}>
            <div className="acr-marker-line" />
            <span className="acr-marker-label">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="acr-sub">
        <span>Acute RPE: {acr.acute}</span>
        <span>Chronic RPE: {acr.chronic}</span>
      </div>
    </div>
  )
}

function SandbagTable({ ratings }) {
  if (!ratings.length) return <p className="analytics-card-sub">No gym data available yet.</p>

  return (
    <div className="sandbag-table-wrap">
      <table className="sandbag-table">
        <thead>
          <tr>
            <th>Gym</th><th>Sessions</th><th>Send Rate</th><th>Avg Grade</th><th>Difficulty</th><th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {ratings.map(r => {
            const tone = r.difficultyDelta >= 0.15 ? 'hard' : r.difficultyDelta <= -0.35 ? 'soft' : 'fair'
            return (
              <tr key={r.gym}>
                <td>{r.gym}</td>
                <td>{r.sessions}</td>
                <td>{Math.round(r.sendRate * 100)}%</td>
                <td>V{r.avgGrade}</td>
                <td>
                  <span className={`sandbag-delta ${tone}`}>
                    {r.difficultyDelta > 0 ? '+' : ''}{r.difficultyDelta} V · {r.calibration}
                  </span>
                </td>
                <td>{r.confidenceLabel}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}


function ArchetypePanel({ data }) {
  if (!data?.summary?.length) return <p className="analytics-card-sub">Not enough session data yet.</p>

  const max = Math.max(...data.summary.map(row => row.count), 1)
  return (
    <div className="archetype-panel">
      <div className="archetype-dominant">
        <span className="archetype-kicker">Most common</span>
        <strong>{data.dominant.label}</strong>
        <span>{data.dominant.pct}% of logged sessions · baseline around V{data.referenceGrade}</span>
      </div>
      <div className="archetype-bars">
        {data.summary.map(row => (
          <div key={row.key} className="archetype-row">
            <div className="archetype-row-top">
              <span>{row.label}</span>
              <span>{row.count} · {row.pct}%</span>
            </div>
            <div className="archetype-track"><div className="archetype-fill" style={{ width: `${(row.count / max) * 100}%` }} /></div>
            <p>{row.description}</p>
          </div>
        ))}
      </div>
      <div className="archetype-recent">
        <span className="archetype-kicker">Recent sessions</span>
        <div className="archetype-recent-list">
          {data.recent.map(session => (
            <span key={`${session.date}-${session.gym}-${session.grade}`} className="archetype-pill" title={session.archetype.reasons.join(' · ')}>
              {session.date.slice(5)} · {session.archetype.short}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function NemesisCard({ data }) {
  const n = data?.nemesis
  const strength = data?.strength
  if (!n) return (
    <div className="nemesis-empty">
      <span className="plateau-clear-dot" />
      No repeat weakness is strong enough to call a nemesis yet.
    </div>
  )

  const gapText = `${Math.abs(n.performanceGap).toFixed(2)} below your baseline`
  return (
    <div className="nemesis-wrap">
      <div className="nemesis-primary">
        <span className="nemesis-eyebrow">Current nemesis</span>
        <strong>{n.label}</strong>
        <p>{gapText} after adjusting for grade and gym difficulty.</p>
        <div className="nemesis-stats">
          <span><b>{Math.round(n.sendRate * 100)}%</b> send rate</span>
          <span><b>{n.avgAttempts}</b> avg attempts</span>
          <span><b>{n.sessions}</b> logs</span>
          <span><b>{n.confidenceLabel}</b> confidence</span>
        </div>
      </div>
      {strength && strength.key !== n.key && (
        <div className="nemesis-strength">
          <span className="nemesis-eyebrow">Relative strength</span>
          <strong>{strength.label}</strong>
          <span>+{strength.performanceGap.toFixed(2)} vs baseline · {Math.round(strength.sendRate * 100)}% sends</span>
        </div>
      )}
      <p className="nemesis-note">This is a personal performance pattern, not an objective statement about the style. Small samples stay labeled as early signals.</p>
    </div>
  )
}

export default function Analytics() {
  const { sessions, isReal } = useClimberStats()
  const sent     = sessions.filter(s => s.sent)
  const sendRate = Math.round((sent.length / sessions.length) * 100)
  const maxGrade = sent.length ? Math.max(...sent.map(s => s.grade)) : 0
  const avgRpe   = (sessions.reduce((a, s) => a + s.rpe, 0) / sessions.length).toFixed(1)
  const injCount = sessions.filter(s => s.injuryFlag !== 'none').length
  const plateaus = detectPlateaus(sessions)
  const acr      = getAcuteChronicRatio(sessions)
  const sandbag  = getGymSandbagRatings(sessions)
  const archetypes = getSessionArchetypes(sessions)
  const nemesis    = detectStyleNemesis(sessions)

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <p className="analytics-eyebrow">{isReal ? 'Live Data' : 'Sample Data'}</p>
        <h1 className="analytics-title">Analytics</h1>
      </div>

      <div className="analytics-summary">
        {[
          { label: 'Total Sessions',  value: sessions.length, color: 'blue'                           },
          { label: 'Send Rate',       value: `${sendRate}%`,  color: 'green'                          },
          { label: 'Peak Grade',      value: `V${maxGrade}`,  color: 'blue'                           },
          { label: 'Avg RPE',         value: avgRpe,          color: 'orange'                         },
          { label: 'Injury Sessions', value: injCount,        color: injCount > 0 ? 'orange' : 'green'},
        ].map(s => (
          <div key={s.label} className={`summary-chip summary-chip--${s.color}`}>
            <span className="summary-chip-value">{s.value}</span>
            <span className="summary-chip-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="analytics-card analytics-card--wide">
          <p className="analytics-card-title">Grade Progression</p>
          <p className="analytics-card-sub">Blue = sent · Orange = attempted</p>
          <GradeChart sessions={sessions} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">Weekly Volume</p>
          <p className="analytics-card-sub">Blue = sent · Faded = attempted</p>
          <VolumeChart sessions={sessions} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">RPE Over Time</p>
          <p className="analytics-card-sub">Last 12 sessions</p>
          <LoadChart sessions={sessions} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">Acute:Chronic Load Ratio</p>
          <p className="analytics-card-sub">7-day vs 28-day RPE — injury risk indicator</p>
          <ACRMeter acr={acr} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">Plateau Detection</p>
          <p className="analytics-card-sub">Stagnant grade windows across sent sessions</p>
          <PlateauAlert plateaus={plateaus} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">Hold Type Breakdown</p>
          <p className="analytics-card-sub">By session frequency</p>
          <HoldBar sessions={sessions} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">Style Breakdown</p>
          <p className="analytics-card-sub">Wall style distribution</p>
          <StyleBreakdown sessions={sessions} />
        </div>

        <div className="analytics-card analytics-card--wide">
          <p className="analytics-card-title">Gym Sandbag Calibration</p>
          <p className="analytics-card-sub">Difficulty relative to your overall climbing ability, adjusted for style and session type</p>
          <SandbagTable ratings={sandbag} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">Session Archetypes</p>
          <p className="analytics-card-sub">What kind of training stimulus your sessions are actually creating</p>
          <ArchetypePanel data={archetypes} />
        </div>

        <div className="analytics-card">
          <p className="analytics-card-title">Style Nemesis</p>
          <p className="analytics-card-sub">Repeated underperformance by style, hold type, and their combinations</p>
          <NemesisCard data={nemesis} />
        </div>
      </div>
    </div>
  )
}