export interface TeamTargetAchievementProps {
  percentage?: number
  target?: number
  achieved?: number
  remaining?: number
}

/**
 * Team Target Achievement card featuring a radial segmented speedometer gauge.
 */
export function TeamTargetAchievement({
  percentage = 92,
  target = 36,
  achieved = 33,
  remaining = 3,
}: TeamTargetAchievementProps) {
  // Number of radial segments in the gauge
  const totalSegments = 36
  const activeSegments = Math.round((percentage / 100) * totalSegments)
  const yellowSegmentsCount = 4
  const blueSegmentsCount = activeSegments - yellowSegmentsCount

  // Radius & Center for gauge SVG
  const cx = 110
  const cy = 110
  const rInner = 68
  const rOuter = 95
  const startAngle = 145 // degrees
  const totalSweep = 250 // degrees sweep

  const segments = Array.from({ length: totalSegments }, (_, i) => {
    const angleDeg = startAngle + (i / (totalSegments - 1)) * totalSweep
    const angleRad = (angleDeg * Math.PI) / 180

    const cos = Math.cos(angleRad)
    const sin = Math.sin(angleRad)

    const x1 = cx + rInner * cos
    const y1 = cy + rInner * sin
    const x2 = cx + rOuter * cos
    const y2 = cy + rOuter * sin

    let color = '#e2e8f0' // inactive
    if (i < blueSegmentsCount) {
      color = '#2563eb' // active blue
    } else if (i < activeSegments) {
      color = '#f59e0b' // highlight yellow/orange
    }

    return { id: i, x1, y1, x2, y2, color }
  })

  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <h3 className="hdb-card__title">Team Target Achievement</h3>
        <span className="hdb-card__badge hdb-card__badge--yellow">Today</span>
      </div>

      <div className="hdb-gauge-wrap">
        <div className="hdb-gauge__svg-box">
          <svg viewBox="0 0 220 135">
            {segments.map((s) => (
              <line
                key={s.id}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={s.color}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            ))}
          </svg>

          <div className="hdb-gauge__center">
            <div className="hdb-gauge__percent">{percentage}%</div>
            <div className="hdb-gauge__subtext">On track for target</div>
          </div>
        </div>

        <div className="hdb-gauge__stats">
          <div>
            <div className="hdb-gauge__stat-val">{target}</div>
            <div className="hdb-gauge__stat-lbl">Target</div>
          </div>
          <div>
            <div className="hdb-gauge__stat-val">{achieved}</div>
            <div className="hdb-gauge__stat-lbl">Achieved</div>
          </div>
          <div>
            <div className="hdb-gauge__stat-val">{remaining}</div>
            <div className="hdb-gauge__stat-lbl">Remaining</div>
          </div>
        </div>
      </div>
    </div>
  )
}
