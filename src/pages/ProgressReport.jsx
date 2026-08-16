import { useMemo, useState } from 'react'
import useClimberStats from '../hooks/useClimberStats'
import { buildProgressReportData } from '../utils/reportData'
import { generateReportInsight } from '../ai/reportInsight'
import { checkOllama, DEFAULT_OLLAMA_MODEL } from '../ai/ollama'
import './ProgressReport.css'

const fmtDate = value => {
  if (!value) return '—'
  const d = new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const ability = value => Number.isFinite(Number(value)) ? `V${Number(value).toFixed(1)}` : '—'

function Metric({ label, value, sub }) {
  return <div className="report-metric"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>
}

export default function ProgressReport() {
  const { sessions, isReal } = useClimberStats()
  const report = useMemo(() => buildProgressReportData(sessions), [sessions])
  const [summary, setSummary] = useState('')
  const [aiState, setAiState] = useState('idle')
  const [error, setError] = useState('')

  const pred = report.prediction
  const injury = report.injury
  const nemesis = report.style.nemesis
  const strength = report.style.strength

  async function createSummary() {
    setError('')
    setAiState('checking')
    try {
      const status = await checkOllama()
      if (!status.available) throw new Error(status.error || 'Ollama is offline.')
      if (!status.modelAvailable) throw new Error(`${DEFAULT_OLLAMA_MODEL} is not installed.`)
      setAiState('thinking')
      setSummary(await generateReportInsight(report))
      setAiState('ready')
    } catch (err) {
      setAiState('error')
      setError(err.message)
    }
  }

  function exportPdf() {
    const previous = document.title
    document.title = `climbing-progress-report-${report.dataset.latestDate || 'current'}`
    window.print()
    setTimeout(() => { document.title = previous }, 500)
  }

  return (
    <div className="report-page">
      <div className="report-actions no-print">
        <div>
          <p className="report-eyebrow">{isReal ? 'Live Data' : 'Sample Data'} · Local Report</p>
          <h1>Progress Report</h1>
          <p>Local analytics snapshot designed for print / Save as PDF.</p>
        </div>
        <div className="report-action-buttons">
          <button onClick={createSummary} disabled={aiState === 'checking' || aiState === 'thinking'}>
            {aiState === 'thinking' ? 'Ollama is writing…' : 'Generate AI Summary'}
          </button>
          <button className="report-export" onClick={exportPdf}>Export / Save PDF</button>
        </div>
      </div>

      <article className="report-sheet">
        <header className="report-print-header">
          <div><span className="report-mark">CLIMBING TRACKER</span><h2>Climbing Progress Report</h2></div>
          <div className="report-period">{fmtDate(report.dataset.firstDate)} — {fmtDate(report.dataset.latestDate)}</div>
        </header>

        <section className="report-metrics">
          <Metric label="Sessions" value={report.dataset.sessions} sub={`${report.dataset.sendRate}% send rate`} />
          <Metric label="Highest Send" value={report.dataset.highestSend != null ? `V${report.dataset.highestSend}` : '—'} />
          <Metric label="Ability Score" value={ability(pred.currentAbility)} sub={pred.establishedGrade != null ? `Established V${pred.establishedGrade}` : 'Learning'} />
          <Metric label="Injury / Load Risk" value={`${injury.score}/100`} sub={`${injury.label} · ${injury.confidence}`} />
        </section>

        <section className="report-section">
          <div className="report-section-heading"><h3>Grade Progression</h3><span>{pred.mode === 'prediction' ? `${pred.trajectory} · ${pred.confidence} confidence` : '30-day learning baseline'}</span></div>
          <div className="report-grade-line">
            <strong>V{pred.establishedGrade ?? '—'}</strong>
            <div className="report-progress-track"><div style={{ width: `${pred.nextGradeProgress || 0}%` }} /></div>
            <strong>V{pred.nextGrade ?? '—'}</strong>
            <span>{pred.nextGradeProgress || 0}%</span>
          </div>
          {pred.mode === 'prediction' ? (
            <div className="report-projections">
              {pred.projectedGrades.map(p => <Metric key={p.day} label={`${p.day}-Day`} value={ability(p.grade)} />)}
            </div>
          ) : (
            <p className="report-note">Prediction unlocks after the first 30 calendar days of logged climbing. The tracker can still show what it has learned about your current grade progression.</p>
          )}
        </section>

        <div className="report-two-col">
          <section className="report-section">
            <div className="report-section-heading"><h3>Training Load</h3><span>{injury.label}</span></div>
            <div className="report-signal-list">
              {injury.signals.length ? injury.signals.map(s => <div key={s.key || s.label}><span>{s.label}</span><strong>{Math.round((s.value || 0) * 100)}%</strong></div>) : <p className="report-note">No major active risk signals.</p>}
            </div>
          </section>

          <section className="report-section">
            <div className="report-section-heading"><h3>Mood Baseline</h3><span>{report.mood.notes} notes</span></div>
            <div className="report-big-value">{report.mood.score}<small>/100</small></div>
            <p className="report-note">Baseline sentiment: <strong>{report.mood.sentiment}</strong>. This is the deterministic note baseline; richer Mood Log Ollama analysis remains separate.</p>
          </section>
        </div>

        <div className="report-two-col">
          <section className="report-section">
            <div className="report-section-heading"><h3>Session Archetypes</h3><span>Baseline V{report.archetypes.referenceGrade ?? '—'}</span></div>
            {report.archetypes.summary.map(row => <div className="report-bar-row" key={row.key}><div><span>{row.label}</span><strong>{row.pct}%</strong></div><div className="report-bar"><i style={{ width: `${row.pct}%` }} /></div></div>)}
          </section>

          <section className="report-section">
            <div className="report-section-heading"><h3>Style Profile</h3><span>Personalized</span></div>
            <div className="report-style-card negative"><span>Nemesis</span><strong>{nemesis?.label || 'No repeat nemesis yet'}</strong>{nemesis && <small>{Math.abs(nemesis.performanceGap).toFixed(2)} below baseline · {nemesis.sessions} sessions</small>}</div>
            <div className="report-style-card positive"><span>Relative strength</span><strong>{strength?.label || 'Still learning'}</strong>{strength && <small>{Math.abs(strength.performanceGap).toFixed(2)} above baseline · {strength.sessions} sessions</small>}</div>
          </section>
        </div>

        <section className="report-section">
          <div className="report-section-heading"><h3>Gym Calibration</h3><span>Difficulty vs your overall ability</span></div>
          <table className="report-table"><thead><tr><th>Gym</th><th>Sessions</th><th>Send Rate</th><th>Difficulty</th><th>Confidence</th></tr></thead><tbody>
            {report.gyms.map(g => <tr key={g.gym}><td>{g.gym}</td><td>{g.sessions}</td><td>{Math.round(g.sendRate * 100)}%</td><td>{g.difficultyDelta > 0 ? '+' : ''}{g.difficultyDelta} V · {g.calibration}</td><td>{g.confidenceLabel}</td></tr>)}
          </tbody></table>
        </section>

        <section className="report-section report-ai-section">
          <div className="report-section-heading"><h3>Local AI Summary</h3><span>{DEFAULT_OLLAMA_MODEL}</span></div>
          {summary ? <p className="report-ai-copy">{summary}</p> : <p className="report-note">Generate the local AI summary before exporting if you want an Ollama-written narrative included in the PDF. The report is otherwise fully deterministic and exportable without Ollama.</p>}
          {error && <p className="report-error no-print">{error}</p>}
        </section>

        <section className="report-section">
          <div className="report-section-heading"><h3>Recent Sessions</h3><span>Latest 8</span></div>
          <table className="report-table"><thead><tr><th>Date</th><th>Gym</th><th>Grade</th><th>Result</th><th>Attempts</th><th>RPE</th><th>Style</th></tr></thead><tbody>
            {report.recentSessions.map((s, i) => <tr key={`${s.date}-${i}`}><td>{fmtDate(s.date)}</td><td>{s.gym}</td><td>{s.grade}</td><td>{s.sent ? 'Sent' : 'Not sent'}</td><td>{s.attempts || '—'}</td><td>{s.rpe || '—'}</td><td>{s.style}</td></tr>)}
          </tbody></table>
        </section>

        <footer className="report-footer">Generated locally · No cloud AI required · {new Date(report.generatedAt).toLocaleString()}</footer>
      </article>
    </div>
  )
}
