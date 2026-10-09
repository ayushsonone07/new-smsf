import { Navigate } from '@tanstack/react-router'
import { useHeadNav } from '../hooks/useHeadNav'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import type { HeadRole } from '../types/head.types'

interface HeadIndexPageProps {
  portalRole?: HeadRole
}

/** /head → first enabled menu item. */
export function HeadIndexPage({ portalRole = 'HEAD' }: HeadIndexPageProps) {
  const departmentId = useHeadDepartmentId()
  const nav = useHeadNav(departmentId)

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

  if (portalRole === 'USER') {
    return <Navigate to="/users/$screen" params={{ screen: first.slug }} replace />
  }

  return <Navigate to="/head/$screen" params={{ screen: first.slug }} replace />
}
