import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import Profile from './pages/Profile'
import Analytics from './pages/Analytics'
import Sessions from './pages/Sessions'
import InjuryTracker from './pages/InjuryTracker'
import MoodLog from './pages/MoodLog'
import Prediction from './pages/Prediction'
import AICoach from './pages/AICoach'
import ProgressReport from './pages/ProgressReport'
import useClimberStats from './hooks/useClimberStats'
import { checkOllama, DEFAULT_OLLAMA_MODEL } from './ai/ollama'

export const NAV_ITEMS = [
  { key: 'profile',    label: 'Climber Profile', icon: '⬡', path: '/profile'    },
  { key: 'analytics',  label: 'Analytics',        icon: '◈', path: '/analytics'  },
  { key: 'sessions',   label: 'Sessions',         icon: '▦', path: '/sessions'   },
  { key: 'injury',     label: 'Injury Tracker',   icon: '◎', path: '/injury'     },
  { key: 'mood',       label: 'Mood Log',         icon: '◉', path: '/mood'       },
  { key: 'prediction', label: 'Prediction',       icon: '▲', path: '/prediction' },
  { key: 'coach',      label: 'AI Coach',         icon: '◆', path: '/coach'      },
  { key: 'report',     label: 'Progress Report',  icon: '▤', path: '/report'     },
]

function NavbarStatus() {
  const { isReal } = useClimberStats()
  const [aiStatus, setAiStatus] = useState('checking')

  useEffect(() => {
    let active = true
    checkOllama().then(result => {
      if (!active) return
      setAiStatus(!result.available ? 'offline' : result.modelAvailable ? 'ready' : 'missing')
    })
    return () => { active = false }
  }, [])

  const aiLabel = aiStatus === 'ready'
    ? DEFAULT_OLLAMA_MODEL
    : aiStatus === 'missing'
      ? 'Model missing'
      : aiStatus === 'offline'
        ? 'AI offline'
        : 'Checking AI'

  return (
    <div className="navbar-status-group">
      <span className="navbar-status" title={isReal ? 'Using your uploaded session log' : 'Using built-in sample sessions'}>
        <span className={`status-dot ${isReal ? 'live' : 'sample'}`} />
        {isReal ? 'Live Data' : 'Sample Data'}
      </span>
      <span className={`navbar-ai-status navbar-ai-status--${aiStatus}`} title="Local Ollama status">
        <span className="status-dot" />
        {aiLabel}
      </span>
    </div>
  )
}

export default function App() {
  return (
    <div className="app-layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">🧗</div>
          <span className="navbar-name">Climbing Tracker</span>
        </div>
        <div className="navbar-right">
          <NavbarStatus />
          <span className="navbar-meta">LOCAL-FIRST · v1.0</span>
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
            <Route path="/coach"      element={<AICoach />} />
            <Route path="/report"     element={<ProgressReport />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}