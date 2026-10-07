import { useParams } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useDepartmentServices } from '../hooks/useDepartmentServices'
import { Services } from '../../../components/services/Services'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

export function DepartmentServicesPage() {
  const { departmentId } = useParams({
    from: '/departments/$departmentId/services',
  })

  const departmentsQuery = useDepartments()
  const servicesQuery =
    useDepartmentServices(departmentId)

  const department = departmentsQuery.data?.find(
    (item) => item.id === departmentId,
  )

  if (servicesQuery.isPending) {
    return (
      <PageLayout>
        <LoadingState message="Loading services..." />
      </PageLayout>
    )
  }

  if (servicesQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          title="Unable to load services"
          message={servicesQuery.error.message}
          onRetry={() => servicesQuery.refetch()}
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
            {department?.name ?? 'Services'}
          </>
        }
        title={`${department?.name ?? 'Department'} Services`}
        description="Services offered by this department."
      />

      <Card>
        <div className="table-toolbar">
          <div>
            <h2>Services</h2>

            <p>
              Browse services offered by
              this department.
            </p>
          </div>
        </div>

        <Services services={servicesQuery.data} />
      </Card>
    </PageLayout>
  )
}
