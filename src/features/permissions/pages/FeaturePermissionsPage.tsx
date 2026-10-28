import { useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import type {
  DynamicColumnResponse,
  DynamicRouteResponse,
} from '../../../api/dynamic-permission.api'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { CreateColumnModal } from '../../../components/permissions/CreateColumnModal'
import { CreateRouteModal } from '../../../components/permissions/CreateRouteModal'
import { EditRouteModal } from '../../../components/permissions/EditRouteModal'
import { EditColumnModal } from '../../../components/permissions/EditColumnModal'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import { Modal } from '../../../components/ui/Modal'
import { RefreshButton } from '../../../components/ui/RefreshButton'
import { useDepartments } from '../../departments/hooks/useDepartments'
import { DynamicRouteColumnsCard } from '../components/DynamicRouteColumnsCard'
import { DynamicRoutesTable } from '../components/DynamicRoutesTable'
import {
  useDynamicColumns,
  useDynamicRoutes,
  useUpdateColumnPermission,
  useUpdateColumnStatus,
  useUpdateRouteStatus,
  useDeleteDynamicRoute,
  useDeleteDynamicColumn,
} from '../hooks/useDynamicPermissions'
import { isColumnBelongingToRoute } from '../hooks/useDepartmentRoutePermissions'

export function FeaturePermissionsPage() {
  const { departmentId } = useParams({
    from: '/_authed/admin/departments/$departmentId',
  })
  const departmentsQuery = useDepartments()
  const department = departmentsQuery.data?.find((item) => item.id === departmentId)
  const departmentType = department?.type

  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)
  const updateRouteStatusMutation = useUpdateRouteStatus()
  const updateColumnStatusMutation = useUpdateColumnStatus()
  const updateColumnPermissionMutation = useUpdateColumnPermission()
  const deleteRouteMutation = useDeleteDynamicRoute()
  const deleteColumnMutation = useDeleteDynamicColumn()

  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [columnModalRouteId, setColumnModalRouteId] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')

  const [editingRoute, setEditingRoute] = useState<DynamicRouteResponse | null>(null)
  const [deletingRoute, setDeletingRoute] = useState<DynamicRouteResponse | null>(null)
  const [deleteRouteError, setDeleteRouteError] = useState('')
  const [editingColumn, setEditingColumn] = useState<DynamicColumnResponse | null>(null)
  const [deletingColumn, setDeletingColumn] = useState<DynamicColumnResponse | null>(null)
  const [deleteColumnError, setDeleteColumnError] = useState('')

  // Background refetches (refresh buttons) keep data on screen; dim it meanwhile.
  const routesRefreshing = routesQuery.isFetching && !routesQuery.isPending
  const columnsRefreshing = columnsQuery.isFetching && !columnsQuery.isPending

  function openColumnModal(routeId = '') {
    setColumnModalRouteId(routeId)
    setShowColumnModal(true)
  }

  const columnsByRoute = useMemo(() => {
    const result = new Map<string, DynamicColumnResponse[]>()
    for (const route of routesQuery.data ?? []) {
      result.set(
        route.routeId,
        (columnsQuery.data ?? []).filter((column) => isColumnBelongingToRoute(column, route)),
      )
    }
    return result
  }, [columnsQuery.data, routesQuery.data])

  const selectedRoute = (routesQuery.data ?? []).find(
    (route) => route.routeId === selectedRouteId,
  )

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

  function handleColumnToggle(
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    enable: boolean,
  ) {
    if (!departmentType) return
    updateColumnStatusMutation.mutate({
      columnId: column.columnId,
      columnName: column.columnName,
      roleName,
      departmentType,
      enable,
    })
  }

  function handleColumnPermissionChange(
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    readWriteAccess: '1' | '12',
  ) {
    if (!departmentType) return
    updateColumnPermissionMutation.mutate({
      columnId: column.columnId,
      columnName: column.columnName,
      roleName,
      departmentType,
      readWriteAccess,
    })
  }

  const isLoading =
    departmentsQuery.isPending ||
    routesQuery.isPending ||
    columnsQuery.isPending ||
    !departmentType

  if (isLoading) {
    return (
      <PageLayout>
        <LoadingState message="Loading department routes and columns..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            <Link to="/admin">Departments</Link>
            {' / '}
            {department?.name ?? 'Features'}
          </>
        }
        title={`${department?.name ?? 'Department'} Features`}
        description="Manage this department's sidebar routes and the columns or components linked to every route."
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowRouteModal(true)}>
              + Add Dynamic Route
            </Button>
            <Button variant="secondary" onClick={() => openColumnModal()}>
              + Add Dynamic Column
            </Button>
            <Link to="/admin" className="secondary-button back-link">
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
            <p>Routes available for this department's Head and User sidebars.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshButton
              onRefresh={() => routesQuery.refetch()}
              isRefreshing={routesQuery.isFetching}
              label="routes"
            />
            <Button variant="secondary" onClick={() => setShowRouteModal(true)}>
              + Add Dynamic Route
            </Button>
          </div>
        </div>

        {routesQuery.isError ? (
          <ErrorState
            title="Unable to load routes"
            message={routesQuery.error.message}
            onRetry={() => routesQuery.refetch()}
          />
        ) : (
          <div
            className={`transition-opacity ${routesRefreshing ? 'pointer-events-none opacity-60' : ''}`}
            aria-busy={routesRefreshing}
          >
          <DynamicRoutesTable
            routes={routesQuery.data ?? []}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(route) => setSelectedRouteId(route.routeId)}
            onEditRoute={(route) => setEditingRoute(route)}
            onDeleteRoute={(route) => {
              setDeleteRouteError('')
              setDeletingRoute(route)
            }}
            updatingRouteId={
              updateRouteStatusMutation.isPending
                ? updateRouteStatusMutation.variables?.routeId
                : undefined
            }
            onToggle={handleRouteToggle}
          />
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(selectedRoute)}
        onClose={() => setSelectedRouteId('')}
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
            Route columns and components
            <RefreshButton
              onRefresh={() => columnsQuery.refetch()}
              isRefreshing={columnsQuery.isFetching}
              label="columns"
            />
          </span>
        }
        description={selectedRoute?.routeName}
        size="xl"
      >
        {columnsQuery.isError ? (
          <ErrorState
            title="Unable to load columns"
            message={columnsQuery.error.message}
            onRetry={() => columnsQuery.refetch()}
          />
        ) : selectedRoute ? (
          <div
            className={`transition-opacity ${columnsRefreshing ? 'pointer-events-none opacity-60' : ''}`}
            aria-busy={columnsRefreshing}
          >
          <DynamicRouteColumnsCard
            route={selectedRoute}
            columns={columnsByRoute.get(selectedRoute.routeId) ?? []}
            updatingColumnId={
              updateColumnStatusMutation.isPending
                ? updateColumnStatusMutation.variables?.columnId
                : undefined
            }
            updatingPermissionColumnId={
              updateColumnPermissionMutation.isPending
                ? updateColumnPermissionMutation.variables?.columnId
                : undefined
            }
            onAddColumn={() => {
              const routeId = selectedRoute.routeId
              setSelectedRouteId('')
              openColumnModal(routeId)
            }}
            onEditColumn={(col) => setEditingColumn(col)}
            onDeleteColumn={(col) => {
              setDeleteColumnError('')
              setDeletingColumn(col)
            }}
            onToggleColumn={handleColumnToggle}
            onPermissionChange={handleColumnPermissionChange}
          />
          </div>
        ) : null}
      </Modal>

      <CreateRouteModal
        key={`route-${department?.id}`}
        open={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        initialDepartmentType={departmentType}
      />
      <CreateColumnModal
        key={`column-${department?.id}-${columnModalRouteId}`}
        open={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        initialDepartmentType={departmentType}
        initialRouteId={columnModalRouteId}
      />

      <EditRouteModal
        open={Boolean(editingRoute)}
        onClose={() => setEditingRoute(null)}
        route={editingRoute}
        departmentType={departmentType}
      />

      <EditColumnModal
        open={Boolean(editingColumn)}
        onClose={() => setEditingColumn(null)}
        column={editingColumn}
        departmentType={departmentType}
        routes={routesQuery.data ?? []}
      />

      <ConfirmDialog
        open={Boolean(deletingRoute)}
        onClose={() => {
          setDeletingRoute(null)
          setDeleteRouteError('')
        }}
        onConfirm={async () => {
          if (!deletingRoute) return
          try {
            setDeleteRouteError('')
            await deleteRouteMutation.mutateAsync(deletingRoute.routeId)
            if (selectedRouteId === deletingRoute.routeId) {
              setSelectedRouteId('')
            }
            setDeletingRoute(null)
          } catch (err) {
            setDeleteRouteError(
              err instanceof Error ? err.message : 'Failed to delete route',
            )
          }
        }}
        title="Delete Route"
        confirmDisabled={Boolean(deletingRoute && (columnsByRoute.get(deletingRoute.routeId)?.length ?? 0) > 0)}
        message={
          deletingRoute ? (
            <div>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Are you sure you want to delete route <strong>"{deletingRoute.routeName}"</strong>?
              </p>
              {(columnsByRoute.get(deletingRoute.routeId)?.length ?? 0) > 0 ? (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    color: '#9a3412',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    marginTop: '0.75rem',
                    lineHeight: '1.45',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#c2410c',
                    }}
                  >
                    ⚠️ You cannot delete this route
                  </div>
                  This route still has <strong>{columnsByRoute.get(deletingRoute.routeId)?.length} column(s)</strong> attached to it:{' '}
                  <span style={{ fontWeight: 600, color: '#9a3412' }}>
                    [{(columnsByRoute.get(deletingRoute.routeId) ?? []).map((c) => c.columnName).join(', ')}]
                  </span>.
                  <div style={{ marginTop: '0.4rem', color: '#7c2d12', fontWeight: 500 }}>
                    First you have to delete or remove the columns before this route can be deleted.
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>
                  This will remove the route from navigation and permissions.
                </span>
              )}
            </div>
          ) : ''
        }
        confirmLabel={
          (deletingRoute && (columnsByRoute.get(deletingRoute.routeId)?.length ?? 0) > 0)
            ? 'Delete Columns First'
            : 'Delete Route'
        }
        confirmLoadingLabel="Deleting..."
        isLoading={deleteRouteMutation.isPending}
        error={deleteRouteError}
      />

      <ConfirmDialog
        open={Boolean(deletingColumn)}
        onClose={() => {
          setDeletingColumn(null)
          setDeleteColumnError('')
        }}
        onConfirm={async () => {
          if (!deletingColumn) return
          try {
            setDeleteColumnError('')
            await deleteColumnMutation.mutateAsync(deletingColumn.columnId)
            setDeletingColumn(null)
          } catch (err) {
            setDeleteColumnError(
              err instanceof Error ? err.message : 'Failed to delete column',
            )
          }
        }}
        title="Delete Column"
        message={
          deletingColumn ? (
            <>
              Are you sure you want to delete column <strong>"{deletingColumn.columnName}"</strong>?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', display: 'block' }}>
                This will permanently delete this column and its permission mappings.
              </span>
            </>
          ) : ''
        }
        confirmLabel="Delete Column"
        confirmLoadingLabel="Deleting..."
        isLoading={deleteColumnMutation.isPending}
        error={deleteColumnError}
      />
    </PageLayout>
  )
}
