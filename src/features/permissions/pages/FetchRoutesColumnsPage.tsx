import { useState, useMemo, useEffect } from 'react'
import { PageLayout } from '../../../components/layout/PageLayout'
import { PageHeader } from '../../../components/layout/PageHeader'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { DataTable } from '../../../components/ui/DataTable'
import { Select } from '../../../components/ui/Select'
import { ScrollableSelect } from '../../../components/ui/ScrollableSelect'
import { PermissionToggle } from '../../../components/permissions/PermissionToggle'
import { LoadingState } from '../../../components/ui/LoadingState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  useDynamicRoutes,
  useDynamicColumns,
  useDepartmentTypes,
  useUpdateColumnPermission,
  useUpdateColumnStatus,
  useUpdateRouteStatus,
} from '../hooks/useDynamicPermissions'
import { CreateRouteModal } from '../../../components/permissions/CreateRouteModal'
import { CreateColumnModal } from '../../../components/permissions/CreateColumnModal'
import type {
  DynamicRouteResponse,
  DynamicColumnResponse,
} from '../../../api/dynamic-permission.api'

type ActiveTab = 'routes' | 'columns'

interface UiItemState {
  enableHead: boolean
  enableUser: boolean
  readWriteHead: '1' | '12'
  readWriteUser: '1' | '12'
}

const TABLE_COLUMNS_ROUTES = [
  { key: 'sn', title: 'SN', width: '50px' },
  { key: 'item', title: 'ITEM (STORE ID, NAME, ROUTES)' },
  { key: 'enableHead', title: 'ENABLE/DISABLE HEAD', width: '160px' },
  { key: 'enableUser', title: 'ENABLE/DISABLE USER', width: '160px' },
  { key: 'readWriteHead', title: 'READ/WRITE HEAD', width: '160px' },
  { key: 'readWriteUser', title: 'READ/WRITE USER', width: '160px' },
  { key: 'actions', title: 'ACTIONS', width: '90px', className: 'actions-heading' },
]

const TABLE_COLUMNS_COLUMNS = [
  { key: 'sn', title: 'SN', width: '50px' },
  { key: 'item', title: 'ITEM (STORE ID, NAME, COLUMNS)' },
  { key: 'enableHead', title: 'ENABLE/DISABLE HEAD', width: '160px' },
  { key: 'enableUser', title: 'ENABLE/DISABLE USER', width: '160px' },
  { key: 'readWriteHead', title: 'READ/WRITE HEAD', width: '160px' },
  { key: 'readWriteUser', title: 'READ/WRITE USER', width: '160px' },
  { key: 'actions', title: 'ACTIONS', width: '90px', className: 'actions-heading' },
]

export function FetchRoutesColumnsPage() {
  const [selectedDept, setSelectedDept] = useState<string>(() => {
    try {
      return localStorage.getItem('smsf_selected_dept') || 'ALL'
    } catch {
      return 'ALL'
    }
  })
  const [activeTab, setActiveTab] = useState<ActiveTab>('routes')
  const [search, setSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // React Query hooks with department filtering (real DB data)
  const routesQuery = useDynamicRoutes(selectedDept)
  const columnsQuery = useDynamicColumns(selectedDept)
  const deptsQuery = useDepartmentTypes()
  const updateColumnPermissionMutation = useUpdateColumnPermission()
  const updateColumnStatusMutation = useUpdateColumnStatus()
  const updateRouteStatusMutation = useUpdateRouteStatus()

  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false)
  const [showCreateColumnModal, setShowCreateColumnModal] = useState(false)

  // Local UI-only toggle states for Enable/Disable and custom ordering
  const [routesUiState, setRoutesUiState] = useState<Record<string, UiItemState>>({})
  const [columnsUiState, setColumnsUiState] = useState<Record<string, UiItemState>>({})
  const [routesOrder, setRoutesOrder] = useState<string[]>([])
  const [columnsOrder, setColumnsOrder] = useState<string[]>([])

  const rawRoutes = routesQuery.data ?? []
  const rawColumns = columnsQuery.data ?? []

  // Department switch handler
  const handleSelectDepartment = (dept: string) => {
    setSelectedDept(dept)
    try {
      localStorage.setItem('smsf_selected_dept', dept)
    } catch {}
    setRoutesUiState({})
    setColumnsUiState({})
    setRoutesOrder([])
    setColumnsOrder([])
    setSearch('')
  }

  // Synchronize toggle UI state whenever database query returns fresh data
  useEffect(() => {
    if (routesQuery.data) {
      setRoutesUiState((prev) => {
        const next = { ...prev }
        routesQuery.data.forEach((r) => {
          next[r.routeId] = {
            enableHead: r.enableHead ?? r.visibility ?? false,
            enableUser: r.enableUser ?? r.visibility ?? false,
            readWriteHead: prev[r.routeId]?.readWriteHead ?? '1',
            readWriteUser: prev[r.routeId]?.readWriteUser ?? '1',
          }
        })
        return next
      })
    }
  }, [routesQuery.data])

  useEffect(() => {
    if (columnsQuery.data) {
      setColumnsUiState((prev) => {
        const next = { ...prev }
        columnsQuery.data.forEach((c) => {
          next[c.columnId] = {
            enableHead: c.enableHead === true,
            enableUser: c.enableUser === true,
            readWriteHead:
              prev[c.columnId]?.readWriteHead ?? (c.roleAPermission === '1' ? '1' : '12'),
            readWriteUser:
              prev[c.columnId]?.readWriteUser ?? (c.roleBPermission === '12' ? '12' : '1'),
          }
        })
        return next
      })
    }
  }, [columnsQuery.data])

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

  // Real backend enable/disable update for Routes into access_summary table
  const handleToggleRoute = (
    route: DynamicRouteResponse,
    key: 'enableHead' | 'enableUser',
    val: boolean,
  ) => {
    const roleName = key === 'enableHead' ? 'DEPARTMENT_HEAD' : 'DEPARTMENT_USER'
    const roleLabel = key === 'enableHead' ? 'HEAD' : 'USER'
    const dept = selectedDept === 'ALL' ? (route.departmentType || 'ONBOARDING_DEPARTMENT') : selectedDept

    // Optimistic UI state update
    setRoutesUiState((prev) => ({
      ...prev,
      [route.routeId]: {
        enableHead: key === 'enableHead' ? val : prev[route.routeId]?.enableHead ?? (route.enableHead ?? route.visibility ?? false),
        enableUser: key === 'enableUser' ? val : prev[route.routeId]?.enableUser ?? (route.enableUser ?? route.visibility ?? false),
        readWriteHead: prev[route.routeId]?.readWriteHead ?? '1',
        readWriteUser: prev[route.routeId]?.readWriteUser ?? '1',
      },
    }))

    // Call backend API PUT /api/dynamic-permission/routes/status
    updateRouteStatusMutation.mutate(
      {
        routeId: route.routeId,
        routeName: route.routeName,
        roleName,
        departmentType: dept,
        enable: val,
        visibility: val,
      },
      {
        onSuccess: () => {
          setStatusMessage({
            type: 'success',
            text: `Route status updated: ${route.routeName} (${roleLabel} -> ${val ? 'Enabled' : 'Disabled'}) in access_summary!`,
          })
          setTimeout(() => setStatusMessage(null), 3500)
        },
        onError: (err: any) => {
          // Revert optimistic state
          setRoutesUiState((prev) => ({
            ...prev,
            [route.routeId]: {
              ...prev[route.routeId],
              [key]: !val,
            },
          }))
          setStatusMessage({
            type: 'error',
            text: `Failed to update route status: ${err?.message || 'Server error'}`,
          })
          setTimeout(() => setStatusMessage(null), 5000)
        },
      },
    )
  }

  // Real backend enable/disable update for Columns into access_controls table
  const handleToggleColumn = (
    col: DynamicColumnResponse,
    key: 'enableHead' | 'enableUser',
    val: boolean,
  ) => {
    const roleName = key === 'enableHead' ? 'DEPARTMENT_HEAD' : 'DEPARTMENT_USER'
    const roleLabel = key === 'enableHead' ? 'HEAD' : 'USER'
    const dept = selectedDept === 'ALL' ? (col.departmentType || 'ONBOARDING_DEPARTMENT') : selectedDept

    // Optimistic UI state update
    setColumnsUiState((prev) => ({
      ...prev,
      [col.columnId]: {
        enableHead: key === 'enableHead' ? val : prev[col.columnId]?.enableHead ?? (col.enableHead === true),
        enableUser: key === 'enableUser' ? val : prev[col.columnId]?.enableUser ?? (col.enableUser === true),
        readWriteHead: prev[col.columnId]?.readWriteHead ?? (col.roleAPermission === '1' ? '1' : '12'),
        readWriteUser: prev[col.columnId]?.readWriteUser ?? (col.roleBPermission === '12' ? '12' : '1'),
      },
    }))

    // Call backend API PUT /api/dynamic-permission/columns/status
    updateColumnStatusMutation.mutate(
      {
        columnId: col.columnId,
        columnName: col.columnName,
        roleName,
        departmentType: dept,
        enable: val,
        visibility: val,
      },
      {
        onSuccess: () => {
          setStatusMessage({
            type: 'success',
            text: `Column status updated: ${col.columnName} (${roleLabel} -> ${val ? 'Enabled' : 'Disabled'}) in access_controls!`,
          })
          setTimeout(() => setStatusMessage(null), 3500)
        },
        onError: (err: any) => {
          // Revert optimistic state
          setColumnsUiState((prev) => ({
            ...prev,
            [col.columnId]: {
              ...prev[col.columnId],
              [key]: !val,
            },
          }))
          setStatusMessage({
            type: 'error',
            text: `Failed to update column status: ${err?.message || 'Server error'}`,
          })
          setTimeout(() => setStatusMessage(null), 5000)
        },
      },
    )
  }

  // Real backend read/write permission update for Columns into access_controls table
  const handleColumnPermissionChange = (
    column: DynamicColumnResponse,
    roleName: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    accessCode: '1' | '12',
  ) => {
    // Update UI state immediately
    setColumnsUiState((prev) => ({
      ...prev,
      [column.columnId]: {
        enableHead: prev[column.columnId]?.enableHead ?? (column.enableHead === true),
        enableUser: prev[column.columnId]?.enableUser ?? (column.enableUser === true),
        readWriteHead:
          roleName === 'DEPARTMENT_HEAD'
            ? accessCode
            : prev[column.columnId]?.readWriteHead ?? (column.roleAPermission === '1' ? '1' : '12'),
        readWriteUser:
          roleName === 'DEPARTMENT_USER'
            ? accessCode
            : prev[column.columnId]?.readWriteUser ?? (column.roleBPermission === '12' ? '12' : '1'),
      },
    }))

    // Call backend API PUT /api/dynamic-permission/columns/permission
    updateColumnPermissionMutation.mutate(
      {
        columnId: column.columnId,
        columnName: column.columnName,
        roleName,
        departmentType: selectedDept === 'ALL' ? (column.departmentType || 'ONBOARDING_DEPARTMENT') : selectedDept,
        readWriteAccess: accessCode,
      },
      {
        onSuccess: () => {
          setStatusMessage({
            type: 'success',
            text: `Permission updated: ${column.columnName} (${roleName === 'DEPARTMENT_HEAD' ? 'HEAD' : 'USER'} -> ${accessCode === '12' ? 'Read + Write' : 'Read Only'}) in access_controls!`,
          })
          setTimeout(() => setStatusMessage(null), 3500)
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
  const handleRouteChange = (
    routeId: string,
    key: 'readWriteHead' | 'readWriteUser',
    val: '1' | '12',
  ) => {
    setRoutesUiState((prev) => ({
      ...prev,
      [routeId]: {
        enableHead: prev[routeId]?.enableHead ?? false,
        enableUser: prev[routeId]?.enableUser ?? false,
        readWriteHead: key === 'readWriteHead' ? val : prev[routeId]?.readWriteHead ?? '1',
        readWriteUser: key === 'readWriteUser' ? val : prev[routeId]?.readWriteUser ?? '1',
      },
    }))
    setStatusMessage({
      type: 'success',
      text: `Route permission updated in UI state!`,
    })
    setTimeout(() => setStatusMessage(null), 2000)
  }

  const formatItemName = (str: string) => {
    if (!str) return ''
    const cleaned = str.replace(/^\/head\//, '').replace(/^\//, '').replace(/[-_]/g, ' ')
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  const allDepts = deptsQuery.data ?? ['ONBOARDING_DEPARTMENT']

  return (
    <PageLayout>
      {/* Top Header Bar matching Screenshot */}
      <PageHeader
        breadcrumb={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>SMSF</span>
            <span style={{ fontSize: '14px', color: '#64748b' }}>Admin Portal</span>
          </div>
        }
        title=""
        description=""
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => {
                routesQuery.refetch()
                columnsQuery.refetch()
              }}
              disabled={routesQuery.isFetching || columnsQuery.isFetching}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                padding: '7px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⟳</span> Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowCreateRouteModal(true)}
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                padding: '7px 16px',
                border: 'none',
              }}
            >
              ＋ Add Route
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCreateColumnModal(true)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                padding: '7px 14px',
              }}
            >
              ＋ Add Column
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

      {/* 1. SELECT DEPARTMENT TO FILTER Card (Exact Match to Screenshot) */}
      <Card style={{ marginBottom: '1rem', padding: '20px 24px', borderRadius: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              SELECT DEPARTMENT TO FILTER
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px' }}>
              Department permissions
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Select a department to view its mapped routes and permissions.
            </p>
          </div>

          {/* Top Right: Department Dropdown with scrollbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Department:</label>
            <ScrollableSelect
              value={selectedDept}
              onChange={handleSelectDepartment}
              options={[
                { value: 'ALL', label: 'All Departments' },
                ...allDepts.map((d) => ({ value: d, label: d })),
              ]}
              placeholder="Select Department"
              searchable={true}
              maxHeight={220}
              width="240px"
            />
          </div>
        </div>

        {/* Horizontal Clickable Department Pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => handleSelectDepartment('ALL')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: selectedDept === 'ALL' ? 600 : 500,
              backgroundColor: selectedDept === 'ALL' ? '#3b82f6' : '#ffffff',
              color: selectedDept === 'ALL' ? '#ffffff' : '#475569',
              border: selectedDept === 'ALL' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: selectedDept === 'ALL' ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
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
                  gap: '6px',
                  padding: '6px 16px',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 500,
                  backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ color: isSelected ? '#ffffff' : '#94a3b8', fontSize: '10px' }}>■</span>
                <span>{d.replace(/_DEPARTMENT$/, '')}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* 2. Active Department Banner Card (Exact Match to Screenshot) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#4f46e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}
        >
          📑
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
            {selectedDept === 'ALL' ? 'ALL DEPARTMENTS' : selectedDept}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Active filter: {selectedDept === 'ALL' ? 'All departments' : selectedDept}
          </div>
        </div>
      </div>

      {/* 3. Main Card with Routes & Columns Table (Exact Match to Screenshot) */}
      <Card style={{ padding: '20px 24px', borderRadius: '12px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* Left: View Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('routes')}
              style={{
                border: activeTab === 'routes' ? '1px solid #c7d2fe' : '1px solid transparent',
                background: activeTab === 'routes' ? '#ffffff' : '#f8fafc',
                color: activeTab === 'routes' ? '#4f46e5' : '#64748b',
                fontWeight: activeTab === 'routes' ? 600 : 500,
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Routes ({rawRoutes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('columns')}
              style={{
                border: activeTab === 'columns' ? '1px solid #c7d2fe' : '1px solid transparent',
                background: activeTab === 'columns' ? '#ffffff' : '#f8fafc',
                color: activeTab === 'columns' ? '#4f46e5' : '#64748b',
                fontWeight: activeTab === 'columns' ? 600 : 500,
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Customer Columns ({rawColumns.length})
            </button>
          </div>

          {/* Right: Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '13px',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder={activeTab === 'routes' ? 'Search routes, UUID or URL...' : 'Search columns, UUID or Name...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#0f172a',
              }}
            />
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

        {/* 1. Routes Table */}
        {activeTab === 'routes' && !routesQuery.isLoading && (
          <DataTable columns={TABLE_COLUMNS_ROUTES}>
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
                  enableHead: route.enableHead ?? route.visibility ?? false,
                  enableUser: route.enableUser ?? route.visibility ?? false,
                  readWriteHead: '1',
                  readWriteUser: '1',
                }

                const storeSnippet =
                  route.routeId.length > 13
                    ? `${route.routeId.slice(0, 8)}-${route.routeId.slice(9, 13)}`
                    : route.routeId

                return (
                  <tr key={route.routeId} className={ui.enableHead || ui.enableUser ? '' : 'is-disabled-row'}>
                    {/* SN */}
                    <td style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                      {index + 1}
                    </td>

                    {/* ITEM (STORE ID, NAME, ROUTES) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {formatItemName(route.routeName)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Store ID: {storeSnippet}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', margin: '2px 0' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            HEAD
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            USER
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            SUPERADMIN
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6366f1', fontFamily: 'monospace' }}>
                          {route.routeName}
                        </div>
                      </div>
                    </td>

                    {/* ENABLE/DISABLE HEAD */}
                    <td>
                      <PermissionToggle
                        checked={ui.enableHead}
                        label={`Toggle head access for ${route.routeName}`}
                        onChange={(checked) => handleToggleRoute(route, 'enableHead', checked)}
                      />
                    </td>

                    {/* ENABLE/DISABLE USER */}
                    <td>
                      <PermissionToggle
                        checked={ui.enableUser}
                        label={`Toggle user access for ${route.routeName}`}
                        onChange={(checked) => handleToggleRoute(route, 'enableUser', checked)}
                      />
                    </td>

                    {/* READ/WRITE HEAD */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.readWriteHead}
                        onChange={(e) =>
                          handleRouteChange(route.routeId, 'readWriteHead', e.target.value as '1' | '12')
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </td>

                    {/* READ/WRITE USER */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.readWriteUser}
                        onChange={(e) =>
                          handleRouteChange(route.routeId, 'readWriteUser', e.target.value as '1' | '12')
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          title="Copy Store ID"
                          onClick={() => {
                            navigator.clipboard.writeText(route.routeId)
                            setStatusMessage({
                              type: 'success',
                              text: `Store ID "${route.routeId}" copied to clipboard!`,
                            })
                            setTimeout(() => setStatusMessage(null), 2500)
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Remove from view"
                          onClick={() => {
                            if (window.confirm(`Remove route "${route.routeName}" from view?`)) {
                              setRoutesOrder((prev) => prev.filter((id) => id !== route.routeId))
                            }
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </DataTable>
        )}

        {/* 2. Customer Columns Table */}
        {activeTab === 'columns' && !columnsQuery.isLoading && (
          <DataTable columns={TABLE_COLUMNS_COLUMNS}>
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
                  enableHead: col.enableHead === true,
                  enableUser: col.enableUser === true,
                  readWriteHead: col.roleAPermission === '1' ? '1' : '12',
                  readWriteUser: col.roleBPermission === '12' ? '12' : '1',
                }

                const isUpdating =
                  updateColumnPermissionMutation.isPending &&
                  updateColumnPermissionMutation.variables?.columnId === col.columnId

                const storeSnippet =
                  col.columnId.length > 13
                    ? `${col.columnId.slice(0, 8)}-${col.columnId.slice(9, 13)}`
                    : col.columnId

                return (
                  <tr key={col.columnId} className={ui.enableHead || ui.enableUser ? '' : 'is-disabled-row'}>
                    {/* SN */}
                    <td style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>
                      {index + 1}
                    </td>

                    {/* ITEM (STORE ID, NAME, COLUMNS) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {formatItemName(col.columnName)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Store ID: {storeSnippet}
                        </div>
                        {col.routesType && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#f5f3ff',
                                color: '#7c3aed',
                                border: '1px solid #ddd6fe',
                              }}
                            >
                              Route: {col.routeName || `${col.routesType.slice(0, 8)}...`}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '4px', margin: '2px 0' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            HEAD
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            USER
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            SUPERADMIN
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6366f1', fontFamily: 'monospace' }}>
                          {col.columnName}
                        </div>
                      </div>
                    </td>

                    {/* ENABLE/DISABLE HEAD */}
                    <td>
                      <PermissionToggle
                        checked={ui.enableHead}
                        label={`Toggle head access for ${col.columnName}`}
                        onChange={(checked) => handleToggleColumn(col, 'enableHead', checked)}
                      />
                    </td>

                    {/* ENABLE/DISABLE USER */}
                    <td>
                      <PermissionToggle
                        checked={ui.enableUser}
                        label={`Toggle user access for ${col.columnName}`}
                        onChange={(checked) => handleToggleColumn(col, 'enableUser', checked)}
                      />
                    </td>

                    {/* READ/WRITE HEAD (Updates access_controls in MySQL) */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.readWriteHead}
                        disabled={isUpdating}
                        onChange={(e) =>
                          handleColumnPermissionChange(
                            col,
                            'DEPARTMENT_HEAD',
                            e.target.value as '1' | '12',
                          )
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </td>

                    {/* READ/WRITE USER (Updates access_controls in MySQL) */}
                    <td>
                      <Select
                        className="permission-select"
                        value={ui.readWriteUser}
                        disabled={isUpdating}
                        onChange={(e) =>
                          handleColumnPermissionChange(
                            col,
                            'DEPARTMENT_USER',
                            e.target.value as '1' | '12',
                          )
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          title="Copy Store ID"
                          onClick={() => {
                            navigator.clipboard.writeText(col.columnId)
                            setStatusMessage({
                              type: 'success',
                              text: `Store ID "${col.columnId}" copied to clipboard!`,
                            })
                            setTimeout(() => setStatusMessage(null), 2500)
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Remove from view"
                          onClick={() => {
                            if (window.confirm(`Remove column "${col.columnName}" from view?`)) {
                              setColumnsOrder((prev) => prev.filter((id) => id !== col.columnId))
                            }
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          ×
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
