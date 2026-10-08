import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { HeadShell } from '../../../../components/head/layout/HeadShell'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { SCREEN_REGISTRY } from '../config/screenRegistry'
import { clearSession, getSession } from '../../../../app/auth/session'
import { sampleNotifications } from '../../../../api/mock/head.db'
import { IconButton } from '../../../../components/head/shared/IconButton'
import type { HeadNotification, HeadRole } from '../types/head.types'

/**
 * Frame for every /head/* route. Sidebar items come
 * from the admin-managed feature permissions; the
 * topbar title follows the current slug.
 */
export function HeadConsoleLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const departmentId = useHeadDepartmentId()

  const nav = useHeadNav(departmentId)

  const slug = location.pathname.replace(/^\/head\/?/, '').split('/')[0]
  const feature = nav.bySlug(slug)
  const registry = feature ? SCREEN_REGISTRY[feature.screen] : undefined

  const [role, setRole] = useState<HeadRole>('HEAD')
  const [notifications, setNotifications] =
    useState<HeadNotification[]>(sampleNotifications)

  function handleLogout() {
    clearSession()
    navigate({ to: '/login' })
  }

  return (
    <HeadShell
      navItems={nav.items}
      activeKey={slug}
      onNavigate={(item) => {
        if (item.to) navigate({ to: item.to })
      }}
      account={{
        label: session?.user.email ?? 'onboarding@mbg.com',
        roleLabel: 'Department Head',
        initial: session?.user.name ?? 'O',
      }}
      role={role}
      onRoleChange={(next) => {
        setRole(next)
        if (next === 'USER') navigate({ to: '/users' })
      }}
      onLogout={handleLogout}
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
