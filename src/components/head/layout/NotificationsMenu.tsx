import { Icon } from '../shared/Icon'
import { useNotificationCenter } from './NotificationCenter'

/** Bell button with unread badge and a dropdown list. */
export function NotificationsMenu() {
  const notifications = useNotificationCenter()

  return (
    <div className="hbell">
      <button
        type="button"
        className="hbell__btn"
        aria-label="Notifications"
        aria-expanded={notifications?.isOpen ?? false}
        onClick={notifications?.open}
      >
        <Icon name="bell" size={17} />
        {(notifications?.unreadCount ?? 0) > 0 ? (
          <span className="hbell__badge">{notifications?.unreadCount}</span>
        ) : null}
      </button>
    </div>
  )
}
