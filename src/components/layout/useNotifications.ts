import { useEffect, useMemo, useState } from 'react'
import { getSession } from '../../app/auth/session'
import type { HeadNotification } from '../../features/departments/head/types/head.types'
import {
  getNotificationsForUser,
  markAllNotificationsForUserRead,
  markSuperAdminNotificationRead,
  subscribeSuperAdminNotifications,
  type SuperAdminNotification,
} from '../../api/superadmin-notifications.api'

function toHeadNotification(item: SuperAdminNotification): HeadNotification {
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
 * Feeds the shared NotificationCenter with the notifications visible to the
 * signed-in user (role- and department-scoped). Super admins see everything.
 */
export function useNotifications() {
  const [raw, setRaw] = useState<SuperAdminNotification[]>([])

  useEffect(() => {
    const session = getSession()
    let active = true
    getNotificationsForUser(session?.user).then((data) => {
      if (active) setRaw(data)
    })
    const unsubscribe = subscribeSuperAdminNotifications(() => {
      void getNotificationsForUser(getSession()?.user).then((data) => {
        if (active) setRaw(data)
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const items = useMemo(() => raw.map(toHeadNotification), [raw])

  function markAllRead() {
    void markAllNotificationsForUserRead(getSession()?.user)
  }

  function markRead(id: string) {
    void markSuperAdminNotificationRead(id)
  }

  return { items, markAllRead, markRead }
}
