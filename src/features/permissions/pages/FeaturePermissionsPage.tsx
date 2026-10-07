import {
  Link,
  useParams,
} from '@tanstack/react-router'
import { FeaturePermissionsTable } from '../components/FeaturePermissionsTable'
import { useDepartmentFeatures } from '../hooks/useDepartmentFeatures'
import { useUpdateFeaturePermission } from '../hooks/useUpdateFeaturePermission'
import { useDepartments } from '../../departments/hooks/useDepartments'
import type { UpdateFeaturePermissionRequest } from '../types/permission.types'

export function FeaturePermissionsPage() {
  const { departmentId } = useParams({
    from: '/_authed/admin/departments/$departmentId',
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
      <main className="page-content">
        <div className="loading-state">
          Loading features...
        </div>
      </main>
    )
  }

  if (featuresQuery.isError) {
    return (
      <main className="page-content">
        <div className="error-state">
          <strong>
            Unable to load features
          </strong>

          <p>{featuresQuery.error.message}</p>

          <button
            className="primary-button"
            onClick={() => featuresQuery.refetch()}
          >
            Try Again
          </button>
        </div>
      </main>
    )
  }

  const features = featuresQuery.data

  return (
    <main className="page-content">
      <header className="topbar">
        <div>
          <p className="breadcrumb">
            <Link to="/admin">
              Administration
            </Link>
            {' / '}
            <Link to="/admin">
              Departments
            </Link>
            {' / '}
            {department?.name ?? 'Features'}
          </p>

          <h1>
            {department?.name ?? 'Department'}{' '}
            Features
          </h1>

          <p className="page-description">
            Enable or disable features and set
            role permissions for this department.
          </p>
        </div>

        <div className="topbar-actions">
          <Link
            to="/admin"
            className="secondary-button back-link"
          >
            ← Back to Departments
          </Link>

          <div className="profile-chip">
            <div className="admin-avatar small">
              A
            </div>

            <div>
              <strong>Admin</strong>
              <span>Super Admin</span>
            </div>
          </div>
        </div>
      </header>

      <section className="content-card">
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
      </section>
    </main>
  )
}
