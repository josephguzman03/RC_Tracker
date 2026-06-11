import StatCards from '../components/StatCards/StatCards'
import RadarChart from '../components/RadarChart/RadarChart'
import DashboardGrid from '../components/DashboardGrid/DashboardGrid'
import './Profile.css'

export default function Profile() {
  return (
    <div className="profile-page">
      <StatCards />
      <DashboardGrid />
    </div>
  )
}