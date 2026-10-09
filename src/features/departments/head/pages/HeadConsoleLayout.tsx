import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { HeadShell } from '../../../../components/head/layout/HeadShell'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { SCREEN_REGISTRY } from '../config/screenRegistry'
import {
  clearSession,
  getAdminBackup,
  getSession,
  homeForRole,
  restoreAdminSession,
} from '../../../../app/auth/session'
import { sampleNotifications } from '../../../../api/mock/head.db'
import { IconButton } from '../../../../components/head/shared/IconButton'
import type { HeadNotification, HeadRole } from '../types/head.types'

interface HeadConsoleLayoutProps {
  portalRole: HeadRole
}

/**
 * Frame for every /head/* route. Sidebar items come
 * from the admin-managed feature permissions; the
 * topbar title follows the current slug.
 */
export function HeadConsoleLayout({ portalRole }: HeadConsoleLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const departmentId = useHeadDepartmentId()

  const nav = useHeadNav(departmentId)

  const basePath = portalRole === 'USER' ? '/users' : '/head'
  const slug = location.pathname
    .replace(new RegExp(`^${basePath}/?`), '')
    .split('/')[0]
  const feature = nav.bySlug(slug)
  const registry = feature ? SCREEN_REGISTRY[feature.screen] : undefined

  const [notifications, setNotifications] =
    useState<HeadNotification[]>(sampleNotifications)

  const isImpersonating = getAdminBackup() !== null

  function handleExitImpersonation() {
    if (restoreAdminSession()) {
      navigate({ to: homeForRole('ADMIN') as never })
    } else {
      handleLogout()
    }
  }

  function handleLogout() {
    clearSession()
    navigate({ to: '/login' })
  }

  return (
    <HeadShell
      navItems={nav.items}
      secondaryNavItems={[
        {
          key: 'fetch-rc',
          label: 'Fetch R/C',
          icon: 'link',
          to: '/admin/fetch-rc',
        },
      ]}
      activeKey={slug}
      onNavigate={(item) => {
        if (item.to) navigate({ to: item.to })
      }}
      account={{
        label: session?.user.email ?? 'onboarding@mbg.com',
        roleLabel: portalRole === 'USER' ? 'Department User' : 'Department Head',
        initial: session?.user.name ?? 'O',
      }}
      roleLabel={portalRole === 'USER' ? 'Department User' : 'Department Head'}
      onLogout={handleLogout}
      impersonating={
        isImpersonating
          ? {
              name: session?.user.email ?? 'department',
              onExit: handleExitImpersonation,
            }
          : null
      }
      title={registry?.title ?? feature?.name ?? 'Head Panel'}
      subtitle={feature?.description}
      topbarActions={
        <IconButton
          icon="refresh"
          label="Refresh data"
          variant="outline"
          size={34}
          iconSize={16}
        />
      }
      notifications={notifications}
      onMarkAllRead={() =>
        setNotifications((items) =>
          items.map((item) => ({ ...item, unread: false })),
        )
      }
    >
      <Outlet />
    </HeadShell>
  )
}
