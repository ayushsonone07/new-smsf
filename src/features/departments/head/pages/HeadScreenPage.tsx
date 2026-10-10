import { useLocation, useParams } from '@tanstack/react-router'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { SCREEN_REGISTRY } from '../config/screenRegistry'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { resolveSlugFromPath } from '../utils/routeUtils'
import type { FeaturePermission } from '../../../permissions/types/permission.types'

interface HeadScreenPageProps {
  screenOverride?: string
}

/**
 * Resolves the slug from route params, screenOverride, or pathname,
 * and renders that screen's component.
 */
export function HeadScreenPage({ screenOverride }: HeadScreenPageProps = {}) {
  const { screen } = useParams({ strict: false }) as { screen?: string }
  const location = useLocation()
  const departmentId = useHeadDepartmentId()
  const nav = useHeadNav(departmentId)

  if (nav.isPending) {
    return <LoadingState message="Loading..." />
  }

  if (nav.isError) {
    return (
      <ErrorState
        title="Unable to load menu"
        message={nav.error.message}
        onRetry={() => nav.refetch()}
      />
    )
  }

  const targetSlug = screenOverride || screen || resolveSlugFromPath(location.pathname)

  // Block display if route visibility is 0 or route is disabled
  if (targetSlug && (!nav.isRouteEnabled(targetSlug) || !nav.isRouteEnabled(location.pathname))) {
    return (
      <ErrorState
        title="Page not available"
        message="This page is disabled because route visibility is set to 0. Ask the admin to enable it in dynamic permissions."
      />
    )
  }

  const feature = targetSlug ? nav.bySlug(targetSlug) : undefined

  const Screen = (
    feature
      ? SCREEN_REGISTRY[feature.screen]?.component
      : SCREEN_REGISTRY[targetSlug as keyof typeof SCREEN_REGISTRY]?.component
  )

  if (!Screen) {
    return (
      <ErrorState
        title="Page not available"
        message="This page is not enabled for your department. Ask the admin to enable it."
      />
    )
  }

  const effectiveFeature: FeaturePermission = feature ?? {
    id: targetSlug,
    departmentId,
    name: targetSlug.toUpperCase(),
    description: targetSlug,
    screen: (targetSlug === 'customer-list' ? 'customers' : targetSlug) as never,
    slug: targetSlug,
    icon: 'grid',
    enabled: true,
    kind: 'screen',
    order: 0,
    userVisible: true,
    roleAPermission: 'CAN_EDIT',
    roleBPermission: 'CAN_READ',
    category: 'screens',
  }

  return <Screen feature={effectiveFeature} />
}
