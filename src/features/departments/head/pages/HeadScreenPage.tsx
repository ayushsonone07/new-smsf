import { Navigate, useLocation, useParams } from '@tanstack/react-router'
import { getSession } from '../../../../app/auth/session'
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
  const isGoogle =
    location.pathname.startsWith('/google-head') ||
    location.pathname.startsWith('/google')

  const feature = targetSlug ? nav.bySlug(targetSlug) : undefined

  const Screen = feature
    ? SCREEN_REGISTRY[feature.screen]?.component
    : undefined

  if (!feature) {
    const firstEnabledFeature = nav.features[0]

    if (firstEnabledFeature) {
      const isUser = getSession()?.user.role === 'USER'

      return isUser ? (
        <Navigate
          to="/users/$screen"
          params={{ screen: firstEnabledFeature.slug }}
          replace
        />
      ) : (
        <Navigate
          to="/head/$screen"
          params={{ screen: firstEnabledFeature.slug }}
          replace
        />
      )
    }

    return (
      <ErrorState
        title="No pages enabled"
        message="The admin has not enabled any route for your department yet."
      />
    )
  }

  if (!Screen) {
    return (
      <ErrorState
        title="Page not available"
        message="This page is not available yet."
      />
    )
  }

  return <Screen feature={feature} />
}
