import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
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
import { IconButton } from '../../../../components/head/shared/IconButton'
import type { HeadNotification, HeadRole } from '../types/head.types'

import { buildDepartmentRoute, resolveDeptFromPath, resolveSlugFromPath } from '../utils/routeUtils'

interface HeadConsoleLayoutProps {
  portalRole: HeadRole
  children?: ReactNode
}

/**
 * Frame for every /head/* and /onboarding* route. Sidebar items come
 * from the admin-managed feature permissions; the
 * topbar title follows the current slug.
 */
export function HeadConsoleLayout({ portalRole, children }: HeadConsoleLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeFetchCount = useIsFetching()
  const [isManualRefresh, setIsManualRefresh] = useState(false)
  const session = getSession()
  const departmentId = useHeadDepartmentId()
  const deptFromUrl = resolveDeptFromPath(location.pathname) || undefined

  const effectiveDepartmentType = session?.user.departmentType || deptFromUrl
  const nav = useHeadNav(departmentId, effectiveDepartmentType)

  const slug = resolveSlugFromPath(location.pathname, portalRole)
  const feature = nav.bySlug(slug)
  const registry = feature ? SCREEN_REGISTRY[feature.screen] : undefined

  useEffect(() => {
    // Only canonicalize dynamic department URLs such as /sales/head/dashboard.
    // Standalone authenticated pages (for example /profile-update) also use
    // this shell but must not be redirected back to the department dashboard.
    if (
      !deptFromUrl ||
      !session?.user.departmentType ||
      session.user.role === 'ADMIN'
    ) return

    const canonicalPath = buildDepartmentRoute(
      slug,
      session.user.departmentType,
      session.user.role,
    )
    if (canonicalPath !== location.pathname) {
      navigate({ to: canonicalPath as never, replace: true })
    }
  }, [deptFromUrl, location.pathname, navigate, session?.user.departmentType, session?.user.role, slug])

  const [notifications, setNotifications] = useState<HeadNotification[]>([])

  const isImpersonating = getAdminBackup() !== null

  function handleExitImpersonation() {
    if (restoreAdminSession()) {
      const restored = getSession()
      navigate({
        to: homeForRole(
          restored?.user.role ?? 'ADMIN',
          restored?.user.departmentType,
        ) as never,
      })
    } else {
      handleLogout()
    }
  }

  function handleLogout() {
    clearSession()
    navigate({ to: '/login' })
  }

  async function handleRefresh() {
    if (isManualRefresh) return
    setIsManualRefresh(true)
    try {
      await queryClient.invalidateQueries({ refetchType: 'active' })
      await queryClient.refetchQueries({ type: 'active' })
      window.dispatchEvent(new CustomEvent('head:refresh'))
    } finally {
      setIsManualRefresh(false)
    }
  }

  return (
    <HeadShell
      navItems={nav.items}
      secondaryNavItems={[]}
      activeKey={feature?.slug ?? slug}
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
          onClick={() => void handleRefresh()}
          disabled={isManualRefresh}
          className={
            isManualRefresh || activeFetchCount > 0
              ? 'head-refresh-button is-refreshing'
              : 'head-refresh-button'
          }
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
      dashboardHeaderMode={feature?.screen === 'dashboard'}
    >
      {children ?? <Outlet />}
    </HeadShell>
  )
}
