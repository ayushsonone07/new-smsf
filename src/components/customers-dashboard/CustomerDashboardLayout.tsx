import { useState, type ReactNode } from 'react'
import { CustomerDashboardSidebar } from './CustomerDashboardSidebar'
import { CustomerDashboardTopbar } from './CustomerDashboardTopbar'
import './CustomerDashboard.css'

interface CustomerDashboardLayoutProps {
  activeKey?: string
  children?: ReactNode
}

export function CustomerDashboardLayout({
  activeKey = 'dashboard',
  children,
}: CustomerDashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="cdb-shell">
      <CustomerDashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        activeKey={activeKey}
      />

      <main className="cdb-main">
        <CustomerDashboardTopbar notificationCount={3} />
        {children}
      </main>
    </div>
  )
}
