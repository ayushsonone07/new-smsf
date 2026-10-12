import { useState, type PointerEvent as ReactPointerEvent } from 'react'

export interface OnboardingTrendProps {
  total?: number
  growth?: string
  labels?: string[]
  newCustomers?: number[]
  completed?: number[]
  previousPeriod?: number[]
}

const chartLeft = 40
const chartRight = 520
const chartTop = 16
const chartBottom = 125
const chartHeight = chartBottom - chartTop

function makeLinePath(values: number[], maxValue: number) {
  const points = values.map((value, index) => ({
    x: chartLeft + (values.length <= 1 ? 0 : (index / (values.length - 1)) * (chartRight - chartLeft)),
    y: chartBottom - (Math.max(0, value) / maxValue) * chartHeight,
  }))
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    const previous = points[index - 1]
    const middleX = (previous.x + point.x) / 2
    return `${path} Q ${middleX} ${previous.y}, ${middleX} ${(previous.y + point.y) / 2} T ${point.x} ${point.y}`
  }, '')
}

function formatValue(value: number) {
  return Number.isFinite(value) ? Math.round(value) : 0
}

/**
 * Onboarding trend chart with a hover tooltip for the selected time point.
 */
export function OnboardingTrend({
  total = 0,
  growth = '—',
  labels = [],
  newCustomers = [],
  completed = [],
  previousPeriod = [],
}: OnboardingTrendProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const series = [
    { name: 'New', values: newCustomers, color: '#2563eb' },
    { name: 'Completed', values: completed, color: '#eab308' },
    { name: 'Prev. period', values: previousPeriod, color: '#94a3b8', dashed: true },
  ].filter((item) => item.values.length > 0)
  const pointCount = Math.max(
    labels.length,
    ...series.map((item) => item.values.length),
    0,
  )
  const maxValue = Math.max(
    1,
    ...series.flatMap((item) => item.values.filter(Number.isFinite)),
  )
  const hasData = pointCount > 0 && series.length > 0
  const activeX =
    activeIndex === null || pointCount <= 1
      ? chartLeft
      : chartLeft + (activeIndex / (pointCount - 1)) * (chartRight - chartLeft)
  const activeReferenceSeries = series.find((item) => item.name === 'New') ?? series[0]
  const activeValue =
    activeIndex === null ? 0 : (activeReferenceSeries?.values[activeIndex] ?? 0)
  const activeY = chartBottom - (Math.max(0, activeValue) / maxValue) * chartHeight
  const activeLabel =
    activeIndex === null
      ? ''
      : labels[activeIndex] || `Point ${activeIndex + 1}`
  const axisIndexes = Array.from(
    new Set(
      Array.from({ length: Math.min(pointCount, 6) }, (_, index) =>
        Math.round((index / Math.max(1, Math.min(pointCount, 6) - 1)) * (pointCount - 1)),
      ),
    ),
  )

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasData) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const plotX = ((event.clientX - bounds.left) / bounds.width) * 540
    const relativeX = Math.max(
      0,
      Math.min(1, (plotX - chartLeft) / (chartRight - chartLeft)),
    )
    setActiveIndex(Math.round(relativeX * (pointCount - 1)))
  }

  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <div className="hdb-card__title-group">
          <h3 className="hdb-card__title">Onboarding Trend</h3>
          <span className="hdb-card__subtitle">Hourly · today</span>
        </div>

        <div className="hdb-trend__legend">
          {series.map((item) => (
            <div className="hdb-trend__legend-item" key={item.name}>
              <span
                className={`hdb-trend__legend-line${item.dashed ? ' hdb-trend__legend-line--dashed' : ''}`}
                style={item.dashed ? undefined : { backgroundColor: item.color }}
              />
              <span>{item.name === 'Prev. period' ? 'Previous period' : item.name === 'New' ? 'New customers' : item.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hdb-trend__metrics">
        <span className="hdb-trend__number">{formatValue(total)}</span>
        <span className="hdb-stat-card__pill hdb-stat-card__pill--green">
          {growth}
        </span>
        <span className="hdb-stat-card__sub">
          new customers vs last period
        </span>
      </div>

      <div
        className="hdb-trend__chart-wrap"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {hasData ? (
          <>
            <svg viewBox="0 0 540 160" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="hdbBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {Array.from({ length: 5 }, (_, index) => {
                const y = chartTop + (index / 4) * chartHeight
                const label = Math.round(maxValue * (1 - index / 4))
                return (
                  <g key={index}>
                    <line x1="35" y1={y} x2="520" y2={y} stroke="#e8edf5" strokeDasharray="2 3" />
                    <text x="24" y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">
                      {label}
                    </text>
                  </g>
                )
              })}
              <line x1="35" y1={chartBottom} x2="520" y2={chartBottom} stroke="#e2e8f0" />

              {series.map((item) => {
                const path = makeLinePath(item.values, maxValue)
                const area =
                  item.name === 'New' && path
                    ? `${path} L ${chartRight} ${chartBottom} L ${chartLeft} ${chartBottom} Z`
                    : ''
                return (
                  <g key={item.name}>
                    {area && <path d={area} fill="url(#hdbBlueGrad)" />}
                    <path
                      d={path}
                      fill="none"
                      stroke={item.color}
                      strokeWidth={item.name === 'New' ? 2.8 : 2.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={item.dashed ? '4 4' : undefined}
                    />
                  </g>
                )
              })}

              {activeIndex !== null && (
                <g>
                  <line x1={activeX} y1={chartTop} x2={activeX} y2={chartBottom} stroke="#94a3b8" strokeDasharray="2 3" />
                  {series.map((item) => {
                    const value = item.values[activeIndex]
                    if (!Number.isFinite(value)) return null
                    const y = chartBottom - (Math.max(0, value) / maxValue) * chartHeight
                    return (
                      <circle
                        key={item.name}
                        cx={activeX}
                        cy={y}
                        r="4"
                        fill="#fff"
                        stroke={item.color}
                        strokeWidth="2"
                      />
                    )
                  })}
                </g>
              )}

              {axisIndexes.map((index) => {
                const x = chartLeft + (pointCount <= 1 ? 0 : (index / (pointCount - 1)) * (chartRight - chartLeft))
                return (
                  <text
                    key={index}
                    x={x}
                    y="151"
                    fill={index === activeIndex ? '#1d4ed8' : '#94a3b8'}
                    fontSize="10.5"
                    fontWeight={index === activeIndex ? '700' : '400'}
                    textAnchor="middle"
                  >
                    {labels[index] ?? ''}
                  </text>
                )
              })}
            </svg>

            {activeIndex !== null && (
              <div
                className="hdb-trend__tooltip"
                style={{
                  left: `${(activeX / 540) * 100}%`,
                  top: `${Math.max(4, (activeY / 160) * 100 - 10)}%`,
                  transform: activeX > 300 ? 'translate(-100%, -50%)' : 'translate(12px, -50%)',
                }}
              >
                <strong className="hdb-trend__tooltip-title">{activeLabel}</strong>
                {series.map((item) => {
                  const value = item.values[activeIndex]
                  if (!Number.isFinite(value)) return null
                  return (
                    <div className="hdb-trend__tooltip-row" key={item.name}>
                      <span className="hdb-trend__tooltip-name">
                        <i style={{ backgroundColor: item.color }} />
                        {item.name === 'Prev. period' ? 'Prev. period' : item.name}
                      </span>
                      <b>{formatValue(value)}</b>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <div className="hdb-trend__empty">No trend data available</div>
        )}
      </div>
    </div>
  )
}
