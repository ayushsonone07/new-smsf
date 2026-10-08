export interface ActiveDayData {
  day: string
  value: number
  isActive?: boolean
}

const DEFAULT_DAYS: ActiveDayData[] = [
  { day: 'Mon', value: 28 },
  { day: 'Tue', value: 36 },
  { day: 'Wed', value: 58, isActive: true },
  { day: 'Thu', value: 32 },
  { day: 'Fri', value: 34 },
  { day: 'Sat', value: 24 },
  { day: 'Sun', value: 20 },
]

export interface MostActiveDayProps {
  days?: ActiveDayData[]
}

/**
 * Most Active Day weekly completions bar chart widget.
 */
export function MostActiveDay({ days = DEFAULT_DAYS }: MostActiveDayProps) {
  const maxVal = Math.max(...days.map((d) => d.value), 60)

  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <div className="hdb-card__title-group">
          <h3 className="hdb-card__title">Most Active Day</h3>
          <span className="hdb-card__subtitle">Completions · last 7 days</span>
        </div>
      </div>

      <div className="hdb-active-day__chart">
        {days.map((item) => {
          const heightPercent = Math.round((item.value / maxVal) * 100)

          return (
            <div key={item.day} className="hdb-active-day__col">
              {item.isActive ? (
                <span className="hdb-active-day__val">{item.value}</span>
              ) : null}

              <div
                className={`hdb-active-day__bar ${
                  item.isActive ? 'hdb-active-day__bar--active' : ''
                }`}
                style={{ height: `${heightPercent}%` }}
              />

              <span
                className={`hdb-active-day__lbl ${
                  item.isActive ? 'hdb-active-day__lbl--active' : ''
                }`}
              >
                {item.day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
