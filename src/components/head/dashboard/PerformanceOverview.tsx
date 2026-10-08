import { useState } from 'react'

export interface PerformanceUserItem {
  id: string
  name: string
  updates: number
  isTop?: boolean
}

const DEFAULT_PERFORMANCE_USERS: PerformanceUserItem[] = [
  { id: 'u-1', name: 'Abhishek Sahu', updates: 64, isTop: true },
  { id: 'u-2', name: 'Mahima', updates: 52 },
  { id: 'u-3', name: 'Mohit', updates: 47 },
  { id: 'u-4', name: 'Bhupinder', updates: 41 },
  { id: 'u-5', name: 'Gungun', updates: 33 },
]

export interface PerformanceOverviewProps {
  totalUpdates?: number
  users?: PerformanceUserItem[]
}

/**
 * Performance Overview widget with total updates metric and horizontal performer bars.
 */
export function PerformanceOverview({
  totalUpdates = 237,
  users = DEFAULT_PERFORMANCE_USERS,
}: PerformanceOverviewProps) {
  const [filterUser, setFilterUser] = useState('all')
  const maxVal = Math.max(...users.map((u) => u.updates), 70)

  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <h3 className="hdb-card__title">Performance Overview</h3>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="cl-assignee-btn"
          style={{ height: 32, fontSize: 12.5, padding: '0 8px' }}
          aria-label="Filter performance by user"
        >
          <option value="all">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="hdb-perf-body">
        {/* Left summary */}
        <div className="hdb-perf-summary">
          <div className="hdb-perf-num">{totalUpdates}</div>
          <div className="hdb-perf-sub">total updates across users</div>
          <div className="hdb-perf-controls">
            <span className="hdb-perf-tag">By updates</span>
            <span className="hdb-perf-tag">Top</span>
            <span className="hdb-perf-tag">Show 5</span>
          </div>
        </div>

        {/* Right bars */}
        <div className="hdb-perf-bars">
          {users.map((u) => {
            const widthPercent = Math.round((u.updates / maxVal) * 100)

            return (
              <div key={u.id} className="hdb-perf-bar-row">
                <span className="hdb-perf-bar-name" title={u.name}>
                  {u.name}
                </span>

                <div className="hdb-perf-track">
                  <div
                    className={`hdb-perf-fill ${
                      u.isTop ? 'hdb-perf-fill--top' : ''
                    }`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>

                <span className="hdb-perf-count">{u.updates}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
