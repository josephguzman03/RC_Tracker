import { useSessionContext } from '../context/SessionContext'

const SAMPLE = [
  { date: '2026-05-01', grade: 4, sent: true,  rpe: 7, restDays: 2, holds: ['crimp','sloper'],        gym: 'Mesa Rim', style: 'overhang', wallAngle: 110, attempts: 3, sessionType: 'volume',    injuryFlag: 'none',   notes: 'Felt solid'           },
  { date: '2026-05-03', grade: 4, sent: true,  rpe: 6, restDays: 2, holds: ['jug','pinch'],            gym: 'Mesa Rim', style: 'vertical', wallAngle: 90,  attempts: 2, sessionType: 'volume',    injuryFlag: 'none',   notes: 'Easy session'         },
  { date: '2026-05-06', grade: 5, sent: false, rpe: 8, restDays: 3, holds: ['crimp','pocket'],         gym: 'Movement', style: 'overhang', wallAngle: 115, attempts: 6, sessionType: 'project',   injuryFlag: 'none',   notes: 'Pump got me'          },
  { date: '2026-05-08', grade: 5, sent: true,  rpe: 7, restDays: 2, holds: ['sloper','crimp'],         gym: 'Mesa Rim', style: 'vertical', wallAngle: 95,  attempts: 4, sessionType: 'project',   injuryFlag: 'none',   notes: 'Finally stuck it'     },
  { date: '2026-05-10', grade: 5, sent: true,  rpe: 6, restDays: 2, holds: ['jug','crimp'],            gym: 'Movement', style: 'vertical', wallAngle: 90,  attempts: 3, sessionType: 'volume',    injuryFlag: 'none',   notes: 'Felt light'           },
  { date: '2026-05-13', grade: 5, sent: false, rpe: 9, restDays: 3, holds: ['crimp','crimp','pocket'], gym: 'Mesa Rim', style: 'overhang', wallAngle: 120, attempts: 7, sessionType: 'project',   injuryFlag: 'none',   notes: 'Too pumped to finish' },
  { date: '2026-05-15', grade: 5, sent: true,  rpe: 7, restDays: 2, holds: ['pinch','sloper'],         gym: 'Movement', style: 'overhang', wallAngle: 110, attempts: 5, sessionType: 'technique', injuryFlag: 'none',   notes: 'Footwork clicked'     },
  { date: '2026-05-18', grade: 6, sent: false, rpe: 9, restDays: 3, holds: ['crimp','crimp'],          gym: 'Mesa Rim', style: 'cave',     wallAngle: 135, attempts: 4, sessionType: 'project',   injuryFlag: 'none',   notes: 'So far off'           },
  { date: '2026-05-20', grade: 5, sent: true,  rpe: 6, restDays: 2, holds: ['jug','pinch'],            gym: 'Movement', style: 'vertical', wallAngle: 90,  attempts: 2, sessionType: 'volume',    injuryFlag: 'none',   notes: 'Cruised it'           },
  { date: '2026-05-22', grade: 6, sent: false, rpe: 8, restDays: 2, holds: ['crimp','pocket'],         gym: 'Mesa Rim', style: 'overhang', wallAngle: 120, attempts: 5, sessionType: 'project',   injuryFlag: 'none',   notes: 'Left hand weak'       },
  { date: '2026-05-25', grade: 5, sent: true,  rpe: 5, restDays: 3, holds: ['sloper','jug'],           gym: 'Movement', style: 'slab',     wallAngle: 80,  attempts: 2, sessionType: 'technique', injuryFlag: 'none',   notes: 'Slab practice'        },
  { date: '2026-05-27', grade: 6, sent: false, rpe: 9, restDays: 2, holds: ['crimp','crimp','pinch'],  gym: 'Mesa Rim', style: 'cave',     wallAngle: 140, attempts: 6, sessionType: 'project',   injuryFlag: 'finger', notes: 'Finger tweaky'        },
  { date: '2026-05-30', grade: 5, sent: true,  rpe: 6, restDays: 3, holds: ['jug','sloper'],           gym: 'Movement', style: 'vertical', wallAngle: 90,  attempts: 3, sessionType: 'volume',    injuryFlag: 'none',   notes: 'Good recovery day'    },
  { date: '2026-06-02', grade: 6, sent: false, rpe: 8, restDays: 3, holds: ['crimp','pocket'],         gym: 'Mesa Rim', style: 'overhang', wallAngle: 115, attempts: 5, sessionType: 'project',   injuryFlag: 'none',   notes: 'Close on crux'        },
  { date: '2026-06-04', grade: 5, sent: true,  rpe: 7, restDays: 2, holds: ['pinch','crimp'],          gym: 'Movement', style: 'vertical', wallAngle: 95,  attempts: 3, sessionType: 'technique', injuryFlag: 'none',   notes: 'Focused on hips'      },
  { date: '2026-06-06', grade: 6, sent: false, rpe: 9, restDays: 2, holds: ['crimp','crimp','sloper'], gym: 'Mesa Rim', style: 'cave',     wallAngle: 135, attempts: 7, sessionType: 'project',   injuryFlag: 'none',   notes: 'Sandbagged for sure'  },
  { date: '2026-06-08', grade: 5, sent: true,  rpe: 6, restDays: 2, holds: ['jug','pinch'],            gym: 'Movement', style: 'vertical', wallAngle: 90,  attempts: 2, sessionType: 'volume',    injuryFlag: 'none',   notes: 'Light day'            },
  { date: '2026-06-09', grade: 6, sent: false, rpe: 8, restDays: 1, holds: ['crimp','pocket','crimp'], gym: 'Mesa Rim', style: 'overhang', wallAngle: 120, attempts: 4, sessionType: 'project',   injuryFlag: 'none',   notes: 'Tired from yesterday' },
]

const SAMPLE_ATTRS = [
  { key: 'fingerStrength', label: 'Finger Strength', score: 72 },
  { key: 'power',          label: 'Power',           score: 58 },
  { key: 'endurance',      label: 'Endurance',       score: 65 },
  { key: 'technique',      label: 'Technique',       score: 80 },
  { key: 'mental',         label: 'Mental',          score: 55 },
  { key: 'flexibility',    label: 'Flexibility',     score: 48 },
]

function deriveAttributes(sessions) {
  const n = sessions.length || 1
  const cap = v => Math.min(Math.max(Math.round(v), 1), 99)
  const norm = (v, max) => Math.min(v / max, 1)
  const sendRateValue = sessions.filter(s => s.sent).length / n

  const raw = [
    { key: 'fingerStrength', label: 'Finger Strength', score: cap(40 + norm(sessions.filter(s => s.holds.includes('crimp')).length, n) * 60) },
    { key: 'power',          label: 'Power',           score: cap(30 + norm(sessions.filter(s => s.wallAngle > 90).length, n) * 70) },
    { key: 'endurance',      label: 'Endurance',       score: cap(30 + (1 - norm(sessions.reduce((a,s)=>a+s.rpe,0)/n, 10)) * 70) },
    { key: 'technique',      label: 'Technique',       score: cap(30 + norm(sessions.filter(s => s.sessionType === 'technique').length, n) * 70) },
    { key: 'mental',         label: 'Mental',           score: cap(30 + sendRateValue * 70) },
    { key: 'flexibility',    label: 'Flexibility',      score: cap(20 + norm(sessions.filter(s => s.wallAngle < 90).length, n) * 80) },
  ]

  // Small samples are pulled toward a neutral midpoint instead of pretending
  // one or two sessions define a climber's strengths and weaknesses.
  const confidence = Math.min(Math.max((n - 2) / 8, 0), 1)
  return raw.map(attr => ({
    ...attr,
    score: Math.round(50 + (attr.score - 50) * confidence),
  }))
}

const validDate = value => {
  const d = new Date(`${value}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const desc = s => [...s].sort((a,b) => {
  const da = validDate(a.date)?.getTime() ?? 0
  const db = validDate(b.date)?.getTime() ?? 0
  return db - da
})

const maxSent = s => {
  const grades = s
    .filter(x => x.sent && Number.isFinite(Number(x.grade)))
    .map(x => Number(x.grade))
  return grades.length ? Math.max(...grades) : 0
}

const restDays = s => {
  const latest = desc(s)[0]
  const date = latest ? validDate(latest.date) : null
  if (!date) return 0

  const now = new Date()
  now.setHours(12,0,0,0)
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000)
  return Math.max(0, days)
}

const thisWeek = s => {
  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0,0,0,0)
  return s.filter(x => {
    const date = validDate(x.date)
    return date ? date >= monday : false
  }).length
}

const sendRate = s => s.length
  ? `${Math.round(s.filter(x=>x.sent).length / s.length * 100)}%`
  : '0%'

const sendDelta = s => {
  if (s.length < 4) return 'Learning baseline'
  const m = Math.floor(s.length / 2)
  const older = s.slice(0, m)
  const newer = s.slice(m)
  const ro = older.filter(x=>x.sent).length / (older.length || 1)
  const rn = newer.filter(x=>x.sent).length / (newer.length || 1)
  const d = Math.round((rn - ro) * 100)
  return d >= 0 ? `+${d}% vs last period` : `${d}% vs last period`
}

const streak = s => {
  let k = 0
  for (const x of desc(s)) {
    if (x.sent) k++
    else break
  }
  return k
}

const weakest = a => a?.length ? [...a].sort((a,b)=>a.score-b.score)[0] : null

const loadStatus = s => {
  if (s.length < 3) return { label: 'Learning baseline', color: 'neutral' }
  const recent = desc(s).slice(0, 4)
  const avg = recent.reduce((a,x)=>a + Number(x.rpe || 0), 0) / (recent.length || 1)
  return avg >= 8.5
    ? { label:'High load — consider rest', color:'orange' }
    : avg >= 7
      ? { label:'Load ratio within range', color:'green' }
      : { label:'Low load — room to push', color:'blue' }
}

function profileStage(count) {
  if (count < 3) return { key: 'insufficient', label: 'Learning', detail: `${count}/3 sessions for an early profile` }
  if (count < 6) return { key: 'early', label: 'Early estimate', detail: `${count} sessions recorded` }
  if (count < 10) return { key: 'developing', label: 'Developing', detail: `${count} sessions recorded` }
  return { key: 'established', label: 'Established estimate', detail: `${count} sessions recorded` }
}

function milestone(sessions, attrs) {
  const g = maxSent(sessions)
  const fScore = attrs.find(a=>a.key==='fingerStrength')?.score ?? 50
  const sloperSessions = sessions.filter(s=>s.holds.includes('sloper'))
  const slopR = sloperSessions.length
    ? Math.round(sloperSessions.filter(s=>s.sent).length / sloperSessions.length * 100)
    : 0

  return {
    current: `V${g}`,
    target: `V${Math.min(g + 1, 15)}`,
    progress: Math.min(Math.round((fScore/78)*60 + (slopR/50)*40), 100),
    blockers: [
      `Finger strength estimate at ${fScore} — more sessions improve confidence`,
      sloperSessions.length ? `Sloper send rate ${slopR}%` : 'No sloper sessions logged yet',
    ],
  }
}

export default function useClimberStats() {
  const { sessions: uploaded } = useSessionContext()
  const isReal = Boolean(uploaded?.length)
  const sessions = isReal ? uploaded : SAMPLE
  const stage = profileStage(sessions.length)
  const profileReady = !isReal || sessions.length >= 3
  const attrs = isReal ? deriveAttributes(sessions) : SAMPLE_ATTRS
  const load = loadStatus(sessions)

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  return {
    sessions,
    attributes: attrs,
    isReal,
    profileReady,
    profileStage: stage,
    currentGrade: `V${maxSent(sessions)}`,
    sessionsThisWeek: thisWeek(sessions),
    restDays: restDays(sessions),
    sendRate: sendRate(sessions),
    sendRateDelta: sendDelta(sessions),
    streak: streak(sessions),
    totalSessions: sessions.length,
    thisMonth: sessions.filter(s => {
      const d = validDate(s.date)
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear
    }).length,
    weakestLink: profileReady ? weakest(attrs) : null,
    milestone: profileReady ? milestone(sessions, attrs) : null,
    loadStatus: load,
  }
}