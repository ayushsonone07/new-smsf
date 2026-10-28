import { useParams } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useHelpArticles } from '../hooks/useHelpArticles'
import { HelpCenter } from '../../../components/help-center/HelpCenter'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import { RefreshButton } from '../../../components/ui/RefreshButton'

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

  const isRefreshing = articlesQuery.isFetching

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

          <RefreshButton
            onRefresh={() => articlesQuery.refetch()}
            isRefreshing={articlesQuery.isFetching}
            label="help articles"
          />
        </div>

        <div
          className={`transition-opacity ${isRefreshing ? 'pointer-events-none opacity-60' : ''}`}
          aria-busy={isRefreshing}
        >
          <HelpCenter articles={articlesQuery.data} />
        </div>
      </Card>
    </PageLayout>
  )
}
