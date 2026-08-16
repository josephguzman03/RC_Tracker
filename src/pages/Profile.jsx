import StatCards from '../components/StatCards/StatCards'
import DashboardGrid from '../components/DashboardGrid/DashboardGrid'
import useClimberStats from '../hooks/useClimberStats'
import './Profile.css'

export default function Profile() {
  const { isReal } = useClimberStats()

  return (
    <div className="profile-page">
      {!isReal && (
        <div className="sample-banner">
          <span className="sample-banner-dot" />
          <span>Showing sample data — go to Sessions to upload your climbing log</span>
        </div>
      )}
      <StatCards />
      <DashboardGrid />
    </div>
  )
}