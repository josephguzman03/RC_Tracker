import RadarChart from '../RadarChart/RadarChart'
import useClimberStats from '../../hooks/useClimberStats'
import './DashboardGrid.css'

const WEAKNESS_TIPS = {
  fingerStrength: 'Dedicate one session per week to hangboard work on 20mm edges. Progress slowly.',
  power:          'Add one campus board session per week. Focus on explosive pulls, not lock-offs.',
  endurance:      'Run 4x4s at the end of two sessions per week. Work two grades below your max.',
  technique:      'Climb one session per week with feet-only focus. Slow down every move.',
  mental:         'Practice deliberate falling drills for 10 min each session. Log your fear level.',
  flexibility:    'Add 10 min of hip mobility after every session. Focus on high-step and hip turnout.',
}

export default function DashboardGrid() {
  const {
    weakestLink,
    streak,
    totalSessions,
    thisMonth,
    milestone,
  } = useClimberStats()

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
          <h3 className="info-card-title">{weakestLink.label}</h3>
          <div className="score-bar-wrap">
            <div className="score-bar">
              <div
                className="score-bar-fill warning"
                style={{ width: `${weakestLink.score}%` }}
              />
            </div>
            <span className="score-bar-label">{weakestLink.score} / 100</span>
          </div>
          <p className="info-card-tip">{WEAKNESS_TIPS[weakestLink.key]}</p>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <span className="info-card-eyebrow">Session Streak</span>
            <span className="info-card-badge blue">Active</span>
          </div>
          <h3 className="info-card-title">
            {streak}
            <span className="info-card-title-unit"> sessions</span>
          </h3>
          <div className="streak-stats">
            <div className="streak-stat">
              <span className="streak-stat-value">{thisMonth}</span>
              <span className="streak-stat-label">This month</span>
            </div>
            <div className="streak-stat-divider" />
            <div className="streak-stat">
              <span className="streak-stat-value">{totalSessions}</span>
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
            {milestone.current}
            <span className="info-card-title-arrow"> → </span>
            {milestone.target}
          </h3>
          <div className="score-bar-wrap">
            <div className="score-bar">
              <div
                className="score-bar-fill blue"
                style={{ width: `${milestone.progress}%` }}
              />
            </div>
            <span className="score-bar-label">{milestone.progress}%</span>
          </div>
          <ul className="milestone-blockers">
            {milestone.blockers.map((b, i) => (
              <li key={i} className="milestone-blocker">{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}