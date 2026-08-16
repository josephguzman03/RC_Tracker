import useClimberStats from '../hooks/useClimberStats'
import { analyzeInjuryRisk } from '../utils/injuryRisk'
import './InjuryTracker.css'

const PARTS = ['finger', 'shoulder', 'elbow', 'knee', 'back', 'wrist']

function getRiskColor(score) {
  if (score >= 75) return '#ef4444'
  if (score >= 50) return '#ff6b35'
  if (score >= 25) return '#f59e0b'
  return '#4caf82'
}

function RiskMeter({ sessions }) {
  const risk = analyzeInjuryRisk(sessions)
  const color = getRiskColor(risk.score)
  const [r, cx, cy] = [54, 70, 70]
  const circ = 2 * Math.PI * r

  return (
    <div className="risk-meter">
      <div className="risk-gauge">
        <svg viewBox="0 0 140 100" className="risk-svg">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--bg-secondary)"
            strokeWidth="10"
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeDashoffset={-(circ * 0.125)}
            strokeLinecap="round"
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${risk.score / 100 * circ * 0.75} ${circ}`}
            strokeDashoffset={-(circ * 0.125)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }}
          />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="var(--font-mono)">
            {risk.score}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-display)">
            {risk.label}
          </text>
        </svg>
      </div>

      <div className="risk-flags">
        {risk.signals.map(signal => (
          <div key={signal.key} className={`risk-flag ${signal.active ? 'active' : ''}`}>
            <span
              className="risk-flag-dot"
              style={{ background: signal.active ? color : 'var(--text-muted)' }}
            />
            <span className="risk-flag-label">{signal.label}</span>
            <span className="risk-flag-value">{Math.round(signal.value * 100)}%</span>
          </div>
        ))}
        <div className="risk-confidence">
          <span>Confidence</span>
          <strong>{risk.confidenceLabel}</strong>
        </div>
      </div>
    </div>
  )
}

function InjuryTimeline({ sessions }) {
  const injured = sessions
    .filter(s => s.injuryFlag !== 'none')
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (!injured.length) return <div className="injury-empty"><span className="injury-empty-dot" />No injuries logged</div>

  return (
    <div className="injury-timeline">
      {injured.map((s, i) => (
        <div key={i} className="injury-event">
          <div className="injury-event-left">
            <span className="injury-dot" />
            {i < injured.length - 1 && <div className="injury-event-line" />}
          </div>
          <div className="injury-event-body">
            <div className="injury-event-header">
              <span className="injury-body-part">{s.injuryFlag}</span>
              <span className="injury-date">{s.date}</span>
            </div>
            <span className="injury-context">V{s.grade} · {s.gym} · RPE {s.rpe}</span>
            {s.notes && <span className="injury-note">{s.notes}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function BodyMap({ sessions }) {
  const counts = sessions
    .filter(s => s.injuryFlag !== 'none')
    .reduce((acc, s) => {
      acc[s.injuryFlag] = (acc[s.injuryFlag] || 0) + 1
      return acc
    }, {})

  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="body-map">
      {PARTS.map(p => {
        const n = counts[p] || 0
        const pct = n / max
        return (
          <div key={p} className="body-part-row">
            <span className="body-part-name">{p}</span>
            <div className="body-part-track">
              <div
                className="body-part-fill"
                style={{
                  width: `${pct * 100}%`,
                  background: pct > 0.6 ? '#ef4444' : pct > 0.3 ? '#ff6b35' : pct > 0 ? '#f59e0b' : 'transparent',
                }}
              />
            </div>
            <span className="body-part-count">{n}</span>
          </div>
        )
      })}
    </div>
  )
}

function LoadRecs({ sessions }) {
  const risk = analyzeInjuryRisk(sessions)

  return (
    <div className="load-recs">
      {risk.recommendations.map(recommendation => (
        <div key={recommendation.key} className="load-rec">
          <span className={`load-rec-bar load-rec-bar--${recommendation.tone}`} />
          <span className="load-rec-text">{recommendation.text}</span>
        </div>
      ))}
    </div>
  )
}

export default function InjuryTracker() {
  const { sessions, isReal } = useClimberStats()
  const risk = analyzeInjuryRisk(sessions)

  return (
    <div className="injury-page">
      <div className="injury-header">
        <p className="injury-eyebrow">{isReal ? 'Live Data' : 'Sample Data'}</p>
        <h1 className="injury-title">Injury Tracker</h1>
      </div>

      <div className="injury-grid">
        <div className="injury-card injury-card--wide">
          <p className="injury-card-title">Injury Risk Score</p>
          <p className="injury-card-sub">
            Load change, recovery, intensity, RPE, crimp exposure, and recent injury history
          </p>
          <RiskMeter sessions={sessions} />
          <div className="risk-footnote">
            Based on sessions through {risk.latestDate || 'your latest session'} · {risk.confidenceLabel} confidence
          </div>
        </div>

        <div className="injury-card">
          <p className="injury-card-title">Load Recommendations</p>
          <p className="injury-card-sub">Based on the signals contributing to your current risk score</p>
          <LoadRecs sessions={sessions} />
        </div>

        <div className="injury-card">
          <p className="injury-card-title">Body Part Frequency</p>
          <p className="injury-card-sub">Injury occurrences by location</p>
          <BodyMap sessions={sessions} />
        </div>

        <div className="injury-card injury-card--wide">
          <p className="injury-card-title">Injury History</p>
          <p className="injury-card-sub">Sessions flagged with an injury</p>
          <InjuryTimeline sessions={sessions} />
        </div>
      </div>
    </div>
  )
}
