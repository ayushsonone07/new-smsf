import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({
  children,
}: AdminLayoutProps) {
  return (
    <div className="app-shell">
      <AdminSidebar />

      <div className="main-content">
        {children}
      </div>
    </div>
  )
}