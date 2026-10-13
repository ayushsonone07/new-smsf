import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { HeadNotification } from '../../../features/departments/head/types/head.types'
import { Icon } from '../shared/Icon'

interface NotificationCenterValue {
  open: () => void
  isOpen: boolean
  unreadCount: number
}

const NotificationCenterContext = createContext<NotificationCenterValue | null>(null)

interface NotificationCenterProps {
  children: ReactNode
  items: HeadNotification[]
  roleLabel?: string
  onMarkAllRead?: () => void
}

export function NotificationCenter({
  children,
  items,
  roleLabel = 'Account',
  onMarkAllRead,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const unreadCount = items.filter((item) => item.unread).length
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, open])

  const value = useMemo(
    () => ({ open: () => setOpen(true), isOpen: open, unreadCount }),
    [open, unreadCount],
  )

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
      <div
        className={`hnotify-backdrop${open ? ' is-open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className={`hnotify-drawer${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={`${roleLabel} notifications`}
      >
        <div className="hnotify-drawer__header">
          <div>
            <h2>Notifications</h2>
            <p>{roleLabel}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close notifications">
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="hnotify-drawer__toolbar">
          <span>{unreadCount} unread</span>
          {onMarkAllRead && unreadCount > 0 ? (
            <button type="button" onClick={onMarkAllRead}>Mark all as read</button>
          ) : null}
        </div>

        <div className="hnotify-drawer__list">
          {items.length === 0 ? (
            <div className="hnotify-drawer__empty">
              <Icon name="bell" size={28} />
              <strong>You're all caught up</strong>
              <span>New notifications will appear here.</span>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`hnotify-item${item.unread ? ' is-unread' : ''} ${notificationTone(item.text)}`}
                onClick={() => {
                  if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer')
                }}
                disabled={!item.link}
                aria-label={item.link ? `Open notification: ${item.text}` : item.text}
              >
                <span className="hnotify-item__icon"><Icon name="bell" size={15} /></span>
                <div>
                  <p>{item.text}</p>
                  <time>{item.timeLabel}</time>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </NotificationCenterContext.Provider>
  )
}

function notificationTone(text: string): 'is-completed' | 'is-pending' {
  const normalized = text.toLowerCase()
  return /completed|complete|approved|success|acknowledged|generated/.test(normalized)
    ? 'is-completed'
    : 'is-pending'
}

export function useNotificationCenter() {
  return useContext(NotificationCenterContext)
}
