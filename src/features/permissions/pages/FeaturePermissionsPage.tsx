import {
  Link,
  useParams,
} from '@tanstack/react-router'
import { useDepartmentFeatures } from '../hooks/useDepartmentFeatures'
import { useUpdateFeaturePermission } from '../hooks/useUpdateFeaturePermission'
import { useDepartments } from '../../departments/hooks/useDepartments'
import type { UpdateFeaturePermissionRequest } from '../types/permission.types'
import { FeaturePermissionsTable } from '../../../components/permissions/FeaturePermissionsTable'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

export function FeaturePermissionsPage() {
  const { departmentId } = useParams({
    from: '/admin/departments/$departmentId',
  })

  const departmentsQuery = useDepartments()
  const featuresQuery =
    useDepartmentFeatures(departmentId)
  const updateMutation =
    useUpdateFeaturePermission(departmentId)

  const department = departmentsQuery.data?.find(
    (item) => item.id === departmentId,
  )

  function handleUpdate(
    id: string,
    data: UpdateFeaturePermissionRequest,
  ) {
    updateMutation.mutate({ id, data })
  }

  if (featuresQuery.isPending) {
    return (
      <PageLayout>
        <LoadingState message="Loading features..." />
      </PageLayout>
    )
  }

  if (featuresQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          title="Unable to load features"
          message={featuresQuery.error.message}
          onRetry={() => featuresQuery.refetch()}
        />
      </PageLayout>
    )
  }

  const features = featuresQuery.data

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">
              Administration
            </Link>
            {' / '}
            <Link to="/admin">
              Departments
            </Link>
            {' / '}
            {department?.name ?? 'Features'}
          </>
        }
        title={`${department?.name ?? 'Department'} Features`}
        description="Enable or disable features and set role permissions for this department."
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
            <h2>Feature Access</h2>

            <p>
              Three controls per row: enable or
              disable the feature, then pick a
              permission for Role A and Role B.
            </p>
          </div>
        </div>

        {updateMutation.isError && (
          <p className="form-error">
            {updateMutation.error.message}
          </p>
        )}

        <FeaturePermissionsTable
          features={features}
          updatingFeatureId={
            updateMutation.isPending
              ? updateMutation.variables?.id
              : undefined
          }
          onUpdate={handleUpdate}
        />
      </Card>
    </PageLayout>
  )
}
