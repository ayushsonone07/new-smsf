import { useState } from 'react'
import {
  Link,
  useParams,
} from '@tanstack/react-router'
import { useDepartmentFeatures } from '../hooks/useDepartmentFeatures'
import { useUpdateFeaturePermission } from '../hooks/useUpdateFeaturePermission'
import { useFeatureMutations } from '../hooks/useFeatureMutations'
import { useDepartments } from '../../departments/hooks/useDepartments'
import type {
  CreateFeaturePermissionRequest,
  FeaturePermission,
  UpdateFeaturePermissionRequest,
} from '../types/permission.types'
import { FeaturePermissionsTable } from '../../../components/permissions/FeaturePermissionsTable'
import { FeatureFormModal } from '../../../components/permissions/FeatureFormModal'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

export function FeaturePermissionsPage() {
  const { departmentId } = useParams({
    from: '/_authed/admin/departments/$departmentId',
  })

  const departmentsQuery = useDepartments()
  const featuresQuery =
    useDepartmentFeatures(departmentId)
  const updateMutation =
    useUpdateFeaturePermission(departmentId)
  const { create, remove, move } =
    useFeatureMutations(departmentId)

  const [modal, setModal] = useState<
    | { kind: 'none' }
    | { kind: 'create' }
    | { kind: 'edit'; feature: FeaturePermission }
    | { kind: 'delete'; feature: FeaturePermission }
  >({ kind: 'none' })

  const closeModal = () => setModal({ kind: 'none' })

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
            <h2>Head panel menu</h2>

            <p>
              Each row is a sidebar item in this
              department&apos;s head panel. Reorder,
              enable/disable, set Role A / Role B
              access, or add new pages.
            </p>
          </div>

          <Button onClick={() => setModal({ kind: 'create' })}>
            + Add feature
          </Button>
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
          onEdit={(feature) => setModal({ kind: 'edit', feature })}
          onDelete={(feature) => setModal({ kind: 'delete', feature })}
          onMove={(feature, direction) =>
            move.mutate({ id: feature.id, direction })
          }
        />
      </Card>

      <FeatureFormModal
        open={modal.kind === 'create'}
        mode="create"
        onClose={closeModal}
        isSubmitting={create.isPending}
        error={create.error?.message}
        onSubmit={(values: CreateFeaturePermissionRequest) =>
          create.mutate(values, { onSuccess: closeModal })
        }
      />

      {modal.kind === 'edit' ? (
        <FeatureFormModal
          open
          mode="edit"
          initialValues={modal.feature}
          onClose={closeModal}
          isSubmitting={updateMutation.isPending}
          error={updateMutation.error?.message}
          onSubmit={(values) =>
            updateMutation.mutate(
              { id: modal.feature.id, data: values },
              { onSuccess: closeModal },
            )
          }
        />
      ) : null}

      {modal.kind === 'delete' ? (
        <ConfirmDialog
          open
          title="Remove this menu item?"
          message={`"${modal.feature.name}" will disappear from the head panel sidebar.`}
          confirmLabel="Remove"
          isLoading={remove.isPending}
          error={remove.error?.message}
          onClose={closeModal}
          onConfirm={() =>
            remove.mutate(modal.feature.id, { onSuccess: closeModal })
          }
        />
      ) : null}
    </PageLayout>
  )
}
