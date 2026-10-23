import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { HeadNotification } from '../../features/departments/head/types/head.types'
import type { SuperAdminNotification } from '../../api/superadmin-notifications.api'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications.api'

function toHeadNotification(item: SuperAdminNotification): HeadNotification {
  return {
    id: item.id,
    text: item.title ? `${item.title} — ${item.message}` : item.message,
    timeLabel: formatTime(item.createdAt),
    unread: !item.read,
    link: item.link,
    kind: item.kind,
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
  const queryClient = useQueryClient()
  const { data: raw = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  })

  const items = useMemo(() => raw.map(toHeadNotification), [raw])

  function markAllRead() {
    queryClient.setQueryData<SuperAdminNotification[]>(['notifications'], (items = []) =>
      items.map((item) => ({ ...item, read: true })))
    void markAllNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
  }

  function markRead(id: string) {
    queryClient.setQueryData<SuperAdminNotification[]>(['notifications'], (items = []) =>
      items.map((item) => item.id === id ? { ...item, read: true } : item))
    void markNotificationRead(id).then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
  }

  return { items, markAllRead, markRead }
}
