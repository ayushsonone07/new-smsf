import { useEffect, useState, type ReactNode } from 'react'
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

  useEffect(() => {
    if (!customerSession?.customerId) return
    let active = true
    const headers = {
      username: customerSession.username || customerSession.email,
      ...(customerSession.accessToken ? { Authorization: `Bearer ${customerSession.accessToken}` } : {}),
    }
    const loadNotifications = () => apiRequest<any>('/api/notifications?page=0&size=100&sortDir=desc', { headers })
      .then((response) => {
        const items = Array.isArray(response?.data)
          ? response.data
          : []
        if (!active) return
        setBackendNotifications(items.map((item: any, index: number) => ({
          id: String(item.id ?? `customer-notification-${index}`),
          text: item.title || item.message || 'Your account has been updated.',
          timeLabel: formatNotificationTime(item.createdAt ?? item.timestamp),
          unread: item.read !== true,
          link: typeof item.link === 'string' ? item.link : undefined,
        })))
      })
      .catch(() => { if (active) setBackendNotifications([]) })
    loadNotifications()
    const refreshTimer = window.setInterval(loadNotifications, 45_000)
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') loadNotifications() }
    document.addEventListener('visibilitychange', refreshOnFocus)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [customerSession?.customerId, customerSession?.email, customerSession?.username, customerSession?.accessToken])

  const notifications: HeadNotification[] = backendNotifications

  function markAllRead() {
    setBackendNotifications((items) => items.map((item) => ({ ...item, unread: false })))
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
