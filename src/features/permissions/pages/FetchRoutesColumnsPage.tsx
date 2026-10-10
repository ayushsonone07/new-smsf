import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { PageLayout } from '../../../components/layout/PageLayout'
import { PageHeader } from '../../../components/layout/PageHeader'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { DataTable } from '../../../components/ui/DataTable'
import { Select } from '../../../components/ui/Select'
import { Icon } from '../../../components/head/shared/Icon'
import { PermissionToggle } from '../../../components/permissions/PermissionToggle'
import { LoadingState } from '../../../components/ui/LoadingState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  useDynamicRoutes,
  useDynamicColumns,
  useDepartmentTypes,
  useDepartmentDetails,
  useUpdateColumnPermission,
} from '../hooks/useDynamicPermissions'
import { CreateRouteModal } from '../../../components/permissions/CreateRouteModal'
import { CreateColumnModal } from '../../../components/permissions/CreateColumnModal'
import type {
  DynamicRouteResponse,
  DynamicColumnResponse,
} from '../../../api/dynamic-permission.api'
import type { PermissionLevel } from '../types/permission.types'

type ActiveTab = 'routes' | 'columns'

interface UiItemState {
  enabled: boolean
  userVisible: boolean
  roleAPermission: PermissionLevel
  roleBPermission: PermissionLevel
}

const PERMISSION_OPTIONS: Array<{ value: PermissionLevel; label: string }> = [
  { value: 'CAN_READ', label: 'Can Read' },
  { value: 'CAN_EDIT', label: 'Can Edit' },
]

const TABLE_COLUMNS = [
  { key: 'order', title: 'ORDER', width: '90px' },
  { key: 'item', title: 'MENU ITEM' },
  { key: 'enabled', title: 'ENABLE / DISABLE', width: '150px' },
  { key: 'userVisible', title: 'SHOW TO USER', width: '140px' },
  { key: 'roleA', title: 'ROLE A (HEAD)', width: '130px' },
  { key: 'roleB', title: 'ROLE B (USER)', width: '130px' },
  { key: 'actions', title: 'ACTIONS', width: '100px', className: 'actions-heading' },
]

export function FetchRoutesColumnsPage() {
  const [selectedDept, setSelectedDept] = useState<string>('ONBOARDING_DEPARTMENT')
  const [activeTab, setActiveTab] = useState<ActiveTab>('routes')
  const [search, setSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // React Query hooks with department filtering (real DB data)
  const routesQuery = useDynamicRoutes(selectedDept)
  const columnsQuery = useDynamicColumns(selectedDept)
  const deptsQuery = useDepartmentTypes()
  const deptDetailsQuery = useDepartmentDetails(selectedDept)
  const updateColumnPermissionMutation = useUpdateColumnPermission()

  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false)
  const [showCreateColumnModal, setShowCreateColumnModal] = useState(false)

  // Local UI-only toggle states for Enable/Disable and Show to User (per user instruction)
  const [routesUiState, setRoutesUiState] = useState<Record<string, UiItemState>>({})
  const [columnsUiState, setColumnsUiState] = useState<Record<string, UiItemState>>({})

  // Reorder list order in UI
  const [routesOrder, setRoutesOrder] = useState<string[]>([])
  const [columnsOrder, setColumnsOrder] = useState<string[]>([])

  const rawRoutes = routesQuery.data ?? []
  const rawColumns = columnsQuery.data ?? []

  // Department switch handler
  const handleSelectDepartment = (dept: string) => {
    setSelectedDept(dept)
    setRoutesUiState({})
    setColumnsUiState({})
    setRoutesOrder([])
    setColumnsOrder([])
    setSearch('')
  }

  // Initialize order when fetched
  const orderedRoutes = useMemo(() => {
    if (routesOrder.length === 0 && rawRoutes.length > 0) {
      return rawRoutes
    }
    const map = new Map(rawRoutes.map((r) => [r.routeId, r]))
    const sorted: DynamicRouteResponse[] = []
    routesOrder.forEach((id) => {
      const item = map.get(id)
      if (item) sorted.push(item)
    })
    rawRoutes.forEach((r) => {
      if (!sorted.some((s) => s.routeId === r.routeId)) {
        sorted.push(r)
      }
    })
    return sorted
  }, [rawRoutes, routesOrder])

  const orderedColumns = useMemo(() => {
    if (columnsOrder.length === 0 && rawColumns.length > 0) {
      return rawColumns
    }
    const map = new Map(rawColumns.map((c) => [c.columnId, c]))
    const sorted: DynamicColumnResponse[] = []
    columnsOrder.forEach((id) => {
      const item = map.get(id)
      if (item) sorted.push(item)
    })
    rawColumns.forEach((c) => {
      if (!sorted.some((s) => s.columnId === c.columnId)) {
        sorted.push(c)
      }
    })
    return sorted
  }, [rawColumns, columnsOrder])

  const filteredRoutes = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return orderedRoutes
    return orderedRoutes.filter(
      (r) =>
        r.routeName.toLowerCase().includes(term) ||
        r.routeId.toLowerCase().includes(term),
    )
  }, [orderedRoutes, search])

  const filteredColumns = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return orderedColumns
    return orderedColumns.filter(
      (c) =>
        c.columnName.toLowerCase().includes(term) ||
        c.columnId.toLowerCase().includes(term),
    )
  }, [orderedColumns, search])

  // Move order helpers (UI only)
  const handleMoveRoute = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= filteredRoutes.length) return
    const ids = filteredRoutes.map((r) => r.routeId)
    const [moved] = ids.splice(index, 1)
    ids.splice(targetIdx, 0, moved)
    setRoutesOrder(ids)
  }

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= filteredColumns.length) return
    const ids = filteredColumns.map((c) => c.columnId)
    const [moved] = ids.splice(index, 1)
    ids.splice(targetIdx, 0, moved)
    setColumnsOrder(ids)
  }

  // Pure UI state toggles (no backend call per instruction)
  const handleToggleRoute = (id: string, key: 'enabled' | 'userVisible', val: boolean) => {
    setRoutesUiState((prev) => ({
      ...prev,
      [id]: {
        enabled: key === 'enabled' ? val : prev[id]?.enabled ?? true,
        userVisible: key === 'userVisible' ? val : prev[id]?.userVisible ?? true,
        roleAPermission: prev[id]?.roleAPermission ?? 'CAN_READ',
        roleBPermission: prev[id]?.roleBPermission ?? 'CAN_READ',
      },
    }))
  }

  const handleToggleColumn = (id: string, key: 'enabled' | 'userVisible', val: boolean) => {
    setColumnsUiState((prev) => ({
      ...prev,
      [id]: {
        enabled: key === 'enabled' ? val : prev[id]?.enabled ?? true,
        userVisible: key === 'userVisible' ? val : prev[id]?.userVisible ?? true,
        roleAPermission: prev[id]?.roleAPermission ?? 'CAN_READ',
        roleBPermission: prev[id]?.roleBPermission ?? 'CAN_READ',
      },
    }))
  }

  // Real backend read/write permission update for Columns into access_controls table
  const handleColumnPermissionChange = (
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    permission: PermissionLevel,
  ) => {
    const accessCode = permission === 'CAN_EDIT' ? '12' : '1'

    // Update UI state immediately
    setColumnsUiState((prev) => ({
      ...prev,
      [column.columnId]: {
        enabled: prev[column.columnId]?.enabled ?? true,
        userVisible: prev[column.columnId]?.userVisible ?? true,
        roleAPermission:
          roleName === 'DEPARTMENT_HEAD'
            ? permission
            : prev[column.columnId]?.roleAPermission ??
              (column.roleAPermission === '1' ? 'CAN_READ' : 'CAN_EDIT'),
        roleBPermission:
          roleName === 'DEPARTMENT_USER'
            ? permission
            : prev[column.columnId]?.roleBPermission ??
              (column.roleBPermission === '12' ? 'CAN_EDIT' : 'CAN_READ'),
      },
    }))

    // Call backend API PUT /api/dynamic-permission/columns/permission
    updateColumnPermissionMutation.mutate(
      {
        columnId: column.columnId,
        columnName: column.columnName,
        roleName,
        departmentType: selectedDept === 'ALL' ? 'ONBOARDING_DEPARTMENT' : selectedDept,
        readWriteAccess: accessCode,
      },
      {
        onSuccess: () => {
          setStatusMessage({
            type: 'success',
            text: `Permission updated for column "${column.columnName}" (${roleName} -> ${permission === 'CAN_EDIT' ? 'Can Edit' : 'Can Read'}) for ${selectedDept}!`,
          })
          setTimeout(() => setStatusMessage(null), 4000)
        },
        onError: (err: any) => {
          setStatusMessage({
            type: 'error',
            text: `Failed to update permission: ${err?.message || 'Server error'}`,
          })
          setTimeout(() => setStatusMessage(null), 5000)
        },
      },
    )
  }

  // Route permission change (pure UI state)
  const handleRoutePermissionChange = (
    routeId: string,
    role: 'roleAPermission' | 'roleBPermission',
    permission: PermissionLevel,
  ) => {
    setRoutesUiState((prev) => ({
      ...prev,
      [routeId]: {
        enabled: prev[routeId]?.enabled ?? true,
        userVisible: prev[routeId]?.userVisible ?? true,
        roleAPermission: role === 'roleAPermission' ? permission : prev[routeId]?.roleAPermission ?? 'CAN_READ',
        roleBPermission: role === 'roleBPermission' ? permission : prev[routeId]?.roleBPermission ?? 'CAN_READ',
      },
    }))
    setStatusMessage({
      type: 'success',
      text: `Route permission toggle updated in UI!`,
    })
    setTimeout(() => setStatusMessage(null), 2500)
  }

  const formatItemName = (str: string) => {
    const cleaned = str.replace(/^\/head\//, '').replace(/^\//, '').replace(/[-_]/g, ' ')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  const allDepts = deptsQuery.data ?? ['ONBOARDING_DEPARTMENT']

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            <span>Permissions</span>
            {' / '}
            <span>Department Routes & Columns</span>
          </>
        }
        title="Department Dynamic Permission Manager"
        description="Select a department to view its mapped routes from access_summary and column permissions from access_controls. Real DB data only."
        actions={
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => {
                routesQuery.refetch()
                columnsQuery.refetch()
                if (selectedDept !== 'ALL') deptDetailsQuery.refetch()
              }}
              disabled={routesQuery.isFetching || columnsQuery.isFetching}
            >
              <span>↻</span> Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCreateRouteModal(true)}
            >
              <span>＋</span> Add Route
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCreateColumnModal(true)}
            >
              <span>＋</span> Add Column
            </Button>
            <ProfileChip />
          </div>
        }
      />

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
          }}
        >
          <span>{statusMessage.type === 'success' ? '✓' : '⚠'}</span>
          {statusMessage.text}
        </div>
      )}

      {/* 1. Interactive Department Selection Pills (Clickable) */}
      <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Department to Filter
            </span>
            <div style={{ fontSize: '0.875rem', color: '#334155' }}>
              Click any department below to view its specific routes and column permissions from MySQL.
            </div>
          </div>
          {/* Quick Dropdown Fallback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
              Dropdown:
            </span>
            <Select
              value={selectedDept}
              onChange={(e) => handleSelectDepartment(e.target.value)}
              style={{ minWidth: '220px', padding: '0.35rem 0.6rem', fontSize: '0.8125rem' }}
            >
              <option value="ALL">🏢 ALL DEPARTMENTS (Master View)</option>
              {allDepts.map((d) => (
                <option key={d} value={d}>
                  🏢 {d}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Horizontal Clickable Department Chips */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => handleSelectDepartment('ALL')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '20px',
              fontSize: '0.8125rem',
              fontWeight: selectedDept === 'ALL' ? 700 : 500,
              backgroundColor: selectedDept === 'ALL' ? '#4f46e5' : '#f1f5f9',
              color: selectedDept === 'ALL' ? '#ffffff' : '#475569',
              border: selectedDept === 'ALL' ? '1px solid #4338ca' : '1px solid #e2e8f0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selectedDept === 'ALL' ? '0 2px 4px rgba(79, 70, 229, 0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🌐</span>
            <span>All Master</span>
          </button>

          {allDepts.map((d) => {
            const isSelected = selectedDept === d
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleSelectDepartment(d)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? '#4f46e5' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid #4338ca' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 2px 4px rgba(79, 70, 229, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🏢</span>
                <span>{d.replace(/_DEPARTMENT$/, '')}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* 2. Department Details Info Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            🏢
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {selectedDept === 'ALL' ? 'All Departments Master Catalog' : selectedDept}
              </span>
              {selectedDept !== 'ALL' && deptDetailsQuery.data?.departmentId && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                  }}
                >
                  Service ID: {deptDetailsQuery.data.departmentId}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              {selectedDept === 'ALL'
                ? 'Showing all routes and master columns across all departments.'
                : `Active filter: showing mapped routes and column permissions for ${selectedDept}.`}
            </div>
          </div>
        </div>

        {/* Real counts from MySQL */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Mapped Routes</span>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#4f46e5' }}>
              {routesQuery.isLoading ? '...' : rawRoutes.length}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Customer Columns</span>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0284c7' }}>
              {columnsQuery.isLoading ? '...' : rawColumns.length}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Card with Tabs & Data Table */}
      <Card>
        <div
          className="table-toolbar"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            paddingBottom: '1rem',
          }}
        >
          {/* Left: View Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '0.25rem',
                gap: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('routes')}
                style={{
                  border: 'none',
                  background: activeTab === 'routes' ? '#ffffff' : 'transparent',
                  color: activeTab === 'routes' ? '#4f46e5' : '#64748b',
                  fontWeight: activeTab === 'routes' ? 600 : 500,
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'routes' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Routes ({rawRoutes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('columns')}
                style={{
                  border: 'none',
                  background: activeTab === 'columns' ? '#ffffff' : 'transparent',
                  color: activeTab === 'columns' ? '#4f46e5' : '#64748b',
                  fontWeight: activeTab === 'columns' ? 600 : 500,
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'columns' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Customer Columns ({rawColumns.length})
              </button>
            </div>
          </div>

          {/* Right: Search Input */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <input
              type="text"
              placeholder={`Search ${activeTab} in ${selectedDept === 'ALL' ? 'all' : selectedDept}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                fontSize: '0.875rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #cbd5e1)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '0.875rem',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
          </div>
        </div>

        {/* Loading / Error states */}
        {(routesQuery.isLoading || columnsQuery.isLoading) && (
          <LoadingState message={`Fetching real data for ${selectedDept} from database...`} />
        )}

        {routesQuery.isError && activeTab === 'routes' && (
          <ErrorState
            title="Failed to load routes"
            message={routesQuery.error?.message}
            onRetry={() => routesQuery.refetch()}
          />
        )}

        {columnsQuery.isError && activeTab === 'columns' && (
          <ErrorState
            title="Failed to load columns"
            message={columnsQuery.error?.message}
            onRetry={() => columnsQuery.refetch()}
          />
        )}

        {/* 1. Routes Table (Filtered by Department from access_summary) */}
        {activeTab === 'routes' && !routesQuery.isLoading && (
          <DataTable columns={TABLE_COLUMNS}>
            {filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty-cell">
                  <EmptyState
                    icon="⌗"
                    title={`No routes mapped for ${selectedDept}`}
                    description={`No routes were found in the access_summary table for ${selectedDept}. Click '+ Add Route' to create and assign one.`}
                  />
                </td>
              </tr>
            ) : (
              filteredRoutes.map((route, index) => {
                const ui = routesUiState[route.routeId] || {
                  enabled: true,
                  userVisible: true,
                  roleAPermission: 'CAN_READ',
                  roleBPermission: 'CAN_READ',
                }

                return (
                  <tr
                    key={route.routeId}
                    className={ui.enabled ? '' : 'is-disabled-row'}
                  >
                    {/* ORDER */}
                    <td>
                      <div className="order-controls">
                        <button
                          type="button"
                          className="order-button"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => handleMoveRoute(index, 'up')}
                        >
                          ▲
                        </button>
                        <span>{index + 1}</span>
                        <button
                          type="button"
                          className="order-button"
                          aria-label="Move down"
                          disabled={index === filteredRoutes.length - 1}
                          onClick={() => handleMoveRoute(index, 'down')}
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* MENU ITEM / ROUTE */}
                    <td>
                      <div className="feature-cell feature-cell--icon">
                        <span className="feature-icon">
                          <Icon name="grid" size={16} />
                        </span>
                        <div>
                          <strong>{formatItemName(route.routeName)}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              UUID: {route.routeId.slice(0, 8)}...{route.routeId.slice(-4)}
                            </span>
                            {route.assignedRoles && route.assignedRoles.length > 0 && (
                              <span style={{ display: 'flex', gap: '0.25rem' }}>
                                {route.assignedRoles.map((role) => (
                                  <span
                                    key={role}
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '3px',
                                      backgroundColor: role.includes('HEAD') ? '#eff6ff' : '#f0fdf4',
                                      color: role.includes('HEAD') ? '#1d4ed8' : '#15803d',
                                    }}
                                  >
                                    {role.replace('DEPARTMENT_', '')}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                          <code className="feature-path">{route.routeName}</code>
                        </div>
                      </div>
                    </td>

                    {/* ENABLE / DISABLE (Pure UI state) */}
                    <td>
                      <PermissionToggle
                        checked={ui.enabled}
                        label={`Toggle ${route.routeName}`}
                        onChange={(checked) =>
                          handleToggleRoute(route.routeId, 'enabled', checked)
                        }
                      />
                    </td>

                    {/* SHOW TO USER (Pure UI state) */}
                    <td>
                      <PermissionToggle
                        checked={ui.userVisible}
                        disabled={!ui.enabled}
                        label={`Show ${route.routeName} to user`}
                        onChange={(checked) =>
                          handleToggleRoute(route.routeId, 'userVisible', checked)
                        }
                      />
                    </td>

                    {/* ROLE A */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.roleAPermission}
                        disabled={!ui.enabled}
                        onChange={(e) =>
                          handleRoutePermissionChange(
                            route.routeId,
                            'roleAPermission',
                            e.target.value as PermissionLevel,
                          )
                        }
                      >
                        {PERMISSION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </td>

                    {/* ROLE B */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.roleBPermission}
                        disabled={!ui.enabled}
                        onChange={(e) =>
                          handleRoutePermissionChange(
                            route.routeId,
                            'roleBPermission',
                            e.target.value as PermissionLevel,
                          )
                        }
                      >
                        {PERMISSION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-button edit"
                          title="Copy UUID"
                          onClick={() => {
                            navigator.clipboard.writeText(route.routeId)
                            setStatusMessage({
                              type: 'success',
                              text: `Route UUID "${route.routeId}" copied to clipboard!`,
                            })
                            setTimeout(() => setStatusMessage(null), 2500)
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="action-button delete"
                          title="Delete Route"
                          onClick={() => {
                            if (window.confirm(`Delete route "${route.routeName}" from UI view?`)) {
                              setRoutesOrder((prev) =>
                                prev.filter((id) => id !== route.routeId),
                              )
                            }
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </DataTable>
        )}

        {/* 2. Customer Columns Table (Loaded from access_controls for this department) */}
        {activeTab === 'columns' && !columnsQuery.isLoading && (
          <DataTable columns={TABLE_COLUMNS}>
            {filteredColumns.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty-cell">
                  <EmptyState
                    icon="⌗"
                    title={`No columns found for ${selectedDept}`}
                    description={`No customer columns match the current filter or table is empty in MySQL.`}
                  />
                </td>
              </tr>
            ) : (
              filteredColumns.map((col, index) => {
                const ui = columnsUiState[col.columnId] || {
                  enabled: true,
                  userVisible: true,
                  roleAPermission: col.roleAPermission === '1' ? 'CAN_READ' : 'CAN_EDIT',
                  roleBPermission: col.roleBPermission === '12' ? 'CAN_EDIT' : 'CAN_READ',
                }

                const isUpdating =
                  updateColumnPermissionMutation.isPending &&
                  updateColumnPermissionMutation.variables?.columnId === col.columnId

                return (
                  <tr
                    key={col.columnId}
                    className={ui.enabled ? '' : 'is-disabled-row'}
                  >
                    {/* ORDER */}
                    <td>
                      <div className="order-controls">
                        <button
                          type="button"
                          className="order-button"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => handleMoveColumn(index, 'up')}
                        >
                          ▲
                        </button>
                        <span>{index + 1}</span>
                        <button
                          type="button"
                          className="order-button"
                          aria-label="Move down"
                          disabled={index === filteredColumns.length - 1}
                          onClick={() => handleMoveColumn(index, 'down')}
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* MENU ITEM / COLUMN */}
                    <td>
                      <div className="feature-cell feature-cell--icon">
                        <span className="feature-icon" style={{ backgroundColor: '#faf5ff', color: '#7c3aed' }}>
                          <Icon name="list" size={16} />
                        </span>
                        <div>
                          <strong>{formatItemName(col.columnName)}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              UUID: {col.columnId.slice(0, 8)}...{col.columnId.slice(-4)}
                            </span>
                            {col.isConfigured && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '3px',
                                  backgroundColor: '#f0fdf4',
                                  color: '#15803d',
                                }}
                              >
                                Saved in DB
                              </span>
                            )}
                          </div>
                          <code className="feature-path">{col.columnName}</code>
                        </div>
                      </div>
                    </td>

                    {/* ENABLE / DISABLE (Pure UI state) */}
                    <td>
                      <PermissionToggle
                        checked={ui.enabled}
                        label={`Toggle ${col.columnName} column`}
                        onChange={(checked) =>
                          handleToggleColumn(col.columnId, 'enabled', checked)
                        }
                      />
                    </td>

                    {/* SHOW TO USER (Pure UI state) */}
                    <td>
                      <PermissionToggle
                        checked={ui.userVisible}
                        disabled={!ui.enabled}
                        label={`Show ${col.columnName} to user`}
                        onChange={(checked) =>
                          handleToggleColumn(col.columnId, 'userVisible', checked)
                        }
                      />
                    </td>

                    {/* ROLE A (Updates backend: access_controls for DEPARTMENT_HEAD) */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.roleAPermission}
                        disabled={!ui.enabled || isUpdating}
                        onChange={(e) =>
                          handleColumnPermissionChange(
                            col,
                            'DEPARTMENT_HEAD',
                            e.target.value as PermissionLevel,
                          )
                        }
                      >
                        {PERMISSION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </td>

                    {/* ROLE B (Updates backend: access_controls for DEPARTMENT_USER) */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.roleBPermission}
                        disabled={!ui.enabled || isUpdating}
                        onChange={(e) =>
                          handleColumnPermissionChange(
                            col,
                            'DEPARTMENT_USER',
                            e.target.value as PermissionLevel,
                          )
                        }
                      >
                        {PERMISSION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-button edit"
                          title="Copy UUID"
                          onClick={() => {
                            navigator.clipboard.writeText(col.columnId)
                            setStatusMessage({
                              type: 'success',
                              text: `Column UUID "${col.columnId}" copied to clipboard!`,
                            })
                            setTimeout(() => setStatusMessage(null), 2500)
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="action-button delete"
                          title="Delete Column"
                          onClick={() => {
                            if (window.confirm(`Delete column "${col.columnName}" from UI view?`)) {
                              setColumnsOrder((prev) =>
                                prev.filter((id) => id !== col.columnId),
                              )
                            }
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </DataTable>
        )}
      </Card>

      {/* Modals for Create Route / Column */}
      {showCreateRouteModal && (
        <CreateRouteModal
          open={showCreateRouteModal}
          onClose={() => {
            setShowCreateRouteModal(false)
            routesQuery.refetch()
          }}
          initialDepartmentType={selectedDept === 'ALL' ? 'ONBOARDING_DEPARTMENT' : selectedDept}
        />
      )}

      {showCreateColumnModal && (
        <CreateColumnModal
          open={showCreateColumnModal}
          onClose={() => {
            setShowCreateColumnModal(false)
            columnsQuery.refetch()
          }}
          initialDepartmentType={selectedDept === 'ALL' ? 'ONBOARDING_DEPARTMENT' : selectedDept}
        />
      )}
    </PageLayout>
  )
}
