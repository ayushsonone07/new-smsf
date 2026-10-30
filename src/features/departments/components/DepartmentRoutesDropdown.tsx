import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { RefreshButton } from '../../../components/ui/RefreshButton'
import {
  useDynamicColumns,
  useDynamicRoutes,
  useUpdateColumnPermission,
  useUpdateColumnStatus,
  useUpdateRouteStatus,
  useDeleteDynamicRoute,
  useDeleteDynamicColumn,
  useCreateColumnsForRoute,
} from '../../permissions/hooks/useDynamicPermissions'
import {
  applyDynamicColumnOrder,
  readDynamicColumnOrder,
  saveDynamicColumnOrder,
} from '../../../utils/dynamicColumnOrder'
import './DepartmentRoutesDropdown.css'

interface DepartmentRoutesDropdownProps {
  departmentType: string
}

const AUTOMATION_CUSTOMER_LIST_COLUMNS = [
  'Index',
  'Created',
  'Customer',
  'Contact',
  'Requirement Form',
  'Services',
  'Status',
  'Expiration',
  'Client Remark',
  'Internal Remark',
  'Draft Sent',
  'Assigned To',
  'Website Exists',
  'Actions',
]

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
  const [hoveredRoute, setHoveredRoute] = useState<{
    name: string
    x: number
    y: number
    showBelow: boolean
  } | null>(null)
  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)
  const updateColumnStatusMutation = useUpdateColumnStatus()
  const updateColumnPermissionMutation = useUpdateColumnPermission()
  const updateRouteStatusMutation = useUpdateRouteStatus()
  const deleteRouteMutation = useDeleteDynamicRoute()
  const deleteColumnMutation = useDeleteDynamicColumn()
  const createRouteColumnsMutation = useCreateColumnsForRoute()
  const provisionedRouteRef = useRef('')
  const routes = routesQuery.data ?? []
  // Auto-select first route if none selected
  useEffect(() => {
    if (!selectedRouteId && routes.length > 0) {
      setSelectedRouteId(routes[0].routeId)
    }
  }, [routes, selectedRouteId])

  const selectedRoute = routes.find((route) => route.routeId === selectedRouteId) || (routes.length > 0 ? routes[0] : null)

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

  useEffect(() => {
    if (routesQuery.isPending || columnsQuery.isPending) return
    if (departmentType.trim().toUpperCase() !== 'AUTOMATION_DEPARTMENT') return

    const automationCustomerRoute = routes.find(
      (route) =>
        normalizeRouteName(route.routeName) ===
        'automation_department/head/customer-list',
    )
    if (!automationCustomerRoute) return

    const linkedNames = new Set(
      (columnsQuery.data ?? [])
        .filter((column) => belongsToRoute(column, automationCustomerRoute))
        .map((column) => column.columnName.trim().toLowerCase()),
    )
    const missingColumns = AUTOMATION_CUSTOMER_LIST_COLUMNS.filter(
      (name) => !linkedNames.has(name.toLowerCase()),
    )
    if (missingColumns.length === 0) return

    const provisionKey = `${automationCustomerRoute.routeId}:${missingColumns.join('|')}`
    if (
      provisionedRouteRef.current === provisionKey ||
      createRouteColumnsMutation.isPending
    ) return
    provisionedRouteRef.current = provisionKey

    createRouteColumnsMutation.mutate({
      departmentType,
      routeId: automationCustomerRoute.routeId,
      routeName: automationCustomerRoute.routeName,
      columnNames: missingColumns,
      readWriteAccess: '12',
    })
  }, [
    columnsQuery.data,
    columnsQuery.isPending,
    createRouteColumnsMutation,
    departmentType,
    routes,
    routesQuery.isPending,
  ])

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

  // Background refetch (refresh button): keep the lists visible but dimmed.
  const isRefreshing =
    (routesQuery.isFetching && !routesQuery.isPending) ||
    (columnsQuery.isFetching && !columnsQuery.isPending)
  const refreshingClass = isRefreshing ? ' pointer-events-none opacity-60' : ''

  const updateErrorMessage =
    routeUpdateError ||
    createRouteColumnsMutation.error?.message ||
    updateRouteStatusMutation.error?.message ||
    updateColumnStatusMutation.error?.message ||
    updateColumnPermissionMutation.error?.message

  return (
    <div className="dept-routes-dropdown-wrap">
      {/* 1. TOP TOOLBAR */}
      <div className="dept-routes-toolbar">
        <div className="dept-routes-toolbar-title">
          <strong>Department routes & columns</strong>
          <span>Select a route on the left to view and configure its columns on the right.</span>
        </div>
        <div className="dept-routes-toolbar-actions">
          <button
            type="button"
            className="dept-route-add-btn"
            onClick={() => setShowRouteModal(true)}
          >
            <span aria-hidden="true">＋</span> Add Dynamic Route
          </button>
          <button
            type="button"
            className="dept-route-add-btn"
            onClick={() => setShowColumnModal(true)}
          >
            <span aria-hidden="true">＋</span> Add Dynamic Column
          </button>
          {!routesQuery.isPending ? (
            <span className="dept-routes-count-badge">{routes.length} routes</span>
          ) : null}
          <RefreshButton
            onRefresh={() =>
              Promise.all([routesQuery.refetch(), columnsQuery.refetch()])
            }
            isRefreshing={routesQuery.isFetching || columnsQuery.isFetching}
            label="routes and columns"
          />
        </div>
      </div>

      {updateErrorMessage ? (
        <p className="p-3 bg-red-50 text-red-600 rounded-lg text-xs" role="alert">
          Could not update permissions: {updateErrorMessage}
        </p>
      ) : null}

      {/* 2. TWO-COLUMN SPLIT PANEL (ROUTES ON LEFT, COLUMNS ON RIGHT) */}
      <div className="dept-routes-split-layout">
        {/* Left Panel: Routes List */}
        <div className="dept-routes-left-card">
          {routesQuery.isPending ? (
            <p className="text-xs text-slate-400 p-6 text-center">Loading routes…</p>
          ) : routesQuery.isError ? (
            <p className="text-xs text-red-500 p-6 text-center">
              Could not load routes: {routesQuery.error.message}
            </p>
          ) : routes.length === 0 ? (
            <p className="text-xs text-slate-400 p-6 text-center">
              No routes are configured for this department.
            </p>
          ) : (
            routes.map((route) => {
              const isSelected = selectedRoute?.routeId === route.routeId
              return (
                <div
                  key={route.routeId}
                  className={`dept-route-row-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedRouteId(route.routeId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedRouteId(route.routeId)
                    }
                  }}
                >
                  {/* Left: Branch Icon + Route Name + Arrow */}
                  <div className="dept-route-row-left">
                    <span className="dept-route-branch-icon" aria-hidden="true">↳</span>
                    <span className="dept-route-name-text" title={route.routeName}>
                      {route.routeName}
                    </span>
                    <span className="dept-route-chevron" aria-hidden="true">›</span>
                  </div>

                  {/* Right: Head & User Toggles + Edit & Delete Buttons */}
                  <div className="dept-route-row-right">
                    <div className="dept-role-toggle-group">
                      <div className="dept-role-toggle-item">
                        <span className="dept-role-toggle-label">Head</span>
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
                      <div className="dept-role-toggle-item">
                        <span className="dept-role-toggle-label">User</span>
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

                    <button
                      type="button"
                      className="dept-route-btn-action"
                      title={`Edit route ${route.routeName}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingRoute(route)
                      }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="dept-route-btn-action is-delete"
                      title={`Delete route ${route.routeName}`}
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
              )
            })
          )}
        </div>

        {/* Right Panel: Columns for Selected Route */}
        <div className="dept-columns-right-card">
          {selectedRoute ? (
            <>
              <div className="dept-columns-header">
                <div>
                  <span className="dept-columns-header-label">Columns for</span>
                  <strong className="dept-columns-header-route">
                    {selectedRoute.routeName}
                  </strong>
                </div>
                {!columnsQuery.isPending && !columnsQuery.isError ? (
                  <span className="dept-routes-count-badge">
                    {routeColumns.length} columns
                  </span>
                ) : null}
              </div>

              {columnsQuery.isPending ? (
                <p className="text-xs text-slate-400 p-8 text-center">Loading columns…</p>
              ) : columnsQuery.isError ? (
                <p className="text-xs text-red-500 p-8 text-center">
                  Could not load columns: {columnsQuery.error.message}
                </p>
              ) : routeColumns.length === 0 ? (
                <div className="dept-columns-empty-text">
                  No columns are linked to this route.
                </div>
              ) : (
                <ul className="dept-columns-list">
                  {routeColumns.map((column, index) => (
                    <li key={column.columnId} className="dept-column-row-item">
                      <div className="dept-column-info">
                        <span className="text-indigo-600 font-bold text-sm">▤</span>
                        <div>
                          <div className="dept-column-name">{column.columnName}</div>
                          <div className="dept-column-id-badge">{column.columnId}</div>
                        </div>
                      </div>

                      <div className="dept-column-order-controls">
                        <button
                          type="button"
                          className="dept-column-order-btn"
                          disabled={index === 0}
                          onClick={() => moveColumn(column.columnId, -1)}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <span className="text-xs font-bold text-slate-600 px-1">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          className="dept-column-order-btn"
                          disabled={index === routeColumns.length - 1}
                          onClick={() => moveColumn(column.columnId, 1)}
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>

                      <div className="dept-column-perm-controls">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">Head</span>
                          <PermissionToggle
                            checked={column.enableHead === true}
                            disabled={
                              selectedRoute.enableHead !== true ||
                              updateColumnStatusMutation.isPending
                            }
                            label={`Enable ${column.columnName} for head`}
                            onChange={(enabled) =>
                              updateColumnEnabled(column, 'DEPARTMENT_HEAD', enabled)
                            }
                          />
                          <Select
                            className="department-permission-select text-xs py-1 px-1.5"
                            value={getAccessValue(column.roleAPermission)}
                            disabled={
                              selectedRoute.enableHead !== true ||
                              column.enableHead !== true ||
                              updateColumnPermissionMutation.isPending
                            }
                            onChange={(e) =>
                              updateColumnAccess(
                                column,
                                'DEPARTMENT_HEAD',
                                e.target.value as '1' | '12',
                              )
                            }
                          >
                            <option value="1">Read Only</option>
                            <option value="12">Read + Write</option>
                          </Select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">User</span>
                          <PermissionToggle
                            checked={column.enableUser === true}
                            disabled={
                              selectedRoute.enableUser !== true ||
                              updateColumnStatusMutation.isPending
                            }
                            label={`Enable ${column.columnName} for user`}
                            onChange={(enabled) =>
                              updateColumnEnabled(column, 'DEPARTMENT_USER', enabled)
                            }
                          />
                          <Select
                            className="department-permission-select text-xs py-1 px-1.5"
                            value={getAccessValue(column.roleBPermission)}
                            disabled={
                              selectedRoute.enableUser !== true ||
                              column.enableUser !== true ||
                              updateColumnPermissionMutation.isPending
                            }
                            onChange={(e) =>
                              updateColumnAccess(
                                column,
                                'DEPARTMENT_USER',
                                e.target.value as '1' | '12',
                              )
                            }
                          >
                            <option value="1">Read Only</option>
                            <option value="12">Read + Write</option>
                          </Select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="dept-route-btn-action"
                            title={`Edit ${column.columnName}`}
                            onClick={() => setEditingColumn(column)}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="dept-route-btn-action is-delete"
                            title={`Delete ${column.columnName}`}
                            onClick={() => {
                              setDeleteColumnError('')
                              setDeletingColumn(column)
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="dept-columns-empty-text">
              Select a route on the left to see and manage its columns.
            </div>
          )}
        </div>
      </div>

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
      {hoveredRoute && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="department-route-tooltip"
              style={{
                left: `${hoveredRoute.x}px`,
                top: `${hoveredRoute.y}px`,
                transform: hoveredRoute.showBelow ? 'translateY(0)' : 'translateY(-100%)',
              }}
              role="tooltip"
            >
              {hoveredRoute.name}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
