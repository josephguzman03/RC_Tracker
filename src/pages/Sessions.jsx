import './Sessions.css'

const COLUMNS = [
  { name: 'Date',         desc: 'YYYY-MM-DD'                               },
  { name: 'Gym',          desc: 'Gym name for sandbag calibration'          },
  { name: 'Grade',        desc: 'V-scale number (5 for V5)'                 },
  { name: 'Wall Angle',   desc: 'Degrees - slab under 90, cave over 120'    },
  { name: 'Style',        desc: 'slab / vertical / overhang / cave'         },
  { name: 'Holds',        desc: 'crimp / sloper / pinch / pocket / jug'     },
  { name: 'Attempts',     desc: 'Total attempts on hardest problem'          },
  { name: 'Sent',         desc: 'TRUE or FALSE'                             },
  { name: 'RPE',          desc: '1-10 effort rating'                        },
  { name: 'Rest Days',    desc: 'Days since last session'                   },
  { name: 'Session Type', desc: 'project / volume / technique'              },
  { name: 'Injury Flag',  desc: 'none / finger / shoulder / elbow'          },
  { name: 'Notes',        desc: 'Free text - feeds NLP analysis'            },
]

export default function Sessions() {
  return (
    <div className="sessions-page">

      <div className="sessions-header">
        <p className="sessions-eyebrow">Phase 3 - Coming Next</p>
        <h1 className="sessions-title">Session Log</h1>
        <p className="sessions-sub">
          Download the template, fill in your sessions, then upload it here.
          The entire app updates from your data.
        </p>
      </div>

      <div className="sessions-body">

        <div className="template-card">
          <div className="template-card-left">
            <span className="template-icon">⬡</span>
            <div>
              <p className="template-card-title">climbing_template.xlsx</p>
              <p className="template-card-sub">
                13 columns · 4 sample rows · Guide sheet included
              </p>
            </div>
          </div>
          <a className="template-download-btn" href="/climbing_template.xlsx" download="climbing_template.xlsx">
            Download Template
          </a>
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
        </div>

        <div className="upload-placeholder">
          <span className="upload-placeholder-icon">▦</span>
          <p className="upload-placeholder-text">File upload arrives in Git 12</p>
        </div>

      </div>
    </div>
  )
}