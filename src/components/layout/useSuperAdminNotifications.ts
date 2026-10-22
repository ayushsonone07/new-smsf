import { useEffect, useMemo, useState } from 'react'
import type { HeadNotification } from '../../features/departments/head/types/head.types'
import {
  getSuperAdminNotifications,
  markAllSuperAdminNotificationsRead,
  markSuperAdminNotificationRead,
  subscribeSuperAdminNotifications,
  type SuperAdminNotification,
} from '../../api/superadmin-notifications.api'

function toHeadNotification(
  item: SuperAdminNotification,
): HeadNotification {
  return {
    id: item.id,
    text: item.title ? `${item.title} — ${item.message}` : item.message,
    timeLabel: formatTime(item.createdAt),
    unread: !item.read,
    link: item.link,
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

/**
 * Feeds the shared NotificationCenter with super-admin notifications and
 * marks them read once the drawer is opened (mirrors the head/user flow).
 */
export function useSuperAdminNotifications() {
  const [raw, setRaw] = useState<SuperAdminNotification[]>([])

  useEffect(() => {
    let active = true
    getSuperAdminNotifications().then((data) => {
      if (active) setRaw(data)
    })
    const unsubscribe = subscribeSuperAdminNotifications((data) => {
      setRaw(data)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const items = useMemo(() => raw.map(toHeadNotification), [raw])

  function markAllRead() {
    void markAllSuperAdminNotificationsRead()
  }

  function markRead(id: string) {
    void markSuperAdminNotificationRead(id)
  }

  return { items, markAllRead, markRead }
}
