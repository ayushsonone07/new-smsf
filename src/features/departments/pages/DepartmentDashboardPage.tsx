import { useParams } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useDepartmentDashboard } from '../hooks/useDepartmentDashboard'
import { DepartmentDashboard } from '../../../components/dashboard/DepartmentDashboard'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

export function DepartmentDashboardPage() {
  const { departmentId } = useParams({
    from: '/departments/$departmentId/dashboard',
  })

  const departmentsQuery = useDepartments()
  const dashboardQuery =
    useDepartmentDashboard(departmentId)

  const department = departmentsQuery.data?.find(
    (item) => item.id === departmentId,
  )

  if (dashboardQuery.isPending) {
    return (
      <PageLayout>
        <LoadingState message="Loading dashboard..." />
      </PageLayout>
    )
  }

  if (dashboardQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          title="Unable to load dashboard"
          message={dashboardQuery.error.message}
          onRetry={() => dashboardQuery.refetch()}
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            Departments /{' '}
            {department?.name ?? 'Dashboard'}
          </>
        }
        title={`${department?.name ?? 'Department'} Dashboard`}
        description="Overview of customers, services and recent activity for this department."
      />

      <DepartmentDashboard
        departmentId={departmentId}
        dashboard={dashboardQuery.data}
      />
    </PageLayout>
  )
}
