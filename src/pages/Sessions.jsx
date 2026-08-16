import { useState } from 'react'
import FileUpload from '../components/FileUpload/FileUpload'
import { useSessionContext } from '../context/SessionContext'
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
  const { sessions, clearSessions, storageReady, lastSavedAt } = useSessionContext()
  const [sortKey, setSortKey]       = useState('date')
  const [sortDir, setSortDir]       = useState('desc')
  const [filter, setFilter]         = useState('')
  const [sentFilter, setSentFilter] = useState('all')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function handleClear() {
    if (!sessions.length) return
    const confirmed = window.confirm(
      `Clear all ${sessions.length} locally saved climbing sessions? Your Excel file will not be changed.`
    )
    if (confirmed) clearSessions()
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
              {storageReady ? (sessions.length ? `${sessions.length} sessions retained on this device` : 'Local storage ready') : 'Loading saved sessions...'}
            </p>
            <p className="persistence-sub">
              {sessions.length
                ? `${formatSavedTime(lastSavedAt)} · Refreshing or reopening this browser will keep this dataset.`
                : 'Import your spreadsheet once. Future imports can merge only the new rows.'}
            </p>
          </div>
          {sessions.length > 0 && (
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
              <p className="template-card-sub">13 columns · keep one growing workbook as your source log</p>
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
        </div>
      </div>
    </div>
  )
}
