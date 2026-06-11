import { useState, useEffect } from 'react'
import './RadarChart.css'

const ATTRIBUTES = [
  { key: 'fingerStrength', label: 'Finger Strength' },
  { key: 'power',          label: 'Power' },
  { key: 'endurance',      label: 'Endurance' },
  { key: 'technique',      label: 'Technique' },
  { key: 'mental',         label: 'Mental' },
  { key: 'flexibility',    label: 'Flexibility' },
]

const SAMPLE_CURRENT = {
  fingerStrength: 72,
  power:          58,
  endurance:      65,
  technique:      80,
  mental:         55,
  flexibility:    48,
}

const SAMPLE_AVERAGE = {
  fingerStrength: 60,
  power:          70,
  endurance:      50,
  technique:      65,
  mental:         68,
  flexibility:    55,
}

const SIZE    = 380
const CENTER  = SIZE / 2
const LEVELS  = 5
const MAX_VAL = 100

function polarToXY(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  }
}

function buildPolygonPoints(data, maxRadius) {
  return ATTRIBUTES.map((attr, i) => {
    const angle = (360 / ATTRIBUTES.length) * i
    const radius = (data[attr.key] / MAX_VAL) * maxRadius
    return polarToXY(angle, radius)
  })
}

function pointsToPath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
}

function splitPolygonByAxis(points) {
  const n = points.length
  const above = []
  const below = []

  for (let i = 0; i < n; i++) {
    const curr = points[i]
    const next = points[(i + 1) % n]
    const currAbove = curr.y <= CENTER
    const nextAbove = next.y <= CENTER

    if (currAbove) above.push(curr)
    else below.push(curr)

    if (currAbove !== nextAbove) {
      const t = (CENTER - curr.y) / (next.y - curr.y)
      const ix = curr.x + t * (next.x - curr.x)
      const mid = { x: ix, y: CENTER }
      above.push(mid)
      below.push(mid)
    }
  }

  above.push({ x: CENTER, y: CENTER })
  below.push({ x: CENTER, y: CENTER })

  return { above, below }
}

export default function RadarChart() {
  const maxRadius = CENTER * 0.72
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame
    let start = null

    function animate(ts) {
      if (!start) start = ts
      const elapsed = ts - start
      const p = Math.min(elapsed / 900, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setProgress(eased)
      if (p < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  function interpolatedData(target) {
    const result = {}
    ATTRIBUTES.forEach(attr => {
      result[attr.key] = target[attr.key] * progress
    })
    return result
  }

  const currentPoints = buildPolygonPoints(interpolatedData(SAMPLE_CURRENT), maxRadius)
  const averagePoints = buildPolygonPoints(interpolatedData(SAMPLE_AVERAGE), maxRadius)
  const { above: currAbove, below: currBelow } = splitPolygonByAxis(currentPoints)
  const { above: avgAbove,  below: avgBelow  } = splitPolygonByAxis(averagePoints)

  const gridLevels = Array.from({ length: LEVELS }, (_, i) => {
    const r = maxRadius * ((i + 1) / LEVELS)
    return ATTRIBUTES.map((_, j) => polarToXY((360 / ATTRIBUTES.length) * j, r))
  })

  return (
    <div className="radar-wrapper">
      <div className="radar-header">
        <h1 className="radar-title">Climber Profile</h1>
        <p className="radar-subtitle">Current session vs 4-week average</p>
      </div>
      <p className="radar-grade-context">Reading from sample data — upload your session log in Phase 3</p>

      <div className="radar-container">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="radar-svg">
          <defs>
            <filter id="glow-blue">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-orange">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {gridLevels.map((levelPoints, li) => (
            <polygon
              key={li}
              points={levelPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {ATTRIBUTES.map((_, i) => {
            const end = polarToXY((360 / ATTRIBUTES.length) * i, maxRadius)
            return (
              <line
                key={i}
                x1={CENTER} y1={CENTER}
                x2={end.x}  y2={end.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            )
          })}

          <path d={pointsToPath(avgAbove)} fill="rgba(79,195,247,0.12)"  stroke="none" />
          <path d={pointsToPath(avgBelow)} fill="rgba(255,107,53,0.12)"  stroke="none" />

          <path
            d={pointsToPath(currAbove)}
            fill="rgba(79,195,247,0.35)"
            stroke="#4fc3f7"
            strokeWidth="1.5"
            filter="url(#glow-blue)"
          />
          <path
            d={pointsToPath(currBelow)}
            fill="rgba(255,107,53,0.35)"
            stroke="#ff6b35"
            strokeWidth="1.5"
            filter="url(#glow-orange)"
          />

          {ATTRIBUTES.map((attr, i) => {
            const angle  = (360 / ATTRIBUTES.length) * i
            const labelR = maxRadius + 28
            const pos    = polarToXY(angle, labelR)
            const valPos = polarToXY(angle, maxRadius + 48)
            const val    = Math.round(SAMPLE_CURRENT[attr.key] * progress)
            const isTop  = pos.y < CENTER
            return (
              <g key={attr.key}>
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="radar-label"
                >
                  {attr.label}
                </text>
                <text
                  x={valPos.x} y={valPos.y + (isTop ? -14 : 14)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="radar-value"
                >
                  {val}
                </text>
              </g>
            )
          })}

          {currentPoints.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="6" fill="rgba(79,195,247,0.15)" className="radar-dot-pulse" />
              <circle cx={p.x} cy={p.y} r="3.5" fill="#4fc3f7" />
            </g>
          ))}
        </svg>
      </div>

      <div className="radar-legend">
        <div className="legend-item">
          <span className="legend-dot blue" />
          <span>Current Session</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot orange" />
          <span>4-Week Average</span>
        </div>
      </div>
    </div>
  )
}