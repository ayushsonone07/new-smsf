import { useParams } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useHelpArticles } from '../hooks/useHelpArticles'
import { HelpCenter } from '../../../components/help-center/HelpCenter'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

export function DepartmentHelpCenterPage() {
  const { departmentId } = useParams({
    from: '/departments/$departmentId/help-center',
  })

  const departmentsQuery = useDepartments()
  const articlesQuery =
    useHelpArticles(departmentId)

  const department = departmentsQuery.data?.find(
    (item) => item.id === departmentId,
  )

  if (articlesQuery.isPending) {
    return (
      <PageLayout>
        <LoadingState message="Loading help center..." />
      </PageLayout>
    )
  }

  if (articlesQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          title="Unable to load help center"
          message={articlesQuery.error.message}
          onRetry={() => articlesQuery.refetch()}
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
            {department?.name ?? 'Help Center'}
          </>
        }
        title={`${department?.name ?? 'Department'} Help Center`}
        description="Guides and articles for this department."
      />

      <Card>
        <div className="table-toolbar">
          <div>
            <h2>Help Articles</h2>

            <p>
              Search and browse guides for
              this department.
            </p>
          </div>
        </div>

        <HelpCenter articles={articlesQuery.data} />
      </Card>
    </PageLayout>
  )
}
