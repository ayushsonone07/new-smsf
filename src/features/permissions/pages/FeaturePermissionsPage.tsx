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
import { DynamicRoutesTable } from '../components/DynamicRoutesTable'
import { ColumnFeaturesTable } from '../../../components/permissions/ColumnFeaturesTable'
import { FeatureFormModal } from '../../../components/permissions/FeatureFormModal'
import { FEATURE_CATEGORIES } from '../config/featureCategories'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import { CreateRouteModal } from '../../../components/permissions/CreateRouteModal'
import { CreateColumnModal } from '../../../components/permissions/CreateColumnModal'
import { MyAccessPanel } from '../../../components/permissions/MyAccessPanel'
import { AllDepartmentsPanel } from '../../../components/permissions/AllDepartmentsPanel'
import {
  useDynamicRoutes,
  useUpdateRouteStatus,
} from '../hooks/useDynamicPermissions'
import type { DynamicRouteResponse } from '../../../api/dynamic-permission.api'

export function FeaturePermissionsPage() {
  const { departmentId } = useParams({
    from: '/_authed/admin/departments/$departmentId',
  })

  const departmentsQuery = useDepartments()
  const featuresQuery =
    useDepartmentFeatures(departmentId)
  const updateMutation =
    useUpdateFeaturePermission(departmentId)
  const { create, remove } =
    useFeatureMutations(departmentId)

  const [modal, setModal] = useState<
    | { kind: 'none' }
    | { kind: 'create' }
    | { kind: 'edit'; feature: FeaturePermission }
    | { kind: 'delete'; feature: FeaturePermission }
  >({ kind: 'none' })
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showColumnModal, setShowColumnModal] = useState(false)

  const closeModal = () => setModal({ kind: 'none' })

  const department = departmentsQuery.data?.find(
    (item) => item.id === departmentId,
  )
  const departmentType = department?.type
  const routesQuery = useDynamicRoutes(departmentType)
  const updateRouteStatusMutation = useUpdateRouteStatus()

  function handleRouteToggle(
    route: DynamicRouteResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    enable: boolean,
  ) {
    if (!departmentType) return

    updateRouteStatusMutation.mutate({
      routeId: route.routeId,
      routeName: route.routeName,
      roleName,
      departmentType,
      enable,
    })
  }

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

  const grouped = FEATURE_CATEGORIES.map((meta) => ({
    meta,
    items: features.filter(
      (feature) => feature.category === meta.key,
    ),
  }))

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
        description="Manage this department category by category — head panel menu items plus the columns of the Customer List and Department Users tables."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowRouteModal(true)}
            >
              ＋ Add Dynamic Route
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowColumnModal(true)}
            >
              ＋ Add Dynamic Column
            </Button>

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

      {updateMutation.isError && (
        <p className="form-error">
          {updateMutation.error.message}
        </p>
      )}

      {grouped.map(({ meta, items }) => (
        <Card key={meta.key}>
          <div className="table-toolbar">
            <div>
              <h2>{meta.label}</h2>

              <p>{meta.description}</p>
            </div>

            {meta.key === 'screens' ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  onClick={() => setShowRouteModal(true)}
                >
                  ＋ Add Dynamic Route
                </Button>
                <Button
                  onClick={() => setModal({ kind: 'create' })}
                >
                  + Add feature
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setShowColumnModal(true)}
              >
                ＋ Add Dynamic Column
              </Button>
            )}
          </div>

          {meta.key === 'screens' ? (
            routesQuery.isPending || !departmentType ? (
              <LoadingState message="Loading department routes..." />
            ) : routesQuery.isError ? (
              <ErrorState
                title="Unable to load routes"
                message={routesQuery.error.message}
                onRetry={() => routesQuery.refetch()}
              />
            ) : (
              <DynamicRoutesTable
                routes={routesQuery.data ?? []}
                updatingRouteId={
                  updateRouteStatusMutation.isPending
                    ? updateRouteStatusMutation.variables?.routeId
                    : undefined
                }
                onToggle={handleRouteToggle}
              />
            )
          ) : (
            <ColumnFeaturesTable
              features={items}
              updatingFeatureId={
                updateMutation.isPending
                  ? updateMutation.variables?.id
                  : undefined
              }
              onUpdate={handleUpdate}
            />
          )}
        </Card>
      ))}

      <Card>
        <div className="table-toolbar">
          <div>
            <h2>Show all (R/C) — My Access</h2>

            <p>
              Routes and columns visible to your own role,
              read live from the backend session APIs
              (SUPERADMIN sees everything). Switch tabs to
              see each list separately.
            </p>
          </div>
        </div>

        <MyAccessPanel />
      </Card>

      <Card>
        <div className="table-toolbar">
          <div>
            <h2>Show all Department</h2>

            <p>
              Every department user from the backend admin API,
              with head/member tabs and pagination.
            </p>
          </div>
        </div>

        <AllDepartmentsPanel />
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

      <CreateRouteModal
        key={department?.id}
        open={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        initialDepartmentType={department?.type}
      />

      <CreateColumnModal
        open={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        initialDepartmentType={department?.username || department?.name}
      />
    </PageLayout>
  )
}
