import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { HeadNotification } from '../../features/departments/head/types/head.types'
import type { SuperAdminNotification } from '../../api/superadmin-notifications.api'
import { fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '../../api/notifications.api'

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
  const latestQuery = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => fetchNotifications(10),
    enabled: false,
    staleTime: 45_000,
  })
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 45_000,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
  })

  const items = useMemo(
    () => (latestQuery.data ?? []).map(toHeadNotification),
    [latestQuery.data],
  )

  function markAllRead() {
    queryClient.setQueryData<number>(['notifications', 'unread-count'], 0)
    queryClient.setQueryData<SuperAdminNotification[]>(['notifications', 'latest'], (items = []) =>
      items.map((item) => ({ ...item, read: true })))
    void markAllNotificationsRead().catch(() =>
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }))
  }

  function markRead(id: string) {
    queryClient.setQueryData<SuperAdminNotification[]>(['notifications', 'latest'], (items = []) =>
      items.map((item) => item.id === id ? { ...item, read: true } : item))
    queryClient.setQueryData<number>(['notifications', 'unread-count'], (count = 0) => Math.max(0, count - 1))
    void markNotificationRead(id).catch(() =>
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }))
  }

  return { items, unreadCount, loadLatest: latestQuery.refetch, markAllRead, markRead }
}
