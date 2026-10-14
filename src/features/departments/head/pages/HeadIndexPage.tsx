import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
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
  const navigate = useNavigate()
  const didRedirect = useRef(false)

  const first = nav.features[0]

  let target: string | null = null
  if (!nav.isPending && first) {
    if (effectiveDeptType) {
      target = buildDepartmentRoute(first.slug, effectiveDeptType, portalRole)
    } else if (portalRole === 'USER') {
      target = `/users/${first.slug}`
    } else {
      target = `/head/${first.slug}`
    }
  }

  // Redirect imperatively, exactly once, instead of rendering <Navigate>.
  // TanStack's <Navigate> re-runs its navigation on every render (its effect
  // depends on a freshly created props object). Because this page subscribes
  // to router state, a pending destination re-renders the page, which fires
  // the navigation again — forever — freezing the browser tab.
  useEffect(() => {
    if (!target || didRedirect.current) return
    didRedirect.current = true
    navigate({ to: target as never, replace: true })
  }, [navigate, target])

  if (nav.isPending) return <LoadingState message="Loading..." />

  if (!first) {
    return (
      <ErrorState
        title="No pages enabled"
        message="The admin has not enabled any feature for this department yet."
      />
    )
  }

  return <LoadingState message="Redirecting..." />
}
