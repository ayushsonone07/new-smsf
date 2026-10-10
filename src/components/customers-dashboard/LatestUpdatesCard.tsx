import { Icon } from '../head/shared/Icon'
import type { RecentUpdate } from './types/customer-dashboard.types'

interface LatestUpdatesCardProps {
  updates: RecentUpdate[]
}

export function LatestUpdatesCard({ updates }: LatestUpdatesCardProps) {
  function renderIcon(iconType: RecentUpdate['iconType']) {
    if (iconType === 'help') {
      return (
        <span className="cdb-update-icon is-help">
          <Icon name="help" size={14} strokeWidth={2} />
        </span>
      )
    }

    if (iconType === 'check') {
      return (
        <span className="cdb-update-icon is-check">
          <Icon name="check" size={14} strokeWidth={2.5} />
        </span>
      )
    }

    return (
      <span className="cdb-update-icon is-pulse">
        <Icon name="progress" size={14} strokeWidth={2} />
      </span>
    )
  }

  return (
    <div className="cdb-card">
      <div className="cdb-card-header">
        <div className="cdb-card-title-group">
          <div className="cdb-card-icon-box">
            <Icon name="progress" size={18} />
          </div>
          <h3 className="cdb-card-title">Latest updates</h3>
        </div>
      </div>

      <div className="cdb-updates-list">
        {updates.map((u) => (
          <div key={u.id} className="cdb-update-item">
            {renderIcon(u.iconType)}
            <div className="cdb-update-content">
              <h4 className="cdb-update-title">{u.title}</h4>
              <p className="cdb-update-sub">{u.category}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
