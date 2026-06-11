const SAMPLE_SESSIONS = [
    { date: '2026-05-01', grade: 4, sent: true,  rpe: 7, restDays: 2, holds: ['crimp', 'sloper'],          gym: 'Mesa Rim'    },
    { date: '2026-05-03', grade: 4, sent: true,  rpe: 6, restDays: 2, holds: ['jug', 'pinch'],             gym: 'Mesa Rim'    },
    { date: '2026-05-06', grade: 5, sent: false, rpe: 8, restDays: 3, holds: ['crimp', 'pocket'],          gym: 'Movement'    },
    { date: '2026-05-08', grade: 5, sent: true,  rpe: 7, restDays: 2, holds: ['sloper', 'crimp'],          gym: 'Mesa Rim'    },
    { date: '2026-05-10', grade: 5, sent: true,  rpe: 6, restDays: 2, holds: ['jug', 'crimp'],             gym: 'Movement'    },
    { date: '2026-05-13', grade: 5, sent: false, rpe: 9, restDays: 3, holds: ['crimp', 'crimp', 'pocket'], gym: 'Mesa Rim'    },
    { date: '2026-05-15', grade: 5, sent: true,  rpe: 7, restDays: 2, holds: ['pinch', 'sloper'],          gym: 'Movement'    },
    { date: '2026-05-18', grade: 6, sent: false, rpe: 9, restDays: 3, holds: ['crimp', 'crimp'],           gym: 'Mesa Rim'    },
    { date: '2026-05-20', grade: 5, sent: true,  rpe: 6, restDays: 2, holds: ['jug', 'pinch'],             gym: 'Movement'    },
    { date: '2026-05-22', grade: 6, sent: false, rpe: 8, restDays: 2, holds: ['crimp', 'pocket'],          gym: 'Mesa Rim'    },
    { date: '2026-05-25', grade: 5, sent: true,  rpe: 5, restDays: 3, holds: ['sloper', 'jug'],            gym: 'Movement'    },
    { date: '2026-05-27', grade: 6, sent: false, rpe: 9, restDays: 2, holds: ['crimp', 'crimp', 'pinch'],  gym: 'Mesa Rim'    },
    { date: '2026-05-30', grade: 5, sent: true,  rpe: 6, restDays: 3, holds: ['jug', 'sloper'],            gym: 'Movement'    },
    { date: '2026-06-02', grade: 6, sent: false, rpe: 8, restDays: 3, holds: ['crimp', 'pocket'],          gym: 'Mesa Rim'    },
    { date: '2026-06-04', grade: 5, sent: true,  rpe: 7, restDays: 2, holds: ['pinch', 'crimp'],           gym: 'Movement'    },
    { date: '2026-06-06', grade: 6, sent: false, rpe: 9, restDays: 2, holds: ['crimp', 'crimp', 'sloper'], gym: 'Mesa Rim'    },
    { date: '2026-06-08', grade: 5, sent: true,  rpe: 6, restDays: 2, holds: ['jug', 'pinch'],             gym: 'Movement'    },
    { date: '2026-06-09', grade: 6, sent: false, rpe: 8, restDays: 1, holds: ['crimp', 'pocket', 'crimp'], gym: 'Mesa Rim'    },
  ]
  
  const ATTRIBUTES = [
    { key: 'fingerStrength', label: 'Finger Strength', score: 72 },
    { key: 'power',          label: 'Power',           score: 58 },
    { key: 'endurance',      label: 'Endurance',       score: 65 },
    { key: 'technique',      label: 'Technique',       score: 80 },
    { key: 'mental',         label: 'Mental',          score: 55 },
    { key: 'flexibility',    label: 'Flexibility',     score: 48 },
  ]
  
  function getCurrentGrade(sessions) {
    const sent = sessions.filter(s => s.sent)
    if (!sent.length) return 'V?'
    const max = Math.max(...sent.map(s => s.grade))
    return `V${max}`
  }
  
  function getSessionsThisWeek(sessions) {
    const now    = new Date('2026-06-10')
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1)
    monday.setHours(0, 0, 0, 0)
    return sessions.filter(s => new Date(s.date) >= monday).length
  }
  
  function getRestDays(sessions) {
    const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
    if (!sorted.length) return 0
    const last    = new Date(sorted[0].date)
    const now     = new Date('2026-06-10')
    const diff    = Math.floor((now - last) / (1000 * 60 * 60 * 24))
    return diff
  }
  
  function getSendRate(sessions) {
    if (!sessions.length) return '0%'
    const rate = (sessions.filter(s => s.sent).length / sessions.length) * 100
    return `${Math.round(rate)}%`
  }
  
  function getSendRateDelta(sessions) {
    const midpoint  = Math.floor(sessions.length / 2)
    const older     = sessions.slice(0, midpoint)
    const newer     = sessions.slice(midpoint)
    const rateOlder = older.filter(s => s.sent).length / (older.length || 1)
    const rateNewer = newer.filter(s => s.sent).length / (newer.length || 1)
    const delta     = Math.round((rateNewer - rateOlder) * 100)
    return delta >= 0 ? `+${delta}% vs last period` : `${delta}% vs last period`
  }
  
  function getStreak(sessions) {
    const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
    let streak   = 0
    for (const s of sorted) {
      if (s.sent) streak++
      else break
    }
    return streak
  }
  
  function getWeakestLink(attributes) {
    return [...attributes].sort((a, b) => a.score - b.score)[0]
  }
  
  function getMilestoneProgress(sessions, attributes) {
    const currentGrade   = Math.max(...sessions.filter(s => s.sent).map(s => s.grade))
    const fingerScore    = attributes.find(a => a.key === 'fingerStrength').score
    const slopeSendRate  = Math.round(
      (sessions.filter(s => s.sent && s.holds.includes('sloper')).length /
      (sessions.filter(s => s.holds.includes('sloper')).length || 1)) * 100
    )
    const progress = Math.min(Math.round((fingerScore / 78) * 60 + (slopeSendRate / 50) * 40), 100)
    return {
      current:  `V${currentGrade}`,
      target:   `V${currentGrade + 1}`,
      progress,
      blockers: [
        `Finger strength at ${fingerScore} — needs 78+ for next grade`,
        `Sloper send rate only ${slopeSendRate}%`,
      ],
    }
  }
  
  function getLoadRatioStatus(sessions) {
    const lastWeek     = sessions.slice(-4)
    const avgRpe       = lastWeek.reduce((sum, s) => sum + s.rpe, 0) / (lastWeek.length || 1)
    if (avgRpe >= 8.5) return { label: 'High load — consider rest', color: 'orange' }
    if (avgRpe >= 7)   return { label: 'Load ratio within range',   color: 'green'  }
    return               { label: 'Low load — room to push',        color: 'blue'   }
  }
  
  export default function useClimberStats() {
    const sessions   = SAMPLE_SESSIONS
    const attributes = ATTRIBUTES
    const loadStatus = getLoadRatioStatus(sessions)
  
    return {
      sessions,
      attributes,
      currentGrade:     getCurrentGrade(sessions),
      sessionsThisWeek: getSessionsThisWeek(sessions),
      restDays:         getRestDays(sessions),
      sendRate:         getSendRate(sessions),
      sendRateDelta:    getSendRateDelta(sessions),
      streak:           getStreak(sessions),
      totalSessions:    sessions.length,
      thisMonth:        sessions.filter(s => s.date.startsWith('2026-06')).length,
      weakestLink:      getWeakestLink(attributes),
      milestone:        getMilestoneProgress(sessions, attributes),
      loadStatus,
    }
  }