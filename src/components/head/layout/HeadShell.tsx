import { useState } from 'react'
import type { ReactNode } from 'react'
import { HeadSidebar } from './HeadSidebar'
import { HeadTopbar } from './HeadTopbar'
import { ImpersonationBanner } from './ImpersonationBanner'
import type {
  HeadAccount,
  HeadNavItem,
  HeadNotification,
  HeadRole,
} from '../../../features/departments/head/types/head.types'

interface HeadShellProps {
  /* sidebar */
  navItems: HeadNavItem[]
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
}

/**
 * Head/User console frame — sidebar + sticky topbar +
 * optional impersonation strip + page body. Every
 * page in the console renders inside this.
 */
export function HeadShell({
  navItems,
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
  impersonating,
  children,
  defaultSidebarOpen = true,
}: HeadShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen)

  return (
    <div className="hshell">
      <HeadSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((value) => !value)}
        roleLabel={roleLabel}
        items={navItems}
        secondaryItems={secondaryNavItems}
        activeKey={activeKey}
        onSelect={onNavigate}
        account={account}
        role={role}
        onRoleChange={onRoleChange}
        onLogout={onLogout}
      />

      <main className="hmain">
        <HeadTopbar
          title={title}
          subtitle={subtitle}
          actions={topbarActions}
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
        >
          {topbarContent}
        </HeadTopbar>

        {impersonating ? (
          <ImpersonationBanner
            name={impersonating.name}
            onExit={impersonating.onExit}
          />
        ) : null}

        <div className="hbody">{children}</div>
      </main>
    </div>
  )
}
