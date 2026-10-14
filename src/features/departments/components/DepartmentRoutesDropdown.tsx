import { useMemo, useState } from 'react'
import type {
  DynamicColumnResponse,
  DynamicRouteResponse,
} from '../../../api/dynamic-permission.api'
import { PermissionToggle } from '../../../components/permissions/PermissionToggle'
import { Select } from '../../../components/ui/Select'
import {
  useDynamicColumns,
  useDynamicRoutes,
  useUpdateColumnPermission,
  useUpdateColumnStatus,
  useUpdateRouteStatus,
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
  const [routeUpdateError, setRouteUpdateError] = useState('')
  const [orderRevision, setOrderRevision] = useState(0)
  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)
  const updateColumnStatusMutation = useUpdateColumnStatus()
  const updateColumnPermissionMutation = useUpdateColumnPermission()
  const updateRouteStatusMutation = useUpdateRouteStatus()
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
        {!routesQuery.isPending ? (
          <span className="department-route-count">{routes.length} routes</span>
        ) : null}
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
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
