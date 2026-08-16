import { useState } from 'react'
import FileUpload from '../components/FileUpload/FileUpload'
import { useSessionContext } from '../context/SessionContext'
import { getCrossTrainingSummary } from '../utils/crossTraining'
import './Sessions.css'

const COLUMNS = [
  { name: 'Date',         desc: 'YYYY-MM-DD'                            },
  { name: 'Gym',          desc: 'Gym name for sandbag calibration'       },
  { name: 'Grade',        desc: 'V-scale number (5 for V5)'              },
  { name: 'Wall Angle',   desc: 'Degrees - slab under 90, cave over 120' },
  { name: 'Style',        desc: 'slab / vertical / overhang / cave'      },
  { name: 'Holds',        desc: 'crimp / sloper / pinch / pocket / jug'  },
  { name: 'Attempts',     desc: 'Total attempts on hardest problem'       },
  { name: 'Sent',         desc: 'TRUE or FALSE'                          },
  { name: 'RPE',          desc: '1-10 effort rating'                     },
  { name: 'Rest Days',    desc: 'Days since last session'                },
  { name: 'Session Type', desc: 'project / volume / technique'           },
  { name: 'Injury Flag',  desc: 'none / finger / shoulder / elbow'       },
  { name: 'Notes',        desc: 'Free text - feeds NLP analysis'         },
]

const CROSS_TRAINING_COLUMNS = [
  { name: 'Date',        desc: 'YYYY-MM-DD' },
  { name: 'Type',        desc: 'strength / cardio' },
  { name: 'Focus',       desc: 'pull / legs / push / run / bike / etc.' },
  { name: 'Duration',    desc: 'Minutes' },
  { name: 'RPE',         desc: '1-10 effort rating' },
  { name: 'Finger Load', desc: 'none / low / medium / high' },
  { name: 'Notes',       desc: 'Free text' },
]

const TABLE_COLS = [
  { key: 'date',       label: 'Date'   },
  { key: 'gym',        label: 'Gym'    },
  { key: 'grade',      label: 'Grade'  },
  { key: 'style',      label: 'Style'  },
  { key: 'sent',       label: 'Sent'   },
  { key: 'rpe',        label: 'RPE'    },
  { key: 'injuryFlag', label: 'Injury' },
  { key: 'notes',      label: 'Notes'  },
]

function formatSavedTime(value) {
  if (!value) return 'Saved locally'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Saved locally'
  return `Saved locally · ${date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
}

export default function Sessions() {
  const { sessions, crossTraining, clearAllData, storageReady, lastSavedAt } = useSessionContext()
  const crossSummary = getCrossTrainingSummary(crossTraining)
  const [sortKey, setSortKey]       = useState('date')
  const [sortDir, setSortDir]       = useState('desc')
  const [filter, setFilter]         = useState('')
  const [sentFilter, setSentFilter] = useState('all')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleClear() {
    if (!sessions.length && !crossTraining.length) return
    const confirmed = window.confirm(
      `Clear ${sessions.length} climbing and ${crossTraining.length} cross-training rows saved on this device? Your Excel file will not be changed.`
    )
    if (confirmed) clearAllData()
  }

  const filtered = sessions
    .filter(s => {
      const matchText = filter === '' ||
        String(s.gym || '').toLowerCase().includes(filter.toLowerCase()) ||
        String(s.style || '').toLowerCase().includes(filter.toLowerCase()) ||
        String(s.notes || '').toLowerCase().includes(filter.toLowerCase())
      const matchSent = sentFilter === 'all' ||
        (sentFilter === 'sent' && s.sent) ||
        (sentFilter === 'fail' && !s.sent)
      return matchText && matchSent
    })
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey]
      if (sortKey === 'date') { av = new Date(av); bv = new Date(bv) }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <p className="sessions-eyebrow">Local Data</p>
        <h1 className="sessions-title">Session Log</h1>
        <p className="sessions-sub">
          Keep logging in Excel wherever it is convenient. Import the updated file here and the tracker keeps a persistent local copy between refreshes and restarts.
        </p>
      </div>

      <div className="sessions-body">
        <div className={`persistence-card ${sessions.length ? 'has-data' : ''}`}>
          <div className="persistence-status-dot" />
          <div className="persistence-copy">
            <p className="persistence-title">
              {storageReady ? ((sessions.length || crossTraining.length) ? `${sessions.length} climbing · ${crossTraining.length} cross-training rows retained` : 'Local storage ready') : 'Loading saved training data...'}
            </p>
            <p className="persistence-sub">
              {(sessions.length || crossTraining.length)
                ? `${formatSavedTime(lastSavedAt)} · Refreshing or reopening this browser will keep both datasets.`
                : 'Import your spreadsheet once. Future imports can merge only the new rows.'}
            </p>
          </div>
          {(sessions.length > 0 || crossTraining.length > 0) && (
            <button type="button" className="persistence-clear-btn" onClick={handleClear}>
              Clear Local Data
            </button>
          )}
        </div>

        <div className="template-card">
          <div className="template-card-left">
            <span className="template-icon">⬡</span>
            <div>
              <p className="template-card-title">climbing_template.xlsx</p>
              <p className="template-card-sub">Sessions + Cross Training sheets · keep one growing workbook as your source log</p>
            </div>
          </div>
          <a className="template-download-btn" href="/climbing_template.xlsx" download="climbing_template.xlsx">
            Download Template
          </a>
        </div>

        <FileUpload />

        {sessions.length > 0 && (
          <div className="sessions-preview">
            <div className="sessions-controls">
              <p className="sessions-preview-label">{filtered.length} of {sessions.length} sessions</p>
              <div className="sessions-filters">
                <input
                  className="sessions-search"
                  placeholder="Search gym, style, notes..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
                <div className="sent-toggle">
                  {['all', 'sent', 'fail'].map(v => (
                    <button
                      key={v}
                      className={`sent-toggle-btn ${sentFilter === v ? 'active' : ''}`}
                      onClick={() => setSentFilter(v)}
                    >
                      {v === 'all' ? 'All' : v === 'sent' ? 'Sent' : 'Failed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sessions-table-wrap">
              <table className="sessions-table">
                <thead>
                  <tr>
                    {TABLE_COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className={sortKey === col.key ? 'sorted' : ''}
                      >
                        {col.label}
                        <span className="sort-arrow">
                          {sortKey === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id}>
                      <td>{s.date}</td>
                      <td>{s.gym}</td>
                      <td>V{s.grade}</td>
                      <td>{s.style}</td>
                      <td className={s.sent ? 'sent-yes' : 'sent-no'}>{s.sent ? 'Yes' : 'No'}</td>
                      <td>{s.rpe}</td>
                      <td className={s.injuryFlag !== 'none' ? 'injury-flag' : ''}>{s.injuryFlag}</td>
                      <td className="notes-cell">{s.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="cross-training-overview">
          <div className="cross-training-overview-head">
            <div>
              <p className="columns-title">Cross Training</p>
              <p className="cross-training-sub">Strength and cardio stay separate from climbing ability, but are now stored for future load/recovery modeling.</p>
            </div>
            <span className="cross-training-count">{crossTraining.length} logs</span>
          </div>
          <div className="cross-training-metrics">
            <div><strong>{crossSummary.strength.sessions}</strong><span>Strength</span></div>
            <div><strong>{crossSummary.cardio.sessions}</strong><span>Cardio</span></div>
            <div><strong>{crossSummary.totalMinutes}</strong><span>Total min</span></div>
            <div><strong>{crossSummary.thisWeek.load}</strong><span>Recent load</span></div>
          </div>
          {crossTraining.length > 0 && (
            <div className="cross-training-table-wrap">
              <table className="cross-training-table">
                <thead><tr><th>Date</th><th>Type</th><th>Focus</th><th>Duration</th><th>RPE</th><th>Finger Load</th><th>Notes</th></tr></thead>
                <tbody>
                  {[...crossTraining].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 12).map(entry => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td><td>{entry.type}</td><td>{entry.focus || '—'}</td><td>{entry.durationMinutes} min</td><td>{entry.rpe}</td><td>{entry.fingerLoad}</td><td className="notes-cell">{entry.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="columns-section">
          <p className="columns-title">Template columns</p>
          <div className="columns-grid">
            {COLUMNS.map(col => (
              <div key={col.name} className="column-item">
                <span className="column-name">{col.name}</span>
                <span className="column-desc">{col.desc}</span>
              </div>
            ))}
          </div>
          <p className="columns-title cross-training-columns-title">Cross Training sheet columns</p>
          <div className="columns-grid">
            {CROSS_TRAINING_COLUMNS.map(col => (
              <div key={col.name} className="column-item">
                <span className="column-name">{col.name}</span>
                <span className="column-desc">{col.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
