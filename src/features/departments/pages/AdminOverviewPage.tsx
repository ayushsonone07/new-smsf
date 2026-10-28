import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { uniqueDepartmentHeads } from '../utils/departmentHeads'
import { AdminOverview } from '../../../components/departments/AdminOverview'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

/**
 * SuperAdmin Overview tab (/admin/overview): company-wide service totals and one
 * card per department, from GET /api/auth/admin/summary. Read-only.
 */
export function AdminOverviewPage() {
  const departmentsQuery = useDepartments()

  // One card per department that has a head (same departments as the Departments list)
  const departmentTypes = useMemo(
    () =>
      uniqueDepartmentHeads(departmentsQuery.data ?? [])
        .map((department) => department.type)
        .filter((type): type is string => Boolean(type) && type !== 'unknown'),
    [departmentsQuery.data],
  )

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            <span>Overview</span>
          </>
        }
        title="Overview"
        description="Service totals across all departments."
      />

      {departmentsQuery.isPending ? (
        <LoadingState message="Loading departments..." />
      ) : departmentsQuery.isError ? (
        <ErrorState
          title="Unable to load departments"
          message={departmentsQuery.error.message}
          onRetry={() => departmentsQuery.refetch()}
        />
      ) : (
        <AdminOverview departmentTypes={departmentTypes} />
      )}
    </PageLayout>
  )
}
