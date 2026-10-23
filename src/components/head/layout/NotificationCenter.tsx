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
                className={`hnotify-item${item.unread ? ' is-unread' : ''} ${item.kind === 'call-initiated' ? 'is-call' : notificationTone(item.text, item.link)}`}
                onClick={() => {
                  if (item.link) openNotificationLink(item.link)
                }}
                disabled={!item.link}
                aria-label={item.link ? `Open notification: ${item.text}` : item.text}
              >
                <span className="hnotify-item__icon">
                  <Icon name={item.kind === 'call-initiated' ? 'phone' : 'bell'} size={15} />
                </span>
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

function notificationTone(text: string, link?: string): 'is-completed' | 'is-pending' {
  if (link && isConfirmationLinkCompleted(link)) return 'is-completed'
  const normalized = text.toLowerCase()
  // Calls to action such as "Complete your onboarding" are still pending.
  if (/complete your onboarding|finish your onboarding|onboarding pending|incomplete|review and acknowledge|awaiting acknowledgement/.test(normalized)) {
    return 'is-pending'
  }

  return /completed|approved|successful|successfully|acknowledged|generated/.test(normalized)
    ? 'is-completed'
    : 'is-pending'
}

function openNotificationLink(link: string) {
  try {
    const target = new URL(link, window.location.origin)
    if (target.pathname.startsWith('/confirmation/')) {
      sessionStorage.setItem(
        'smsf.active-confirmation-link',
        `${target.pathname}${target.search}`,
      )
    }
    if (
      target.origin === window.location.origin ||
      target.pathname.startsWith('/confirmation/')
    ) {
      // Keep the current tab and its sessionStorage so authenticated onboarding
      // routes do not send the customer back to the login screen.
      window.location.assign(`${target.pathname}${target.search}${target.hash}`)
      return
    }
    window.open(target.toString(), '_blank', 'noopener,noreferrer')
  } catch {
    window.location.assign(link)
  }
}

function isConfirmationLinkCompleted(link: string) {
  try {
    const target = new URL(link, window.location.origin)
    const key = `${target.pathname}${target.search}`
    const stored = JSON.parse(
      localStorage.getItem('smsf.completed-confirmation-links') || '[]',
    ) as unknown
    return Array.isArray(stored) && stored.includes(key)
  } catch {
    return false
  }
}

export function useNotificationCenter() {
  return useContext(NotificationCenterContext)
}
