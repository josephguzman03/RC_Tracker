import RadarChart from '../RadarChart/RadarChart'
import useClimberStats from '../../hooks/useClimberStats'
import './DashboardGrid.css'

const TIPS = {
  fingerStrength: 'Hangboard on 20mm edges once per week. Increase load slowly.',
  power:          'Campus board once per week — explosive pulls, not lock-offs.',
  endurance:      '4x4s at session end, two grades below max.',
  technique:      'One session per week feet-only. Slow every move down.',
  mental:         'Deliberate falling drills 10 min per session. Log fear level.',
  flexibility:    'Hip mobility 10 min after every session. High-step focus.',
}

export default function DashboardGrid() {
  const { weakestLink, streak, totalSessions, thisMonth, milestone, profileReady, profileStage } = useClimberStats()
  return (
    <div className="dashboard-grid">
      <div className="dashboard-col dashboard-col--left"><RadarChart /></div>
      <div className="dashboard-col dashboard-col--right">
        {profileReady ? (
          <div className="info-card info-card--warning">
            <div className="info-card-header">
              <span className="info-card-eyebrow">Weakest Link</span>
              <span className="info-card-badge warning">Priority</span>
            </div>
            <h3 className="info-card-title">{weakestLink.label}</h3>
            <div className="score-bar-wrap">
              <div className="score-bar"><div className="score-bar-fill warning" style={{width:`${weakestLink.score}%`}}/></div>
              <span className="score-bar-label">{weakestLink.score}/100</span>
            </div>
            <p className="info-card-tip">{TIPS[weakestLink.key]}</p>
          </div>
        ) : (
          <div className="info-card info-card--learning">
            <div className="info-card-header">
              <span className="info-card-eyebrow">Profile Status</span>
              <span className="info-card-badge blue">Learning</span>
            </div>
            <h3 className="info-card-title">{profileStage.label}</h3>
            <p className="info-card-tip">{profileStage.detail}. Strength and weakness estimates will appear once the baseline has enough evidence.</p>
          </div>
        )}
        <div className="info-card">
          <div className="info-card-header">
            <span className="info-card-eyebrow">Session Streak</span>
            <span className="info-card-badge blue">Active</span>
          </div>
          <h3 className="info-card-title">{streak}<span className="info-card-title-unit"> sessions</span></h3>
          <div className="streak-stats">
            <div className="streak-stat"><span className="streak-stat-value">{thisMonth}</span><span className="streak-stat-label">This month</span></div>
            <div className="streak-stat-divider"/>
            <div className="streak-stat"><span className="streak-stat-value">{totalSessions}</span><span className="streak-stat-label">All time</span></div>
          </div>
        </div>
        {profileReady ? (
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-card-eyebrow">Next Milestone</span>
              <span className="info-card-badge orange">In Progress</span>
            </div>
            <h3 className="info-card-title">{milestone.current}<span className="info-card-title-arrow"> → </span>{milestone.target}</h3>
            <div className="score-bar-wrap">
              <div className="score-bar"><div className="score-bar-fill blue" style={{width:`${milestone.progress}%`}}/></div>
              <span className="score-bar-label">{milestone.progress}%</span>
            </div>
            <ul className="milestone-blockers">
              {milestone.blockers.map((b, i) => <li key={i} className="milestone-blocker">{b}</li>)}
            </ul>
          </div>
        ) : (
          <div className="info-card">
            <div className="info-card-header">
              <span className="info-card-eyebrow">Next Milestone</span>
              <span className="info-card-badge blue">Waiting</span>
            </div>
            <h3 className="info-card-title">Collecting evidence</h3>
            <p className="info-card-tip">Keep logging normally. The tracker will avoid inventing a milestone from one or two sessions.</p>
          </div>
        )}
      </div>
    </div>
  )
}