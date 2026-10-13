import { Icon } from '../head/shared/Icon'
import { useNotificationCenter } from '../head/layout/NotificationCenter'
import { getCustomerSession } from '../../features/customers/hooks/useCustomerSession'

interface CustomerDashboardTopbarProps {
  notificationCount?: number
  onToggleSidebar?: () => void
}

export function CustomerDashboardTopbar({
  notificationCount = 3,
  onToggleSidebar,
}: CustomerDashboardTopbarProps) {
  const notificationCenter = useNotificationCenter()
  const isCustomerAuthenticated = Boolean(getCustomerSession())
  const count = notificationCenter?.unreadCount ?? notificationCount
  return (
    <header className="cdb-topbar">
      {onToggleSidebar ? (
        <button
          type="button"
          className="cdb-topbar-menu"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
        >
          <Icon name="menu" size={18} />
        </button>
      ) : null}

      <div className="cdb-topbar-left">
        <h1 className="cdb-topbar-title">Customer Dashboard</h1>
        <p className="cdb-topbar-subtitle">
          What the customer sees — updates live as your team works
        </p>
      </div>

      <div className="cdb-topbar-right">
        {isCustomerAuthenticated ? (
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
        ) : null}
      </div>
    </header>
  )
}
