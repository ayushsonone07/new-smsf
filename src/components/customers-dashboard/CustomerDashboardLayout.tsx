import { useState, type ReactNode } from 'react'
import { CustomerDashboardSidebar } from './CustomerDashboardSidebar'
import { CustomerDashboardTopbar } from './CustomerDashboardTopbar'
import { NotificationCenter } from '../head/layout/NotificationCenter'
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

  const notifications = [
    { id: 'customer-1', text: 'Your onboarding status has been updated.', timeLabel: 'Today', unread: true },
    { id: 'customer-2', text: 'A new update was added to your service.', timeLabel: 'Yesterday', unread: true },
  ]

  return (
    <NotificationCenter items={notifications} roleLabel="Customer">
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
    </NotificationCenter>
  )
}
