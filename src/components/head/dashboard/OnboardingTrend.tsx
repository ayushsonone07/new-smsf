export interface OnboardingTrendProps {
  total?: number
  growth?: string
}

/**
 * Onboarding Trend widget with smooth SVG curves matching the reference design.
 */
export function OnboardingTrend({
  total = 45,
  growth = '▲ 4.7%',
}: OnboardingTrendProps) {
  // Chart coordinates (viewBox 0 0 540 140)
  // X: 9am (40), 11am (135), 1pm (230), 3pm (325), 5pm (420), 7pm (515)
  // Y: 0 (125), 2 (95), 3 (80), 5 (45), 7 (15)

  // Blue line (New customers): starts around y=5(45), stays flat to 11am, dips, rises high at 1pm (y=6, 30), levels to 3pm, drops at 5pm, rises at 7pm
  const bluePath =
    'M 40 45 C 90 45, 110 45, 135 60 C 160 75, 190 28, 230 28 C 270 28, 290 85, 335 85 C 375 85, 400 95, 435 105 C 470 115, 490 60, 515 50'
  const blueArea = `${bluePath} L 515 125 L 40 125 Z`

  // Yellow line (Completed): starts around y=3(80), rises to peak at 1pm (y=5, 45), drops sharply at 3pm (y=2, 105), dips to 5pm (y=1.5, 115), rises to 7pm (y=3.5, 75)
  const yellowPath =
    'M 40 80 C 90 80, 115 80, 140 70 C 175 55, 200 45, 230 45 C 265 45, 290 105, 335 105 C 375 105, 400 115, 435 115 C 470 115, 490 90, 515 65'

  // Gray dashed line (Previous period): starts at 40 (105), rises gently, peaks around 1pm (y=4, 55), descends gently to 5pm, rises to 7pm
  const grayDashedPath =
    'M 40 100 C 80 95, 110 45, 150 45 C 190 45, 200 65, 240 50 C 280 35, 300 85, 350 85 C 390 85, 420 90, 460 75 C 485 65, 500 55, 515 45'

  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <div className="hdb-card__title-group">
          <h3 className="hdb-card__title">Onboarding Trend</h3>
          <span className="hdb-card__subtitle">Hourly · today</span>
        </div>

        <div className="hdb-trend__legend">
          <div className="hdb-trend__legend-item">
            <span className="hdb-trend__legend-line hdb-trend__legend-line--blue" />
            <span>New customers</span>
          </div>
          <div className="hdb-trend__legend-item">
            <span className="hdb-trend__legend-line hdb-trend__legend-line--yellow" />
            <span>Completed</span>
          </div>
          <div className="hdb-trend__legend-item">
            <span className="hdb-trend__legend-line hdb-trend__legend-line--dashed" />
            <span>Previous period</span>
          </div>
        </div>
      </div>

      <div className="hdb-trend__metrics">
        <span className="hdb-trend__number">{total}</span>
        <span className="hdb-stat-card__pill hdb-stat-card__pill--green">
          {growth}
        </span>
        <span className="hdb-stat-card__sub">
          new customers vs last period
        </span>
      </div>

      <div className="hdb-trend__chart-wrap">
        <svg viewBox="0 0 540 145" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hdbBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1="35"
            y1="15"
            x2="520"
            y2="15"
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <line
            x1="35"
            y1="45"
            x2="520"
            y2="45"
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <line
            x1="35"
            y1="80"
            x2="520"
            y2="80"
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <line
            x1="35"
            y1="95"
            x2="520"
            y2="95"
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <line
            x1="35"
            y1="125"
            x2="520"
            y2="125"
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Y Axis Labels */}
          <text x="20" y="18" fill="#94a3b8" fontSize="10" textAnchor="end">
            7
          </text>
          <text x="20" y="48" fill="#94a3b8" fontSize="10" textAnchor="end">
            5
          </text>
          <text x="20" y="83" fill="#94a3b8" fontSize="10" textAnchor="end">
            3
          </text>
          <text x="20" y="98" fill="#94a3b8" fontSize="10" textAnchor="end">
            2
          </text>
          <text x="20" y="128" fill="#94a3b8" fontSize="10" textAnchor="end">
            0
          </text>

          {/* Area fill */}
          <path d={blueArea} fill="url(#hdbBlueGrad)" />

          {/* Lines */}
          <path
            d={grayDashedPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <path
            d={yellowPath}
            fill="none"
            stroke="#eab308"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={bluePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* X Axis Labels */}
          <text x="40" y="142" fill="#94a3b8" fontSize="10.5" textAnchor="middle">
            9 am
          </text>
          <text
            x="135"
            y="142"
            fill="#94a3b8"
            fontSize="10.5"
            textAnchor="middle"
          >
            11 am
          </text>
          <text
            x="230"
            y="142"
            fill="#94a3b8"
            fontSize="10.5"
            textAnchor="middle"
          >
            1 pm
          </text>
          <text
            x="325"
            y="142"
            fill="#94a3b8"
            fontSize="10.5"
            textAnchor="middle"
          >
            3 pm
          </text>
          <text
            x="420"
            y="142"
            fill="#94a3b8"
            fontSize="10.5"
            textAnchor="middle"
          >
            5 pm
          </text>
          <text
            x="515"
            y="142"
            fill="#94a3b8"
            fontSize="10.5"
            textAnchor="middle"
          >
            7 pm
          </text>
        </svg>
      </div>
    </div>
  )
}
