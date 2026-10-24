import { authedApiRequest } from './client'
import type { NotificationAudience, SuperAdminNotification } from './superadmin-notifications.api'

export interface NotificationPage {
  data?: BackendNotification[]
  pageNumber?: number
  totalElements?: number
  totalPage?: number
  isLast?: boolean
}

interface ApiEnvelope<T> { data?: T }

export interface BackendNotification {
  id: string
  eventId?: string
  kind?: SuperAdminNotification['kind']
  title?: string
  message: string
  link?: string
  audience?: NotificationAudience
  scope?: { departmentId?: string; departmentType?: string; customerId?: string }
  read?: boolean
  createdAt: string
}

export interface NotificationEventInput {
  eventId: string
  kind: SuperAdminNotification['kind']
  title: string
  message: string
  link?: string
  audience: NotificationAudience
  scope?: { departmentId?: string; departmentType?: string; customerId?: string }
  channels?: string[]
}

function mapNotification(item: BackendNotification): SuperAdminNotification {
  return {
    id: item.id,
    title: item.title ?? '',
    message: item.message,
    createdAt: item.createdAt,
    read: item.read === true,
    link: item.link,
    kind: item.kind,
    audience: item.audience ?? 'ALL',
    departmentId: item.scope?.departmentId,
    departmentType: item.scope?.departmentType,
    customerId: item.scope?.customerId,
  }
}

export async function fetchNotifications(): Promise<SuperAdminNotification[]> {
  try {
    const response = await authedApiRequest<NotificationPage>('/api/notifications?page=0&size=100&sortDir=desc')
    return (response?.data ?? []).map(mapNotification)
  } catch (err) {
    console.warn('Backend notification feed unavailable, returning empty list:', err)
    return []
  }
}

export async function fetchAllNotifications(): Promise<SuperAdminNotification[]> {
  try {
    const pageSize = 100
    const first = await authedApiRequest<NotificationPage>(
      `/api/notifications?page=0&size=${pageSize}&sortDir=desc`,
    )
    const all = [...(first?.data ?? [])]
    const totalPages = Math.max(1, first?.totalPage ?? 1)

    for (let page = 1; page < totalPages; page += 1) {
      const response = await authedApiRequest<NotificationPage>(
        `/api/notifications?page=${page}&size=${pageSize}&sortDir=desc`,
      )
      all.push(...(response?.data ?? []))
    }

    return all.map(mapNotification)
  } catch (err) {
    console.warn('Backend notification feed unavailable, returning empty list:', err)
    return []
  }
}

export function markNotificationRead(id: string): Promise<unknown> {
  return authedApiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' })
}

export function markAllNotificationsRead(): Promise<unknown> {
  return authedApiRequest('/api/notifications/read-all', { method: 'POST' })
}

export async function createNotificationEvent(input: NotificationEventInput): Promise<SuperAdminNotification> {
  const response = await authedApiRequest<ApiEnvelope<BackendNotification>>('/api/notifications/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.data) throw new Error('Notification service returned no notification')
  return mapNotification(response.data)
}
