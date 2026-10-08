import { useParams } from '@tanstack/react-router'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { SCREEN_REGISTRY } from '../config/screenRegistry'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'

/**
 * /head/$screen — resolves the slug to an enabled
 * feature and renders that screen's component.
 */
export function HeadScreenPage() {
  const { screen } = useParams({ strict: false }) as { screen?: string }
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

  const feature = screen ? nav.bySlug(screen) : undefined

  if (!feature) {
    return (
      <ErrorState
        title="Page not available"
        message="This page is not enabled for your department. Ask the admin to enable it."
      />
    )
  }

  const Screen = SCREEN_REGISTRY[feature.screen].component
  return <Screen feature={feature} />
}
