import { Icon } from '../head/shared/Icon'

interface CustomerDashboardTopbarProps {
  notificationCount?: number
}

export function CustomerDashboardTopbar({
  notificationCount = 3,
}: CustomerDashboardTopbarProps) {
  return (
    <header className="cdb-topbar">
      <div className="cdb-topbar-left">
        <h1 className="cdb-topbar-title">Customer Dashboard</h1>
        <p className="cdb-topbar-subtitle">
          What the customer sees — updates live as your team works
        </p>
      </div>

      <div className="cdb-topbar-right">
        <button
          type="button"
          className="cdb-topbar-notif"
          aria-label="Notifications"
        >
          <Icon name="bell" size={18} />
          {notificationCount > 0 ? (
            <span className="cdb-topbar-badge">{notificationCount}</span>
          ) : null}
        </button>
      </div>
    </header>
  )
}
