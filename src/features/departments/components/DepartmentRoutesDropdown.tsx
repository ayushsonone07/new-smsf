import { useMemo, useState } from 'react'
import type {
  DynamicColumnResponse,
  DynamicRouteResponse,
} from '../../../api/dynamic-permission.api'
import { Pencil, Trash2 } from 'lucide-react'
import { PermissionToggle } from '../../../components/permissions/PermissionToggle'
import { CreateColumnModal } from '../../../components/permissions/CreateColumnModal'
import { CreateRouteModal } from '../../../components/permissions/CreateRouteModal'
import { EditRouteModal } from '../../../components/permissions/EditRouteModal'
import { EditColumnModal } from '../../../components/permissions/EditColumnModal'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Select } from '../../../components/ui/Select'
import {
  useDynamicColumns,
  useDynamicRoutes,
  useUpdateColumnPermission,
  useUpdateColumnStatus,
  useUpdateRouteStatus,
  useDeleteDynamicRoute,
  useDeleteDynamicColumn,
} from '../../permissions/hooks/useDynamicPermissions'
import {
  applyDynamicColumnOrder,
  readDynamicColumnOrder,
  saveDynamicColumnOrder,
} from '../../../utils/dynamicColumnOrder'

interface DepartmentRoutesDropdownProps {
  departmentType: string
}

function normalizeRouteName(value?: string): string {
  return (value ?? '').trim().replace(/^\/+|\/+$/g, '').toLowerCase()
}

function belongsToRoute(
  column: DynamicColumnResponse,
  route: DynamicRouteResponse,
): boolean {
  if (column.routeId === route.routeId || column.routesType === route.routeId) {
    return true
  }

  const columnRouteName = normalizeRouteName(column.routeName)
  return Boolean(columnRouteName && columnRouteName === normalizeRouteName(route.routeName))
}

function getAccessLabel(permission?: string): 'Read + Write' | 'Read Only' {
  return permission === '12' ||
    permission === '2' ||
    permission === 'CAN_EDIT'
    ? 'Read + Write'
    : 'Read Only'
}

function getAccessValue(permission?: string): '1' | '12' {
  return getAccessLabel(permission) === 'Read + Write' ? '12' : '1'
}

export function DepartmentRoutesDropdown({
  departmentType,
}: DepartmentRoutesDropdownProps) {
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [editingRoute, setEditingRoute] = useState<DynamicRouteResponse | null>(null)
  const [deletingRoute, setDeletingRoute] = useState<DynamicRouteResponse | null>(null)
  const [deleteRouteError, setDeleteRouteError] = useState('')
  const [editingColumn, setEditingColumn] = useState<DynamicColumnResponse | null>(null)
  const [deletingColumn, setDeletingColumn] = useState<DynamicColumnResponse | null>(null)
  const [deleteColumnError, setDeleteColumnError] = useState('')
  const [routeUpdateError, setRouteUpdateError] = useState('')
  const [orderRevision, setOrderRevision] = useState(0)
  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)
  const updateColumnStatusMutation = useUpdateColumnStatus()
  const updateColumnPermissionMutation = useUpdateColumnPermission()
  const updateRouteStatusMutation = useUpdateRouteStatus()
  const deleteRouteMutation = useDeleteDynamicRoute()
  const deleteColumnMutation = useDeleteDynamicColumn()
  const routes = routesQuery.data ?? []
  const selectedRoute = routes.find((route) => route.routeId === selectedRouteId)

  const routeColumns = useMemo(
    () =>
      selectedRoute
        ? applyDynamicColumnOrder(
            (columnsQuery.data ?? []).filter((column) => belongsToRoute(column, selectedRoute)),
            readDynamicColumnOrder(departmentType, selectedRoute.routeId),
          )
        : [],
    [columnsQuery.data, selectedRoute, departmentType, orderRevision],
  )

  const linkedColumnsForDeletingRoute = useMemo(() => {
    if (!deletingRoute || !columnsQuery.data) return []
    return (columnsQuery.data ?? []).filter((column) => belongsToRoute(column, deletingRoute))
  }, [deletingRoute, columnsQuery.data])

  function moveColumn(columnId: string, direction: -1 | 1) {
    if (!selectedRoute) return
    const currentIndex = routeColumns.findIndex((column) => column.columnId === columnId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= routeColumns.length) return
    const next = routeColumns.map((column) => column.columnId)
    ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
    saveDynamicColumnOrder(departmentType, selectedRoute.routeId, next)
    setOrderRevision((revision) => revision + 1)
  }

  function updateColumnEnabled(
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    enable: boolean,
  ) {
    if (!selectedRoute) return
    const parentRouteEnabled = roleName === 'DEPARTMENT_HEAD'
      ? selectedRoute.enableHead === true
      : selectedRoute.enableUser === true
    if (enable && !parentRouteEnabled) return

    updateColumnStatusMutation.mutate({
      columnId: column.columnId,
      columnName: column.columnName,
      roleName,
      departmentType,
      enable,
    })
  }

  function updateRouteEnabled(
    route: DynamicRouteResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    enable: boolean,
  ) {
    setRouteUpdateError('')
    void (async () => {
      try {
        await updateRouteStatusMutation.mutateAsync({
          routeId: route.routeId,
          routeName: route.routeName,
          roleName,
          departmentType,
          enable,
        })

        if (!enable) {
          const roleColumns = (columnsQuery.data ?? []).filter(
            (column) =>
              belongsToRoute(column, route) &&
              (roleName === 'DEPARTMENT_HEAD'
                ? column.enableHead === true
                : column.enableUser === true),
          )
          const results = await Promise.allSettled(
            roleColumns.map((column) =>
              updateColumnStatusMutation.mutateAsync({
                columnId: column.columnId,
                columnName: column.columnName,
                roleName,
                departmentType,
                enable: false,
              }),
            ),
          )
          const failedUpdates = results.filter((result) => result.status === 'rejected')
          if (failedUpdates.length > 0) {
            throw new Error(
              `Route was disabled, but ${failedUpdates.length} linked column permission(s) could not be disabled.`,
            )
          }
        }
      } catch (error) {
        setRouteUpdateError(
          error instanceof Error
            ? error.message
            : 'Could not update route and linked column permissions.',
        )
      }
    })()
  }

  function updateColumnAccess(
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    readWriteAccess: '1' | '12',
  ) {
    if (!selectedRoute) return
    const parentRouteEnabled = roleName === 'DEPARTMENT_HEAD'
      ? selectedRoute.enableHead === true
      : selectedRoute.enableUser === true
    if (!parentRouteEnabled) return

    updateColumnPermissionMutation.mutate({
      columnId: column.columnId,
      columnName: column.columnName,
      roleName,
      departmentType,
      readWriteAccess,
    })
  }

  const updateErrorMessage =
    routeUpdateError ||
    updateRouteStatusMutation.error?.message ||
    updateColumnStatusMutation.error?.message ||
    updateColumnPermissionMutation.error?.message

  return (
    <div className="department-route-dropdown">
      <div className="department-route-dropdown-heading">
        <div>
          <strong>Department routes</strong>
          <span>Select a route to see its columns.</span>
        </div>
        <div className="department-route-dropdown-actions">
          <Button variant="secondary" onClick={() => setShowRouteModal(true)}>
            <span aria-hidden="true">＋</span> Add Dynamic Route
          </Button>
          <Button variant="secondary" onClick={() => setShowColumnModal(true)}>
            <span aria-hidden="true">＋</span> Add Dynamic Column
          </Button>
          {!routesQuery.isPending ? (
            <span className="department-route-count">{routes.length} routes</span>
          ) : null}
        </div>
      </div>

      {updateErrorMessage ? (
        <p className="department-route-state is-error" role="alert">
          Could not update permissions: {updateErrorMessage}
        </p>
      ) : null}

      {routesQuery.isPending ? (
        <p className="department-route-state">Loading routes…</p>
      ) : routesQuery.isError ? (
        <p className="department-route-state is-error">
          Could not load routes: {routesQuery.error.message}
        </p>
      ) : routes.length === 0 ? (
        <p className="department-route-state">No routes are configured for this department.</p>
      ) : (
        <div className="department-route-list">
          {routes.map((route) => (
            <div
              key={route.routeId}
              className={`department-route-option${selectedRouteId === route.routeId ? ' is-selected' : ''}`}
            >
              <button
                type="button"
                className="department-route-select"
                aria-pressed={selectedRouteId === route.routeId}
                onClick={() => setSelectedRouteId(route.routeId)}
              >
                <span className="department-route-option-icon" aria-hidden="true">↳</span>
                <span className="department-route-option-name">{route.routeName}</span>
                <span className="department-route-option-arrow" aria-hidden="true">›</span>
              </button>
              <div className="department-route-role-toggles">
                <div className="department-route-role-toggle">
                  <span>Head</span>
                  <PermissionToggle
                    checked={route.enableHead === true}
                    disabled={
                      updateRouteStatusMutation.isPending ||
                      updateColumnStatusMutation.isPending ||
                      columnsQuery.isPending ||
                      columnsQuery.isError
                    }
                    label={`Enable ${route.routeName} for department head`}
                    onChange={(enabled) =>
                      updateRouteEnabled(route, 'DEPARTMENT_HEAD', enabled)
                    }
                  />
                </div>
                <div className="department-route-role-toggle">
                  <span>User</span>
                  <PermissionToggle
                    checked={route.enableUser === true}
                    disabled={
                      updateRouteStatusMutation.isPending ||
                      updateColumnStatusMutation.isPending ||
                      columnsQuery.isPending ||
                      columnsQuery.isError
                    }
                    label={`Enable ${route.routeName} for department user`}
                    onChange={(enabled) =>
                      updateRouteEnabled(route, 'DEPARTMENT_USER', enabled)
                    }
                  />
                </div>
              </div>

              <div className="department-item-actions">
                <button
                  type="button"
                  className="department-icon-action-btn is-edit"
                  title={`Edit route ${route.routeName}`}
                  aria-label={`Edit route ${route.routeName}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingRoute(route)
                  }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="department-icon-action-btn is-delete"
                  title={`Delete route ${route.routeName}`}
                  aria-label={`Delete route ${route.routeName}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteRouteError('')
                    setDeletingRoute(route)
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRoute ? (
        <section className="department-route-columns" aria-live="polite">
          <div className="department-route-columns-heading">
            <div>
              <span>Columns for</span>
              <strong>{selectedRoute.routeName}</strong>
            </div>
            {!columnsQuery.isPending && !columnsQuery.isError ? (
              <span className="department-route-count">{routeColumns.length} columns</span>
            ) : null}
          </div>

          {columnsQuery.isPending ? (
            <p className="department-route-state">Loading columns…</p>
          ) : columnsQuery.isError ? (
            <p className="department-route-state is-error">
              Could not load columns: {columnsQuery.error.message}
            </p>
          ) : routeColumns.length === 0 ? (
            <p className="department-route-state">No columns are linked to this route.</p>
          ) : (
            <ul className="department-column-list">
              {routeColumns.map((column, index) => (
                <li key={column.columnId} className="department-column-item">
                  <div className="department-column-identity">
                    <span className="department-column-icon" aria-hidden="true">▤</span>
                    <div>
                      <strong>{column.columnName}</strong>
                      <span>{column.columnId}</span>
                    </div>
                  </div>

                  <div className="department-column-order" aria-label={`Reorder ${column.columnName}`}>
                    <button
                      type="button"
                      disabled={index === 0}
                      title="Move column up"
                      aria-label={`Move ${column.columnName} up`}
                      onClick={() => moveColumn(column.columnId, -1)}
                    >
                      ↑
                    </button>
                    <span>{index + 1}</span>
                    <button
                      type="button"
                      disabled={index === routeColumns.length - 1}
                      title="Move column down"
                      aria-label={`Move ${column.columnName} down`}
                      onClick={() => moveColumn(column.columnId, 1)}
                    >
                      ↓
                    </button>
                  </div>

                  <div className="department-column-permissions">
                    <div className="department-column-permission">
                      <div className="department-permission-control">
                        <span className="department-permission-role">Head</span>
                        <PermissionToggle
                          checked={column.enableHead === true}
                          disabled={
                            selectedRoute.enableHead !== true ||
                            updateColumnStatusMutation.isPending
                          }
                          label={`Enable ${column.columnName} for department head`}
                          onChange={(enabled) =>
                            updateColumnEnabled(column, 'DEPARTMENT_HEAD', enabled)
                          }
                        />
                      </div>
                      <Select
                        className="department-permission-select"
                        aria-label={`${column.columnName} head access`}
                        value={getAccessValue(column.roleAPermission)}
                        disabled={
                          selectedRoute.enableHead !== true ||
                          column.enableHead !== true ||
                          updateColumnPermissionMutation.isPending
                        }
                        onChange={(event) =>
                          updateColumnAccess(
                            column,
                            'DEPARTMENT_HEAD',
                            event.target.value as '1' | '12',
                          )
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </div>

                    <div className="department-column-permission">
                      <div className="department-permission-control">
                        <span className="department-permission-role">User</span>
                        <PermissionToggle
                          checked={column.enableUser === true}
                          disabled={
                            selectedRoute.enableUser !== true ||
                            updateColumnStatusMutation.isPending
                          }
                          label={`Enable ${column.columnName} for department user`}
                          onChange={(enabled) =>
                            updateColumnEnabled(column, 'DEPARTMENT_USER', enabled)
                          }
                        />
                      </div>
                      <Select
                        className="department-permission-select"
                        aria-label={`${column.columnName} user access`}
                        value={getAccessValue(column.roleBPermission)}
                        disabled={
                          selectedRoute.enableUser !== true ||
                          column.enableUser !== true ||
                          updateColumnPermissionMutation.isPending
                        }
                        onChange={(event) =>
                          updateColumnAccess(
                            column,
                            'DEPARTMENT_USER',
                            event.target.value as '1' | '12',
                          )
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </div>
                  </div>

                  <div className="department-item-actions">
                    <button
                      type="button"
                      className="department-icon-action-btn is-edit"
                      title={`Edit column ${column.columnName}`}
                      aria-label={`Edit column ${column.columnName}`}
                      onClick={() => setEditingColumn(column)}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="department-icon-action-btn is-delete"
                      title={`Delete column ${column.columnName}`}
                      aria-label={`Delete column ${column.columnName}`}
                      onClick={() => {
                        setDeleteColumnError('')
                        setDeletingColumn(column)
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <CreateRouteModal
        key={`route-${departmentType}`}
        open={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        initialDepartmentType={departmentType}
      />
      <CreateColumnModal
        key={`column-${departmentType}`}
        open={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        initialDepartmentType={departmentType}
        initialRouteId={selectedRouteId}
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
        routes={routes}
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
        confirmDisabled={linkedColumnsForDeletingRoute.length > 0}
        message={
          deletingRoute ? (
            <div>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Are you sure you want to delete route <strong>"{deletingRoute.routeName}"</strong>?
              </p>
              {linkedColumnsForDeletingRoute.length > 0 ? (
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
                  This route still has <strong>{linkedColumnsForDeletingRoute.length} column(s)</strong> attached to it:{' '}
                  <span style={{ fontWeight: 600, color: '#9a3412' }}>
                    [{linkedColumnsForDeletingRoute.map((c) => c.columnName).join(', ')}]
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
          linkedColumnsForDeletingRoute.length > 0 ? 'Delete Columns First' : 'Delete Route'
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
    </div>
  )
}
