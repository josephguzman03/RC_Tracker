import useClimberStats from '../../hooks/useClimberStats'
import './StatCards.css'

export default function StatCards() {
  const {
    currentGrade,
    sessionsThisWeek,
    restDays,
    sendRate,
    sendRateDelta,
    loadStatus,
  } = useClimberStats()

  const STATS = [
    {
      key:   'grade',
      label: 'Current Grade',
      value: currentGrade,
      sub:   'Highest sent this block',
      color: 'blue',
    },
    {
      key:   'sessions',
      label: 'Sessions This Week',
      value: String(sessionsThisWeek),
      sub:   `${restDays} day${restDays !== 1 ? 's' : ''} since last session`,
      color: 'neutral',
    },
    {
      key:   'restdays',
      label: 'Load Status',
      value: restDays === 0 ? 'Today' : `${restDays}d rest`,
      sub:   loadStatus.label,
      color: loadStatus.color,
    },
    {
      key:   'sendrate',
      label: 'Send Rate',
      value: sendRate,
      sub:   sendRateDelta,
      color: 'orange',
    },
  ]

  return (
    <div className="statcards-grid">
      {STATS.map(stat => (
        <div key={stat.key} className={`statcard statcard--${stat.color}`}>
          <span className="statcard-label">{stat.label}</span>
          <span className="statcard-value">{stat.value}</span>
          <span className="statcard-sub">{stat.sub}</span>
        </div>
      ))}
    </div>
  )
}