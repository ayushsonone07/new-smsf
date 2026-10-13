import { Navigate, useLocation } from '@tanstack/react-router'
import { getSession } from '../../../../app/auth/session'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { buildDepartmentRoute, resolveDeptFromPath } from '../utils/routeUtils'
import type { HeadRole } from '../types/head.types'

interface HeadIndexPageProps {
  portalRole?: HeadRole
}

/** /head → first enabled menu item. */
export function HeadIndexPage({ portalRole = 'HEAD' }: HeadIndexPageProps) {
  const location = useLocation()
  const departmentId = useHeadDepartmentId()
  const deptFromUrl = resolveDeptFromPath(location.pathname) || undefined
  const session = getSession()
  const effectiveDeptType = session?.user.departmentType || deptFromUrl
  const nav = useHeadNav(departmentId, effectiveDeptType)

  if (nav.isPending) return <LoadingState message="Loading..." />

  const first = nav.features[0]

  if (!first) {
    return (
      <ErrorState
        title="No pages enabled"
        message="The admin has not enabled any feature for this department yet."
      />
    )
  }

  if (effectiveDeptType) {
    const target = buildDepartmentRoute(first.slug, effectiveDeptType, portalRole)
    return <Navigate to={target as never} replace />
  }

  if (portalRole === 'USER') {
    return <Navigate to="/users/$screen" params={{ screen: first.slug }} replace />
  }

  return <Navigate to="/head/$screen" params={{ screen: first.slug }} replace />
}
