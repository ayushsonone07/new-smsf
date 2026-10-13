import { Icon } from '../shared/Icon'
import { useNotificationCenter } from './NotificationCenter'
import { getSession } from '../../../app/auth/session'

/** Bell button with unread badge and a dropdown list. */
export function NotificationsMenu() {
  const notifications = useNotificationCenter()
  if (getSession()?.user.role === 'USER') return null

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
