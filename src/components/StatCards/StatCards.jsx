import './StatCards.css'

const STATS = [
  {
    key:     'grade',
    label:   'Current Grade',
    value:   'V5',
    sub:     'Projected V6 in 6 weeks',
    color:   'blue',
  },
  {
    key:     'sessions',
    label:   'Sessions This Week',
    value:   '3',
    sub:     '2 days since last session',
    color:   'neutral',
  },
  {
    key:     'restdays',
    label:   'Rest Days (30d)',
    value:   '12',
    sub:     'Load ratio within range',
    color:   'green',
  },
  {
    key:     'sendrate',
    label:   'Send Rate',
    value:   '64%',
    sub:     '+8% vs last month',
    color:   'orange',
  },
]

export default function StatCards() {
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