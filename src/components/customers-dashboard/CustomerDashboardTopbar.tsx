import { Icon } from '../head/shared/Icon'
import { useNotificationCenter } from '../head/layout/NotificationCenter'

interface CustomerDashboardTopbarProps {
  notificationCount?: number
}

export function CustomerDashboardTopbar({
  notificationCount = 3,
}: CustomerDashboardTopbarProps) {
  const notificationCenter = useNotificationCenter()
  const count = notificationCenter?.unreadCount ?? notificationCount
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
          onClick={notificationCenter?.open}
        >
          <Icon name="bell" size={18} />
          {count > 0 ? (
            <span className="cdb-topbar-badge">{count}</span>
          ) : null}
        </button>
      </div>
    </header>
  )
}
