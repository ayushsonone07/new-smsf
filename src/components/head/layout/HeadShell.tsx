import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { HeadSidebar } from './HeadSidebar'
import { HeadTopbar } from './HeadTopbar'
import { NotificationCenter } from './NotificationCenter'
import { HeadShellContext } from './HeadShellContext'
import type {
  HeadAccount,
  HeadNavItem,
  HeadNotification,
  HeadRole,
} from '../../../features/departments/head/types/head.types'

interface HeadShellProps {
  /* sidebar */
  navItems: HeadNavItem[]
  navLoading?: boolean
  navError?: string
  onRetryNav?: () => void
  secondaryNavItems?: HeadNavItem[]
  activeKey: string
  onNavigate: (item: HeadNavItem) => void
  account: HeadAccount
  roleLabel?: string
  role?: HeadRole
  onRoleChange?: (role: HeadRole) => void
  onLogout: () => void
  /* topbar */
  title?: ReactNode
  subtitle?: ReactNode
  topbarContent?: ReactNode
  topbarActions?: ReactNode
  notifications?: HeadNotification[]
  onMarkAllRead?: () => void
  /* impersonation */
  impersonating?: { name: string; onExit: () => void } | null
  /* page */
  children: ReactNode
  defaultSidebarOpen?: boolean
  dashboardHeaderMode?: boolean
}

/**
 * Head/User console frame — sidebar + sticky topbar +
 * optional impersonation strip + page body. Every
 * page in the console renders inside this.
 */
export function HeadShell({
  navItems,
  navLoading = false,
  navError,
  onRetryNav,
  secondaryNavItems,
  activeKey,
  onNavigate,
  account,
  roleLabel = 'Department Head',
  role,
  onRoleChange,
  onLogout,
  title,
  subtitle,
  topbarContent,
  topbarActions,
  notifications,
  onMarkAllRead,
  children,
  defaultSidebarOpen = true,
  dashboardHeaderMode = false,
}: HeadShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      defaultSidebarOpen &&
      (typeof window === 'undefined' || window.innerWidth > 1024),
  )

  const toggleSidebar = useCallback(
    () => setSidebarOpen((value) => !value),
    [],
  )

  const shellContext = useMemo(
    () => ({ toggleSidebar }),
    [toggleSidebar],
  )

  return (
    <NotificationCenter
      items={notifications ?? []}
      roleLabel={roleLabel}
      onMarkAllRead={onMarkAllRead}
    >
    <HeadShellContext.Provider value={shellContext}>
    <div className="hshell">
      {/* Mobile backdrop — closes sidebar on tap */}
      <div
        className={`hside-backdrop${sidebarOpen ? ' is-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        role="presentation"
      />

      <HeadSidebar
        open={sidebarOpen}
        onToggle={toggleSidebar}
        roleLabel={roleLabel}
        items={navItems}
        isLoading={navLoading}
        loadError={navError}
        onRetry={onRetryNav}
        secondaryItems={secondaryNavItems}
        activeKey={activeKey}
        onSelect={(item) => {
          onNavigate(item)
          /* Auto-close sidebar on mobile after navigation */
          if (window.innerWidth <= 760) setSidebarOpen(false)
        }}
        account={account}
        role={role}
        onRoleChange={onRoleChange}
        onLogout={onLogout}
      />

      <main className="hmain">
        {!dashboardHeaderMode && (
          <HeadTopbar
            title={title}
            subtitle={subtitle}
            actions={topbarActions}
            onToggleSidebar={toggleSidebar}
          >
            {topbarContent}
          </HeadTopbar>
        )}

        <div className={`hbody${dashboardHeaderMode ? ' hbody--dashboard' : ''}`}>{children}</div>
      </main>
    </div>
    </HeadShellContext.Provider>
    </NotificationCenter>
  )
}
