import { useLocation, useParams } from '@tanstack/react-router'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { SCREEN_REGISTRY } from '../config/screenRegistry'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { resolveSlugFromPath } from '../utils/routeUtils'

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
  const feature = targetSlug ? nav.bySlug(targetSlug) : undefined

  const Screen = feature
    ? SCREEN_REGISTRY[feature.screen]?.component
    : undefined

  if (!feature || !Screen) {
    return (
      <ErrorState
        title="Page not available"
        message="This page is not enabled for your department. Ask the admin to enable it."
      />
    )
  }

  return <Screen feature={feature} />
}
