export function detectPlateaus(sessions, w = 4) {
  const sent = [...sessions].filter(s => s.sent).sort((a, b) => new Date(a.date) - new Date(b.date))
  if (sent.length < w * 2) return []
  return sent.reduce((acc, _, i) => {
    if (i < w || i > sent.length - w) return acc
    const avg = arr => arr.reduce((s, r) => s + r.grade, 0) / arr.length
    if (Math.abs(avg(sent.slice(i, i+w)) - avg(sent.slice(i-w, i))) >= 0.5) return acc
    const last = acc.at(-1)
    if (last && new Date(sent[i].date) - new Date(last.end) < 7 * 86400000) {
      last.end = sent[i].date; last.sessions++
    } else {
      acc.push({ start: sent[i-w].date, end: sent[i].date, grade: Math.round(avg(sent.slice(i-w, i))), sessions: w })
    }
    return acc
  }, [])
}

export function getAcuteChronicRatio(sessions) {
  const s = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const avg = arr => arr.reduce((t, r) => t + r.rpe, 0) / (arr.length || 1)
  const acute = avg(s.slice(0, 7)), chronic = avg(s.slice(0, 28))
  const ratio = chronic > 0 ? +(acute / chronic).toFixed(2) : 1
  return {
    acute: +acute.toFixed(1), chronic: +chronic.toFixed(1), ratio,
    status: ratio > 1.3 ? 'danger' : ratio > 1.1 ? 'warning' : ratio < 0.8 ? 'low' : 'optimal'
  }
}

export function getRestLoadStatus(sessions) {
  const s = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
  const last7 = s.filter(x => new Date(x.date) > new Date(Date.now() - 7 * 86400000))
  const restDays = s[0] ? Math.floor((Date.now() - new Date(s[0].date)) / 86400000) : 0
  const weekRpe = last7.reduce((t, r) => t + r.rpe, 0) / (last7.length || 1)
  return {
    restDays, weekSessions: last7.length, weekRpe: +weekRpe.toFixed(1),
    crimpLoad: Math.round(last7.filter(x => x.holds.includes('crimp')).length / (last7.length || 1) * 100),
    overloaded: weekRpe > 8 && last7.length > 3,
    underrested: restDays === 0 && weekRpe > 7,
  }
}
