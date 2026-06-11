import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import Sessions from './pages/Sessions'
import InjuryTracker from './pages/InjuryTracker'
import MoodLog from './pages/MoodLog'
import Prediction from './pages/Prediction'

export const NAV_ITEMS = [
  { key: 'profile',    label: 'Climber Profile', icon: '⬡', path: '/profile'    },
  { key: 'analytics',  label: 'Analytics',        icon: '◈', path: '/analytics'  },
  { key: 'sessions',   label: 'Sessions',         icon: '▦', path: '/sessions'   },
  { key: 'injury',     label: 'Injury Tracker',   icon: '◎', path: '/injury'     },
  { key: 'mood',       label: 'Mood Log',         icon: '◉', path: '/mood'       },
  { key: 'prediction', label: 'Prediction',       icon: '▲', path: '/prediction' },
]

export default function App() {
  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">🧗</div>
          <span className="navbar-name">Climbing Tracker</span>
        </div>
        <div className="navbar-right">
          <span className="navbar-status">
            <span className="status-dot" />
            Session Active
          </span>
          <span className="navbar-meta">PHASE 1 — PROTOTYPE</span>
        </div>
      </nav>

      <div className="app-body">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Navigate to="/profile" replace />} />
            <Route path="/profile"    element={<Profile />} />
            <Route path="/analytics"  element={<Analytics />} />
            <Route path="/sessions"   element={<Sessions />} />
            <Route path="/injury"     element={<InjuryTracker />} />
            <Route path="/mood"       element={<MoodLog />} />
            <Route path="/prediction" element={<Prediction />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}