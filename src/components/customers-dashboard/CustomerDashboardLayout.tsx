import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CustomerDashboardSidebar } from './CustomerDashboardSidebar'
import { CustomerDashboardTopbar } from './CustomerDashboardTopbar'
import { NotificationCenter } from '../head/layout/NotificationCenter'
import { getCustomerSession } from '../../features/customers/hooks/useCustomerSession'
import { apiRequest } from '../../api/client'
import type { HeadNotification } from '../../features/departments/head/types/head.types'
import {
  getNotificationsForCustomerSync,
  markAllNotificationsForCustomerRead,
  subscribeSuperAdminNotifications,
  type SuperAdminNotification,
} from '../../api/superadmin-notifications.api'
import './CustomerDashboard.css'

interface CustomerDashboardLayoutProps {
  activeKey?: string
  children?: ReactNode
}

export function CustomerDashboardLayout({
  activeKey = 'dashboard',
  children,
}: CustomerDashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768,
  )

  const customerSession = getCustomerSession()
  const isCustomerAuthenticated = Boolean(customerSession)
  const [backendNotifications, setBackendNotifications] = useState<HeadNotification[]>([])
  const [localNotifications, setLocalNotifications] = useState<SuperAdminNotification[]>([])

  useEffect(() => {
    if (!customerSession?.customerId) return
    let active = true
    const headers = {
      username: customerSession.username || customerSession.email,
      ...(customerSession.accessToken ? { Authorization: `Bearer ${customerSession.accessToken}` } : {}),
    }
    const loadNotifications = () => apiRequest<any>(`/api/notifications/customer?customerId=${encodeURIComponent(customerSession.customerId)}`, { headers })
      .then((response) => {
        const items = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.content)
            ? response.data.content
            : []
        if (!active) return
        setBackendNotifications(items.map((item: any, index: number) => ({
          id: String(item.id ?? `customer-notification-${index}`),
          text: item.title || item.message || 'Your account has been updated.',
          timeLabel: formatNotificationTime(item.timestamp),
          unread: item.read !== true,
          link: typeof item.link === 'string' ? item.link : undefined,
        })))
      })
      .catch(() => { if (active) setBackendNotifications([]) })
    loadNotifications()
    const refreshTimer = window.setInterval(loadNotifications, 15_000)
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') loadNotifications() }
    document.addEventListener('visibilitychange', refreshOnFocus)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [customerSession?.customerId, customerSession?.email, customerSession?.username, customerSession?.accessToken])

  useEffect(() => {
    const refresh = () => setLocalNotifications(
      getNotificationsForCustomerSync(customerSession?.customerId),
    )
    refresh()
    return subscribeSuperAdminNotifications(refresh)
  }, [customerSession?.customerId])

  const notifications = useMemo<HeadNotification[]>(() => [
    ...localNotifications.map((item) => ({
      id: item.id,
      text: item.title ? `${item.title} — ${item.message}` : item.message,
      timeLabel: formatNotificationTime(item.createdAt),
      unread: !item.read,
      link: item.link,
    })),
    ...backendNotifications,
  ], [backendNotifications, localNotifications])

  function markAllRead() {
    setBackendNotifications((items) => items.map((item) => ({ ...item, unread: false })))
    void markAllNotificationsForCustomerRead(customerSession?.customerId)
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
  return isCustomerAuthenticated ? (
    <NotificationCenter items={notifications} roleLabel="Customer" onMarkAllRead={markAllRead}>{dashboard}</NotificationCenter>
  ) : dashboard
}

function formatNotificationTime(value: unknown): string {
  if (!value) return 'Recently'
  const date = new Date(Array.isArray(value) ? new Date(value[0], (value[1] ?? 1) - 1, value[2] ?? 1).toISOString() : String(value))
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
