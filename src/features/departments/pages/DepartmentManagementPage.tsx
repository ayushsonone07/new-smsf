import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  RotateCw,
  Bell,
  Search,
  Plus,
} from 'lucide-react'
import { useDepartments } from '../hooks/useDepartments'
import { useUpdateDepartment } from '../hooks/useUpdateDepartment'
import { useDeleteDepartment } from '../hooks/useDeleteDepartment'
import { useLoginAsDepartment } from '../../auth/hooks/useLoginAsDepartment'
import {
  getSession,
  homeForRole,
  openSessionInNewTab,
  prepareLoginWindow,
} from '../../../app/auth/session'
import {
  getAdminDepartmentSummary,
  toLocalDateTimeParam,
} from '../../../api/admin-summary.api'
import { getAdminDepartments } from '../../../api/admin-departments.api'
import type {
  Department,
  UpdateDepartmentRequest,
} from '../types/department.types'
import {
  DepartmentTable,
  type EnrichedDepartment,
} from '../../../components/departments/DepartmentTable'
import { DepartmentFormModal } from '../../../components/departments/DepartmentFormModal'
import { DeleteDepartmentDialog } from '../../../components/departments/DeleteDepartmentDialog'
import { uniqueDepartmentHeads } from '../utils/departmentHeads'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import './DepartmentManagementPage.css'
import { notifyHeadDeleted } from '../../../api/notification-factory'

/** Distinct avatar theme color & initial per department */
function getDepartmentVisual(deptName: string) {
  const normalized = deptName.toLowerCase()
  if (normalized.includes('support')) return { initial: 'S', bg: 'bg-amber-100 text-amber-700 border-amber-200' }
  if (normalized.includes('billing')) return { initial: 'B', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  if (normalized.includes('seo')) return { initial: 'S', bg: 'bg-cyan-100 text-cyan-700 border-cyan-200' }
  if (normalized.includes('advertisement') || normalized.includes('ad'))
    return { initial: 'A', bg: 'bg-blue-100 text-blue-700 border-blue-200' }
  if (normalized.includes('smo')) return { initial: 'S', bg: 'bg-rose-100 text-rose-700 border-rose-200' }
  if (normalized.includes('google')) return { initial: 'G', bg: 'bg-purple-100 text-purple-700 border-purple-200' }
  if (normalized.includes('onboarding')) return { initial: 'O', bg: 'bg-sky-100 text-sky-700 border-sky-200' }
  if (normalized.includes('automation')) return { initial: 'A', bg: 'bg-orange-100 text-orange-700 border-orange-200' }
  if (normalized.includes('sales')) return { initial: 'S', bg: 'bg-teal-100 text-teal-700 border-teal-200' }
  if (normalized.includes('website')) return { initial: 'W', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' }
  if (normalized.includes('marketing')) return { initial: 'M', bg: 'bg-pink-100 text-pink-700 border-pink-200' }
  if (normalized.includes('delivery')) return { initial: 'D', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  return { initial: deptName.charAt(0).toUpperCase() || 'D', bg: 'bg-slate-100 text-slate-700 border-slate-200' }
}

function departmentLabel(type: string): string {
  if (!type) return 'Department'
  return type
    .replace(/_DEPARTMENT$/i, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function DepartmentManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)

  const departmentsQuery = useDepartments()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()
  const loginAsMutation = useLoginAsDepartment()

  // 1. Fetch User Counts across departments
  const adminUsersQuery = useQuery({
    queryKey: ['admin-departments-users-count'],
    queryFn: () => getAdminDepartments({ size: 500 }),
    staleTime: 120_000,
  })

  // Map departmentType -> user count
  const userCountByDept = useMemo(() => {
    const map = new Map<string, number>()
    const users = adminUsersQuery.data?.data ?? []
    for (const u of users) {
      const type = u.departmentType
      if (type) {
        map.set(type, (map.get(type) || 0) + 1)
      }
    }
    return map
  }, [adminUsersQuery.data])

  const allDepartments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  )

  // Deduplicate: only show department heads, grouped by department type
  const uniqueHeads = useMemo(() => uniqueDepartmentHeads(allDepartments), [allDepartments])

  // Extract department types
  const departmentTypes = useMemo(() => {
    return uniqueHeads
      .map((d) => d.type)
      .filter((t): t is string => Boolean(t) && t !== 'unknown')
  }, [uniqueHeads])

  // 2. Fetch 30-day summaries for each department
  const range = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 30)
    start.setHours(0, 0, 0, 0)
    return { startDate: toLocalDateTimeParam(start), endDate: toLocalDateTimeParam(end) }
  }, [])

  const departmentSummaryQueries = useQueries({
    queries: departmentTypes.map((departmentType) => ({
      queryKey: ['admin-summary', '30d', departmentType],
      queryFn: () => getAdminDepartmentSummary({ ...range, departmentType }),
      staleTime: 60_000,
    })),
  })

  // 3. Build Enriched Department list
  const enrichedList: EnrichedDepartment[] = useMemo(() => {
    return uniqueHeads.map((dept) => {
      const type = dept.type || 'UNKNOWN'
      const typeIndex = departmentTypes.indexOf(type)
      const summary = typeIndex >= 0 ? departmentSummaryQueries[typeIndex]?.data : undefined

      const label = departmentLabel(type)
      const headFromUsers = adminUsersQuery.data?.data?.find(
        (u) => u.departmentType === type && u.isHead,
      )

      const headName = dept.name || dept.username || headFromUsers?.username || `${label} Head`
      const headEmail = dept.email || headFromUsers?.email || ''
      const userCount = userCountByDept.get(type) || 1

      const customers = summary?.totalCustomers ?? 0
      const delayed = summary?.delayedServices ?? 0
      const completed = summary?.completedServices ?? 0
      const inProgress = summary?.inProgressServices ?? 0
      const pending = summary?.pendingServices ?? 0
      const cancelled = summary?.cancelledServices ?? 0

      const totalServices =
        completed + inProgress + pending + cancelled || customers

      const completionPercent =
        totalServices > 0 ? Math.round((completed / totalServices) * 100) : 0

      return {
        id: dept.id,
        department: dept,
        type,
        label,
        code: type,
        headName,
        headEmail,
        userCount,
        customers,
        completionPercent,
        delayed,
        status: dept.status || 'ACTIVE',
        visual: getDepartmentVisual(label),
      }
    })
  }, [uniqueHeads, departmentTypes, departmentSummaryQueries, adminUsersQuery.data, userCountByDept])

  // Filtered by Search & Status
  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLowerCase()

    return enrichedList.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }

      // Search query
      if (!term) return true

      return [
        item.label,
        item.code,
        item.headName,
        item.headEmail,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [enrichedList, search, statusFilter])

  // Status counts for pills
  const totalCount = enrichedList.length
  const activeCount = enrichedList.filter((d) => d.status === 'ACTIVE').length
  const inactiveCount = enrichedList.filter((d) => d.status === 'INACTIVE').length

  function handleUpdate(data: UpdateDepartmentRequest) {
    if (!editingDepartment) return

    updateMutation.mutate(
      {
        id: editingDepartment.id,
        data,
      },
      {
        onSuccess: () => {
          setEditingDepartment(null)
        },
      },
    )
  }

  function handleToggleStatus(department: Department) {
    const newStatus = department.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    updateMutation.mutate({
      id: department.id,
      data: {
        email: department.email,
        username: department.username,
        name: department.name,
        type: department.type,
      },
    })
  }

  function handleViewFeatures(department: Department) {
    navigate({
      to: '/admin/departments/$departmentId',
      params: { departmentId: department.id },
    })
  }

  function handleLoginAsDepartment(department: Department) {
    loginAsMutation.reset()

    const newWindow = window.open('', '_blank')
    prepareLoginWindow(newWindow)
    const adminSession = getSession()

    loginAsMutation.mutate(department.email, {
      onSuccess: (session) => {
        const targetRoute = homeForRole(
          session.user.role,
          session.user.departmentType,
        )

        openSessionInNewTab(session, targetRoute, newWindow, adminSession)
      },
      onError: (err) => {
        if (newWindow) {
          newWindow.close()
        }
        console.error('Failed to log in as department:', err)
        alert(`Login failed: ${err.message}`)
      },
    })
  }

  function handleDelete() {
    if (!departmentToDelete) return

    const targetEmail =
      departmentToDelete.email ||
      departmentToDelete.username ||
      departmentToDelete.id

    deleteMutation.mutate(
      targetEmail,
      {
        onSuccess: () => {
          notifyHeadDeleted(
            departmentToDelete.name || departmentToDelete.username || '',
            departmentToDelete.email || '',
          )
          setDepartmentToDelete(null)
          handleRefreshAll()
        },
      },
    )
  }

  const isRefreshing = departmentsQuery.isFetching || adminUsersQuery.isFetching

  const handleRefreshAll = () => {
    departmentsQuery.refetch()
    adminUsersQuery.refetch()
    departmentSummaryQueries.forEach((q) => q.refetch())
  }

  if (departmentsQuery.isPending) {
    return (
      <PageLayout>
        <LoadingState message="Loading departments..." />
      </PageLayout>
    )
  }

  if (departmentsQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          title="Unable to load departments"
          message={departmentsQuery.error.message}
          onRetry={handleRefreshAll}
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="dept-page-container">
        {/* 1. TOP HEADER BAR */}
        <header className="dept-page-header">
          <div className="flex items-baseline gap-3">
            <h1 className="dept-page-title">Departments</h1>
            <span className="dept-page-subtitle">
              Heads, users and status of every department
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="dept-header-icon-btn"
              onClick={handleRefreshAll}
              title="Refresh departments"
              disabled={isRefreshing}
            >
              <RotateCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              className="dept-header-icon-btn"
              onClick={() => navigate({ to: '/admin/notification-history' as any })}
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </header>

        {/* 2. MAIN WHITE CARD WITH TOOLBAR & TABLE */}
        <div className="dept-main-card">
          {/* Toolbar: Search on Left, Status Pills + Create Button on Right */}
          <div className="dept-toolbar">
            {/* Search Input */}
            <div className="dept-search-wrapper">
              <Search className="dept-search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search department, head or email"
                className="dept-search-input"
              />
            </div>

            {/* Right Controls: Pills + Create Button */}
            <div className="dept-toolbar-right">
              {/* Status Filter Pills */}
              <div className="dept-status-pills">
                <button
                  type="button"
                  className={`dept-pill-btn ${statusFilter === 'ALL' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('ALL')}
                >
                  All <span className="dept-pill-count">{totalCount}</span>
                </button>
                <button
                  type="button"
                  className={`dept-pill-btn ${statusFilter === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('ACTIVE')}
                >
                  Active <span className="dept-pill-count">{activeCount}</span>
                </button>
                <button
                  type="button"
                  className={`dept-pill-btn ${statusFilter === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter('INACTIVE')}
                >
                  Inactive <span className="dept-pill-count">{inactiveCount}</span>
                </button>
              </div>

              {/* + Create Department Button */}
              <button
                type="button"
                className="dept-create-btn"
                onClick={() => navigate({ to: '/admin/create-department' })}
              >
                <Plus className="w-4 h-4" />
                <span>Create Department</span>
              </button>
            </div>
          </div>

          {/* Department Table */}
          <div
            className={`transition-opacity duration-200 ${
              isRefreshing ? 'pointer-events-none opacity-60' : ''
            }`}
            aria-busy={isRefreshing}
          >
            <DepartmentTable
              departments={filteredDepartments}
              onEdit={setEditingDepartment}
              onDelete={setDepartmentToDelete}
              onViewFeatures={handleViewFeatures}
              onViewDashboard={handleLoginAsDepartment}
              onToggleStatus={handleToggleStatus}
              loggingInId={
                loginAsMutation.isPending
                  ? (uniqueHeads.find(
                      (item) => item.email === loginAsMutation.variables,
                    )?.id ?? '')
                  : null
              }
            />
          </div>
        </div>

        {/* Edit Modal */}
        {editingDepartment ? (
          <DepartmentFormModal
            open
            department={editingDepartment}
            existingDepartments={uniqueHeads}
            isSubmitting={updateMutation.isPending}
            error={updateMutation.error?.message}
            onClose={() => {
              setEditingDepartment(null)
              updateMutation.reset()
            }}
            onCreate={() => {}}
            onUpdate={handleUpdate}
            onViewFeatures={handleViewFeatures}
            onViewDashboard={handleLoginAsDepartment}
          />
        ) : null}

        {/* Delete Dialog */}
        {departmentToDelete ? (
          <DeleteDepartmentDialog
            department={departmentToDelete}
            isDeleting={deleteMutation.isPending}
            error={deleteMutation.error?.message}
            onClose={() => {
              setDepartmentToDelete(null)
              deleteMutation.reset()
            }}
            onConfirm={handleDelete}
          />
        ) : null}
      </div>
    </PageLayout>
  )
}
