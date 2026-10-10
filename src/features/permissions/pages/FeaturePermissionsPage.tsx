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
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import { Modal } from '../../../components/ui/Modal'
import { useDepartments } from '../../departments/hooks/useDepartments'
import { DynamicRouteColumnsCard } from '../components/DynamicRouteColumnsCard'
import { DynamicRoutesTable } from '../components/DynamicRoutesTable'
import {
  useDynamicColumns,
  useDynamicRoutes,
  useUpdateColumnPermission,
  useUpdateColumnStatus,
  useUpdateRouteStatus,
} from '../hooks/useDynamicPermissions'

function normalize(value?: string): string {
  return (value ?? '').trim().replace(/^\/+|\/+$/g, '').toLowerCase()
}

function belongsToRoute(
  column: DynamicColumnResponse,
  route: DynamicRouteResponse,
): boolean {
  if (column.routeId === route.routeId || column.routesType === route.routeId) {
    return true
  }

  const columnRouteName = normalize(column.routeName)
  return Boolean(columnRouteName && columnRouteName === normalize(route.routeName))
}

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

  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [columnModalRouteId, setColumnModalRouteId] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')

  function openColumnModal(routeId = '') {
    setColumnModalRouteId(routeId)
    setShowColumnModal(true)
  }

  const columnsByRoute = useMemo(() => {
    const result = new Map<string, DynamicColumnResponse[]>()
    for (const route of routesQuery.data ?? []) {
      result.set(
        route.routeId,
        (columnsQuery.data ?? []).filter((column) => belongsToRoute(column, route)),
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
          <Button variant="secondary" onClick={() => setShowRouteModal(true)}>
            + Add Dynamic Route
          </Button>
        </div>

        {routesQuery.isError ? (
          <ErrorState
            title="Unable to load routes"
            message={routesQuery.error.message}
            onRetry={() => routesQuery.refetch()}
          />
        ) : (
          <DynamicRoutesTable
            routes={routesQuery.data ?? []}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(route) => setSelectedRouteId(route.routeId)}
            updatingRouteId={
              updateRouteStatusMutation.isPending
                ? updateRouteStatusMutation.variables?.routeId
                : undefined
            }
            onToggle={handleRouteToggle}
          />
        )}
      </Card>

      <Modal
        open={Boolean(selectedRoute)}
        onClose={() => setSelectedRouteId('')}
        title="Route columns and components"
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
            onToggleColumn={handleColumnToggle}
            onPermissionChange={handleColumnPermissionChange}
          />
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
    </PageLayout>
  )
}
