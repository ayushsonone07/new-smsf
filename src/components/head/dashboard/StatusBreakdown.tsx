import { Icon } from '../shared/Icon'

export interface StatusBreakdownProps {
  pendingCount?: number
  pendingPercent?: number
  inProgressCount?: number
  inProgressPercent?: number
  completedCount?: number
  completedPercent?: number
  delayedCount?: number
  delayedPercent?: number
}

/**
 * Status Breakdown progress widget for Head Dashboard.
 */
export function StatusBreakdown({
  pendingCount = 5,
  pendingPercent = 11,
  inProgressCount = 7,
  inProgressPercent = 16,
  completedCount = 33,
  completedPercent = 73,
  delayedCount = 9,
  delayedPercent = 20,
}: StatusBreakdownProps) {
  return (
    <div className="hdb-card">
      <div className="hdb-card__header">
        <h3 className="hdb-card__title">Status Breakdown</h3>
        <span className="hdb-card__badge hdb-card__badge--green">
          {completedPercent}% done
        </span>
      </div>

      <div className="hdb-breakdown-list">
        {/* Pending */}
        <div className="hdb-breakdown-item">
          <div className="hdb-breakdown-item__head">
            <div className="hdb-breakdown-item__label-group">
              <Icon name="hourglass" size={14} strokeWidth={2} />
              <span>Pending</span>
            </div>
            <span className="hdb-breakdown-item__val">
              {pendingCount} · {pendingPercent}%
            </span>
          </div>
          <div className="hdb-breakdown-bar-bg">
            <div
              className="hdb-breakdown-bar-fill hdb-breakdown-bar-fill--yellow"
              style={{ width: `${pendingPercent}%` }}
            />
          </div>
        </div>

        {/* In Progress */}
        <div className="hdb-breakdown-item">
          <div className="hdb-breakdown-item__head">
            <div className="hdb-breakdown-item__label-group">
              <Icon name="progress" size={14} strokeWidth={2} />
              <span>In Progress</span>
            </div>
            <span className="hdb-breakdown-item__val">
              {inProgressCount} · {inProgressPercent}%
            </span>
          </div>
          <div className="hdb-breakdown-bar-bg">
            <div
              className="hdb-breakdown-bar-fill hdb-breakdown-bar-fill--blue"
              style={{ width: `${inProgressPercent}%` }}
            />
          </div>
        </div>

        {/* Completed */}
        <div className="hdb-breakdown-item">
          <div className="hdb-breakdown-item__head">
            <div className="hdb-breakdown-item__label-group">
              <Icon name="done" size={14} strokeWidth={2} />
              <span>Completed</span>
            </div>
            <span className="hdb-breakdown-item__val">
              {completedCount} · {completedPercent}%
            </span>
          </div>
          <div className="hdb-breakdown-bar-bg">
            <div
              className="hdb-breakdown-bar-fill hdb-breakdown-bar-fill--green"
              style={{ width: `${completedPercent}%` }}
            />
          </div>
        </div>

        {/* Delayed */}
        <div className="hdb-breakdown-item">
          <div className="hdb-breakdown-item__head">
            <div className="hdb-breakdown-item__label-group">
              <Icon name="alert" size={14} strokeWidth={2} />
              <span>Delayed</span>
            </div>
            <span className="hdb-breakdown-item__val">
              {delayedCount} · {delayedPercent}%
            </span>
          </div>
          <div className="hdb-breakdown-bar-bg">
            <div
              className="hdb-breakdown-bar-fill hdb-breakdown-bar-fill--red"
              style={{ width: `${delayedPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
