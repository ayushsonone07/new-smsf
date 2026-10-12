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
} from '../../permissions/hooks/useDynamicPermissions'

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
  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)
  const updateColumnStatusMutation = useUpdateColumnStatus()
  const updateColumnPermissionMutation = useUpdateColumnPermission()
  const routes = routesQuery.data ?? []
  const selectedRoute = routes.find((route) => route.routeId === selectedRouteId)

  const routeColumns = useMemo(
    () =>
      selectedRoute
        ? (columnsQuery.data ?? []).filter((column) => belongsToRoute(column, selectedRoute))
        : [],
    [columnsQuery.data, selectedRoute],
  )

  function updateColumnEnabled(
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    enable: boolean,
  ) {
    updateColumnStatusMutation.mutate({
        columnId: column.columnId,
        columnName: column.columnName,
        roleName,
        departmentType,
        enable,
    })
  }

  function updateColumnAccess(
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    readWriteAccess: '1' | '12',
  ) {
    updateColumnPermissionMutation.mutate({
        columnId: column.columnId,
        columnName: column.columnName,
        roleName,
        departmentType,
        readWriteAccess,
    })
  }

  const updateError =
    updateColumnStatusMutation.error || updateColumnPermissionMutation.error

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
            <button
              key={route.routeId}
              type="button"
              className={`department-route-option${selectedRouteId === route.routeId ? ' is-selected' : ''}`}
              aria-pressed={selectedRouteId === route.routeId}
              onClick={() => setSelectedRouteId(route.routeId)}
            >
              <span className="department-route-option-icon" aria-hidden="true">↳</span>
              <span className="department-route-option-name">{route.routeName}</span>
              <span className="department-route-option-arrow" aria-hidden="true">›</span>
            </button>
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

          {updateError ? (
            <p className="department-route-state is-error" role="alert">
              Could not update column permission: {updateError.message}
            </p>
          ) : null}

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
              {routeColumns.map((column) => (
                <li key={column.columnId} className="department-column-item">
                  <div className="department-column-identity">
                    <span className="department-column-icon" aria-hidden="true">▤</span>
                    <div>
                      <strong>{column.columnName}</strong>
                      <span>{column.columnId}</span>
                    </div>
                  </div>

                  <div className="department-column-permissions">
                    <div className="department-column-permission">
                      <div className="department-permission-control">
                        <span className="department-permission-role">Head</span>
                        <PermissionToggle
                          checked={column.enableHead === true}
                          disabled={updateColumnStatusMutation.isPending}
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
                          disabled={updateColumnStatusMutation.isPending}
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
