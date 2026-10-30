import { useMemo } from 'react'
import { useDepartments } from '../hooks/useDepartments'
import { uniqueDepartmentHeads } from '../utils/departmentHeads'
import { AdminOverview } from '../../../components/departments/AdminOverview'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

/**
 * SuperAdmin Overview tab (/admin/overview):
 * Modern company-wide dashboard featuring real-time KPIs, department health,
 * delay rankings, and department head performance rankings.
 */
export function AdminOverviewPage() {
  const departmentsQuery = useDepartments()

  // Extract unique department heads
  const heads = useMemo(
    () => uniqueDepartmentHeads(departmentsQuery.data ?? []),
    [departmentsQuery.data],
  )

  // One card per department that has a head (same departments as the Departments list)
  const departmentTypes = useMemo(
    () =>
      heads
        .map((department) => department.type)
        .filter((type): type is string => Boolean(type) && type !== 'unknown'),
    [heads],
  )

  // Refresh keeps the cards on screen; dim them while the refetch runs.
  const isRefreshing = departmentsQuery.isFetching && !departmentsQuery.isPending

  return (
    <PageLayout>
      {departmentsQuery.isPending ? (
        <LoadingState message="Loading overview..." />
      ) : departmentsQuery.isError ? (
        <ErrorState
          title="Unable to load departments"
          message={departmentsQuery.error.message}
          onRetry={() => departmentsQuery.refetch()}
        />
      ) : (
        <div
          className={`transition-opacity duration-200 ${
            isRefreshing ? 'pointer-events-none opacity-60' : ''
          }`}
          aria-busy={isRefreshing}
        >
          <AdminOverview
            departments={departmentsQuery.data ?? []}
            departmentTypes={departmentTypes}
            onRefreshAll={() => departmentsQuery.refetch()}
          />
        </div>
      )}
    </PageLayout>
  )
}
