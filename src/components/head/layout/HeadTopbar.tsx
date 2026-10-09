import type { ReactNode } from 'react'
import { NotificationsMenu } from './NotificationsMenu'
import { Icon } from '../shared/Icon'
import type { HeadNotification } from '../../../features/departments/head/types/head.types'

interface HeadTopbarProps {
  title?: ReactNode
  subtitle?: ReactNode
  /**
   * Replaces the title block entirely — e.g. the
   * dashboard's blue welcome banner.
   */
  children?: ReactNode
  /** Buttons rendered before the bell (refresh, etc). */
  actions?: ReactNode
  notifications?: HeadNotification[]
  onMarkAllRead?: () => void
  onToggleSidebar?: () => void
}

/** Sticky translucent header: title + subtitle (or custom banner), actions, bell. */
export function HeadTopbar({
  title,
  subtitle,
  children,
  actions,
  notifications = [],
  onMarkAllRead,
  onToggleSidebar,
}: HeadTopbarProps) {
  return (
    <header className="htop">
      {onToggleSidebar ? (
        <button
          type="button"
          className="htop__menu-btn"
          aria-label="Toggle navigation"
          title="Toggle navigation"
          onClick={onToggleSidebar}
        >
          <Icon name="menu" size={17} />
        </button>
      ) : null}
      {children ?? (
        <div className="htop__title">
          <h1>{title}</h1>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      )}

      {actions}

      <NotificationsMenu
        items={notifications}
        onMarkAllRead={onMarkAllRead}
      />
    </header>
  )
}
