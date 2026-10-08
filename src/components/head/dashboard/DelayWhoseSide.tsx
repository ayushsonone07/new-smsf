export interface DelayWhoseSideProps {
  totalDelayed?: number
  clientCount?: number
  clientPercent?: number
  ourSideCount?: number
  ourSidePercent?: number
  techCount?: number
  techPercent?: number
}

/**
 * Delay — Whose Side? Donut chart widget.
 */
export function DelayWhoseSide({
  totalDelayed = 9,
  clientCount = 5,
  clientPercent = 52,
  ourSideCount = 3,
  ourSidePercent = 31,
  techCount = 2,
  techPercent = 17,
}: DelayWhoseSideProps) {
  // SVG Donut calculation with r=44, circumference = 2 * PI * 44 = 276.46
  const r = 44
  const c = 2 * Math.PI * r

  const clientDash = (clientPercent / 100) * c
  const ourDash = (ourSidePercent / 100) * c
  const techDash = (techPercent / 100) * c

  const ourOffset = -clientDash
  const techOffset = -(clientDash + ourDash)

  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <h3 className="hdb-card__title">Delay — Whose Side?</h3>
        <span className="hdb-card__badge hdb-card__badge--pink">
          {totalDelayed} delayed
        </span>
      </div>

      <div className="hdb-delay-donut-row">
        {/* Donut Chart */}
        <div className="hdb-donut-box">
          <svg viewBox="0 0 118 118">
            {/* Background ring */}
            <circle
              cx="59"
              cy="59"
              r={r}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="14"
            />

            {/* Slice 1: Client side (Yellow) */}
            <circle
              cx="59"
              cy="59"
              r={r}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="14"
              strokeDasharray={`${clientDash} ${c}`}
              strokeDashoffset={0}
            />

            {/* Slice 2: Our side (Blue) */}
            <circle
              cx="59"
              cy="59"
              r={r}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="14"
              strokeDasharray={`${ourDash} ${c}`}
              strokeDashoffset={ourOffset}
            />

            {/* Slice 3: Tech / other (Red) */}
            <circle
              cx="59"
              cy="59"
              r={r}
              fill="none"
              stroke="#ef4444"
              strokeWidth="14"
              strokeDasharray={`${techDash} ${c}`}
              strokeDashoffset={techOffset}
            />
          </svg>

          <div className="hdb-donut-center">
            <strong>{clientPercent}%</strong>
            <span>client side</span>
          </div>
        </div>

        {/* Legend */}
        <div className="hdb-donut-legend">
          <div className="hdb-donut-legend-item">
            <div className="hdb-donut-legend-name">
              <span className="hdb-donut-dot hdb-donut-dot--yellow" />
              <span>Client side</span>
            </div>
            <div className="hdb-donut-legend-vals">
              <span>{clientCount}</span>
              <span>{clientPercent}%</span>
            </div>
          </div>

          <div className="hdb-donut-legend-item">
            <div className="hdb-donut-legend-name">
              <span className="hdb-donut-dot hdb-donut-dot--blue" />
              <span>Our side</span>
            </div>
            <div className="hdb-donut-legend-vals">
              <span>{ourSideCount}</span>
              <span>{ourSidePercent}%</span>
            </div>
          </div>

          <div className="hdb-donut-legend-item">
            <div className="hdb-donut-legend-name">
              <span className="hdb-donut-dot hdb-donut-dot--red" />
              <span>Tech / other dept</span>
            </div>
            <div className="hdb-donut-legend-vals">
              <span>{techCount}</span>
              <span>{techPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      <p className="hdb-delay-helper-note">
        Open a member to see the reason on each customer.
      </p>
    </div>
  )
}
