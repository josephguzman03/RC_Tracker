import RadarChart from '../RadarChart/RadarChart'
import './DashboardGrid.css'

const WEAKEST_LINK = {
  attribute: 'Flexibility',
  score:     48,
  tip:       'Your flexibility is limiting high-step moves on slab. Add 10 min of hip mobility after every session.',
}

const STREAK_DATA = {
  streak:      6,
  totalSessions: 24,
  thisMonth:   8,
}

const MILESTONE = {
  current:  'V5',
  target:   'V6',
  progress: 68,
  blockers: ['Finger strength at 72 — needs 78+', 'Sloper send rate only 31%'],
}

export default function DashboardGrid() {
  return (
    <div className="dashboard-grid">
      <div className="dashboard-col dashboard-col--left">
        <RadarChart />
      </div>

      <div className="dashboard-col dashboard-col--right">
        <div className="info-card info-card--warning">
          <div className="info-card-header">
            <span className="info-card-eyebrow">Weakest Link</span>
            <span className="info-card-badge warning">Priority</span>
          </div>
          <h3 className="info-card-title">{WEAKEST_LINK.attribute}</h3>
          <div className="score-bar-wrap">
            <div className="score-bar">
              <div
                className="score-bar-fill warning"
                style={{ width: `${WEAKEST_LINK.score}%` }}
              />
            </div>
            <span className="score-bar-label">{WEAKEST_LINK.score} / 100</span>
          </div>
          <p className="info-card-tip">{WEAKEST_LINK.tip}</p>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <span className="info-card-eyebrow">Session Streak</span>
            <span className="info-card-badge blue">Active</span>
          </div>
          <h3 className="info-card-title">
            {STREAK_DATA.streak}
            <span className="info-card-title-unit"> sessions</span>
          </h3>
          <div className="streak-stats">
            <div className="streak-stat">
              <span className="streak-stat-value">{STREAK_DATA.thisMonth}</span>
              <span className="streak-stat-label">This month</span>
            </div>
            <div className="streak-stat-divider" />
            <div className="streak-stat">
              <span className="streak-stat-value">{STREAK_DATA.totalSessions}</span>
              <span className="streak-stat-label">All time</span>
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <span className="info-card-eyebrow">Next Milestone</span>
            <span className="info-card-badge orange">In Progress</span>
          </div>
          <h3 className="info-card-title">
            {MILESTONE.current}
            <span className="info-card-title-arrow"> → </span>
            {MILESTONE.target}
          </h3>
          <div className="score-bar-wrap">
            <div className="score-bar">
              <div
                className="score-bar-fill blue"
                style={{ width: `${MILESTONE.progress}%` }}
              />
            </div>
            <span className="score-bar-label">{MILESTONE.progress}%</span>
          </div>
          <ul className="milestone-blockers">
            {MILESTONE.blockers.map((b, i) => (
              <li key={i} className="milestone-blocker">{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}