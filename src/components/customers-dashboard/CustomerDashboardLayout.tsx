import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CustomerDashboardSidebar } from './CustomerDashboardSidebar'
import { CustomerDashboardTopbar } from './CustomerDashboardTopbar'
import { NotificationCenter } from '../head/layout/NotificationCenter'
import { getCustomerSession } from '../../features/customers/hooks/useCustomerSession'
import { apiRequest } from '../../api/client'
import type { HeadNotification } from '../../features/departments/head/types/head.types'
import './CustomerDashboard.css'

interface CustomerDashboardLayoutProps {
  activeKey?: string
  children?: ReactNode
  standalone?: boolean
}

interface CustomerNotificationPayload {
  id?: string | number
  title?: string
  message?: string
  createdAt?: unknown
  timestamp?: unknown
  read?: boolean
  link?: string
}

interface CustomerNotificationPage {
  data?: CustomerNotificationPayload[]
}

interface UnreadCountResponse {
  data?: number
}

export function CustomerDashboardLayout({
  activeKey = 'dashboard',
  children,
  standalone = false,
}: CustomerDashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768,
  )

  const customerSession = getCustomerSession()
  const isCustomerAuthenticated = Boolean(customerSession)
  const queryClient = useQueryClient()
  const customerNotificationKey = ['customer-notifications', customerSession?.customerId] as const

  const notificationHeaders = useMemo(() => ({
    username: customerSession?.username || customerSession?.email || '',
    ...(customerSession?.accessToken ? { Authorization: `Bearer ${customerSession.accessToken}` } : {}),
  }), [customerSession?.accessToken, customerSession?.email, customerSession?.username])

  const latestQuery = useQuery({
    queryKey: [...customerNotificationKey, 'latest'],
    queryFn: () => apiRequest<CustomerNotificationPage>('/api/notifications/latest?limit=10', {
      headers: notificationHeaders,
    }),
    enabled: false,
    staleTime: 45_000,
  })

  const unreadQuery = useQuery({
    queryKey: [...customerNotificationKey, 'unread-count'],
    queryFn: () => apiRequest<UnreadCountResponse>('/api/notifications/unread-count', {
      headers: notificationHeaders,
    }).then((response) => Number(response?.data ?? 0)),
    enabled: Boolean(customerSession?.customerId),
    refetchInterval: 45_000,
    staleTime: 45_000,
    refetchOnWindowFocus: false,
  })

  const notifications = useMemo<HeadNotification[]>(
    () => (latestQuery.data?.data ?? []).map((item, index) => ({
        id: String(item.id ?? `customer-notification-${index}`),
        text: item.title || item.message || 'Your account has been updated.',
        timeLabel: formatNotificationTime(item.createdAt ?? item.timestamp),
        unread: item.read !== true,
        link: typeof item.link === 'string' ? item.link : undefined,
      })),
    [latestQuery.data],
  )

  function markAllRead() {
    queryClient.setQueryData<number>([...customerNotificationKey, 'unread-count'], 0)
    queryClient.setQueryData<CustomerNotificationPage>([...customerNotificationKey, 'latest'], (page) => ({
      ...page,
      data: (page?.data ?? []).map((item) => ({ ...item, read: true })),
    }))
    if (!customerSession) return
    const headers = {
      username: customerSession.username || customerSession.email,
      ...(customerSession.accessToken ? { Authorization: `Bearer ${customerSession.accessToken}` } : {}),
    }
    void apiRequest('/api/notifications/read-all', { method: 'POST', headers })
  }
  const dashboard = (
    <div className="cdb-shell">
      <CustomerDashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        activeKey={activeKey}
      />

      <main className="cdb-main">
        <CustomerDashboardTopbar
          notificationCount={3}
          onToggleSidebar={() => setCollapsed((v) => !v)}
        />
        {children}
      </main>
    </div>
  )
  if (standalone) {
    return <div className="cdb-public-form-shell">{children}</div>
  }
  return isCustomerAuthenticated ? (
    <NotificationCenter
      items={notifications}
      roleLabel="Customer"
      onMarkAllRead={markAllRead}
      onOpen={() => void latestQuery.refetch()}
      unreadCount={unreadQuery.data ?? 0}
    >{dashboard}</NotificationCenter>
  ) : dashboard
}

function formatNotificationTime(value: unknown): string {
  if (!value) return 'Recently'
  const date = new Date(Array.isArray(value) ? new Date(value[0], (value[1] ?? 1) - 1, value[2] ?? 1).toISOString() : String(value))
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
