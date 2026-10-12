export interface ActiveDayData {
  day: string
  value: number
  isActive?: boolean
}

export interface MostActiveDayProps {
  days?: ActiveDayData[]
}

/**
 * Most Active Day weekly completions bar chart widget.
 */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MostActiveDay({ days = [] }: MostActiveDayProps) {
  const maxVal = Math.max(...days.map((d) => d.value), 1)
  const chartDays: ActiveDayData[] = days.length > 0
    ? days
    : WEEKDAYS.map((day) => ({ day, value: 0 }))

  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <div className="hdb-card__title-group">
          <h3 className="hdb-card__title">Most Active Day</h3>
          <span className="hdb-card__subtitle">Completions · last 7 days</span>
        </div>
      </div>

      <div className="hdb-active-day__chart">
        {chartDays.map((item) => {
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
