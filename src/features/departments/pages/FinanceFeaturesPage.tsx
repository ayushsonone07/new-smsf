import { useParams } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useRoutes, type RouteInfo } from '../hooks/useRoutes'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import { Link } from '@tanstack/react-router'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { DataTable } from '../../../components/ui/DataTable'

export function FinanceFeaturesPage() {
  const { departmentId } = useParams({
    from: '/_authed/admin/departments/$departmentId/finance',
  })

  console.log('🔍 FinanceFeaturesPage rendering, departmentId:', departmentId)

  const departmentsQuery = useDepartments()
  const routesQuery = useRoutes()
  
  console.log('🔍 routesQuery:', { isPending: routesQuery.isPending, isError: routesQuery.isError, isSuccess: routesQuery.isSuccess, dataLength: routesQuery.data?.length })

  const department = departmentsQuery.data?.find(
    (item) => item.id === departmentId,
  )

  if (routesQuery.isPending) {
    return (
      <PageLayout>
        <LoadingState message="Loading finance features..." />
      </PageLayout>
    )
  }

  if (routesQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          title="Unable to load finance features"
          message={routesQuery.error.message}
          onRetry={() => routesQuery.refetch()}
        />
      </PageLayout>
    )
  }

  const routes = routesQuery.data ?? []

  const columns = [
    { key: 'routeName', title: 'Route Name', render: (row: unknown) => (row as RouteInfo).routeName },
    { key: 'routeId', title: 'Route ID', render: (row: unknown) => (row as RouteInfo).routeId },
  ]

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            <Link to="/admin">Departments</Link>
            {' / '}
            <Link
              to="/admin/departments/$departmentId"
              params={{ departmentId }}
            >
              {department?.name ?? 'Finance'}
            </Link>
            {' / '}
            Finance Features
          </>
        }
        title={`${department?.name ?? 'Finance'} Features`}
        description="Manage this department category by category — head panel menu items plus the columns of the Customer List and Department Users tables."
        actions={
          <>
            <Link
              to="/admin"
              className="secondary-button back-link"
            >
              ← Back to Departments
            </Link>

            <ProfileChip />
          </>
        }
      />

      <Card>
        <div className="table-toolbar">
          <div>
            <h2>Head Panel Menu</h2>
            <p>
              Sidebar items of this department. Reorder, enable/disable and set Role A / Role B access.
            </p>
          </div>
        </div>

        <DataTable
          rows={routes}
          columns={columns}
          rowKey={(row) => row.routeId}
          emptyState="No routes found for this department."
        />
      </Card>

      <Card className="mt-6">
        <div className="table-toolbar">
          <div>
            <h2>Customer List — Columns</h2>
            <p>
              Columns shown in the customer table. Switch a column off to hide it from the head panel.
            </p>
          </div>
        </div>
        <p className="text-muted">Configure column permissions in the feature permissions page.</p>
      </Card>

      <Card className="mt-6">
        <div className="table-toolbar">
          <div>
            <h2>Department Users — Columns</h2>
            <p>
              Columns shown in the department users table. Switch a column off to hide it from the head panel.
            </p>
          </div>
        </div>
        <p className="text-muted">Configure column permissions in the feature permissions page.</p>
      </Card>
    </PageLayout>
  )
}