import { useEffect, useRef, useState } from 'react'
import { Icon } from '../shared/Icon'
import type { HeadNotification } from '../../../features/departments/head/types/head.types'

interface NotificationsMenuProps {
  items: HeadNotification[]
  onMarkAllRead?: () => void
}

/** Bell button with unread badge and a dropdown list. */
export function NotificationsMenu({
  items,
  onMarkAllRead,
}: NotificationsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const unread = items.filter((item) => item.unread).length

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="hbell" ref={rootRef}>
      <button
        type="button"
        className="hbell__btn"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" size={17} />
        {unread > 0 ? <span className="hbell__badge">{unread}</span> : null}
      </button>

      {open ? (
        <div className="hbell__menu">
          <div className="hbell__head">
            <strong>Notifications</strong>

            {onMarkAllRead ? (
              <button
                type="button"
                className="hbell__mark"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="hbell__empty">You're all caught up.</div>
          ) : null}

          {items.map((item) => (
            <div key={item.id} className="hbell__item">
              <span
                className={`hbell__dot${item.unread ? ' is-unread' : ''}`}
              />

              <div>
                <div className="hbell__text">{item.text}</div>
                <div className="hbell__time">{item.timeLabel}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
