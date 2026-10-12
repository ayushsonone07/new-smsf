import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { AdminServiceItem } from '../../../api/admin-services.api'
import { useDepartments } from '../hooks/useDepartments'
import { useCreateDepartment } from '../hooks/useCreateDepartment'
import { useUpdateDepartment } from '../hooks/useUpdateDepartment'
import { useDeleteDepartment } from '../hooks/useDeleteDepartment'
import { useLoginAsDepartment } from '../../auth/hooks/useLoginAsDepartment'
import {
  getSession,
  homeForRole,
  openSessionInNewTab,
} from '../../../app/auth/session'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../types/department.types'
import { AddAdminServiceModal } from '../../../components/departments/AddAdminServiceModal'
import { AdminServiceListCard } from '../../../components/departments/AdminServiceListCard'
import { DepartmentStats } from '../../../components/departments/DepartmentStats'
import { DepartmentTable } from '../../../components/departments/DepartmentTable'
import { DepartmentFormModal } from '../../../components/departments/DepartmentFormModal'
import { DeleteDepartmentDialog } from '../../../components/departments/DeleteDepartmentDialog'
import { DepartmentFilters } from '../../../components/departments/DepartmentFilters'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import { CreateRouteModal } from '../../../components/permissions/CreateRouteModal'
import { CreateColumnModal } from '../../../components/permissions/CreateColumnModal'

export function DepartmentManagementPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'departments' | 'services'>(
    'departments',
  )
  const [search, setSearch] = useState('')
  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null)
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [preselectedService, setPreselectedService] =
    useState<AdminServiceItem | null>(null)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showColumnModal, setShowColumnModal] = useState(false)

  const departmentsQuery = useDepartments()
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()
  const loginAsMutation = useLoginAsDepartment()

  const allDepartments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  )

  // Deduplicate: only show department heads, grouped by department type
  const departments = useMemo(() => {
    const headMap = new Map<string, Department>()

    for (const dept of allDepartments) {
      if (dept.role === 'DEPARTMENT_HEAD') {
        // Use department type as key to deduplicate
        const typeKey = dept.type || 'unknown'
        if (!headMap.has(typeKey)) {
          headMap.set(typeKey, dept)
        }
      }
    }

    return Array.from(headMap.values())
  }, [allDepartments])

  const filteredDepartments = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) {
      return departments
    }

    return departments.filter((department) =>
      [
        department.type || '',
        department.name,
        department.username,
        department.email,
        department.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(value),
    )
  }, [departments, search])

  function handleCreate(data: CreateDepartmentRequest) {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowCreateModal(false)
        setPreselectedService(null)
        setActiveTab('departments')
      },
    })
  }

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

  function handleViewFeatures(department: Department) {
    navigate({
      to: '/admin/departments/$departmentId',
      params: { departmentId: department.id },
    })
  }

  /**
   * Home button: generate a token for the department's email
   * (GET /api/auth/generate-token?username=<email>) and open
   * that department in a NEW tab with its own isolated sessionStorage.
   * The admin page stays intact in the current tab with all data!
   */
  function handleLoginAsDepartment(department: Department) {
    loginAsMutation.reset()

    // Open a blank window synchronously during the user click event to prevent popup blockers
    const newWindow = window.open('', '_blank')
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

    deleteMutation.mutate(
      departmentToDelete.email || departmentToDelete.id,
      {
        onSuccess: () => {
          setDepartmentToDelete(null)
        },
      },
    )
  }

  const mutationError =
    createMutation.error ||
    updateMutation.error ||
    deleteMutation.error

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
          onRetry={() => departmentsQuery.refetch()}
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        breadcrumb="Administration / Departments & Services"
        title="Department & Service Management"
        description="Step 1: Create a Service in Service List -> Step 2: Create Department Head Login."
        actions={
          <>
            <Button
              variant="icon"
              aria-label="Notifications"
            >
              ♢
            </Button>

            <ProfileChip />
          </>
        }
      />

      <DepartmentStats departments={departments} />

      {/* Top Navigation Tabs: Department Accounts vs Service List (Superadmin -> ServiceList) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            border:
              activeTab === 'departments'
                ? '1px solid #2563eb'
                : '1px solid transparent',
            backgroundColor:
              activeTab === 'departments' ? '#eff6ff' : 'transparent',
            color: activeTab === 'departments' ? '#1d4ed8' : '#475569',
            cursor: 'pointer',
          }}
        >
          🏢 Department Accounts ({departments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            border:
              activeTab === 'services'
                ? '1px solid #2563eb'
                : '1px solid transparent',
            backgroundColor:
              activeTab === 'services' ? '#eff6ff' : 'transparent',
            color: activeTab === 'services' ? '#1d4ed8' : '#475569',
            cursor: 'pointer',
          }}
        >
          ➕ Create Department
        </button>
      </div>

      {loginAsMutation.isError ? (
        <p className="auth-error" role="alert">
          Could not log in as department:{' '}
          {loginAsMutation.error.message}
        </p>
      ) : null}

      {activeTab === 'services' ? (
        <AdminServiceListCard
          onCreateDepartmentForService={(service) => {
            setPreselectedService(service ?? null)
            setShowCreateModal(true)
          }}
        />
      ) : (
        <Card>
          <div className="table-toolbar">
            <div>
              <h2>Department Accounts</h2>

              <p>
                Manage login credentials and access
                for each department.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                onClick={() => setShowRouteModal(true)}
              >
                <span>＋</span> Add Dynamic Route
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowColumnModal(true)}
              >
                <span>＋</span> Add Dynamic Column
              </Button>
              <Button
                onClick={() => setActiveTab('services')}
              >
                <span>➕</span> Create Department
              </Button>
            </div>
          </div>

          <DepartmentFilters
            search={search}
            onSearchChange={setSearch}
          />

          <DepartmentTable
            departments={filteredDepartments}
            onEdit={setEditingDepartment}
            onDelete={setDepartmentToDelete}
            onViewFeatures={handleViewFeatures}
            onViewDashboard={handleLoginAsDepartment}
            loggingInId={
              loginAsMutation.isPending
                ? (departments.find(
                    (item) =>
                      item.email === loginAsMutation.variables,
                  )?.id ?? '')
                : null
            }
          />
        </Card>
      )}

      <AddAdminServiceModal
        open={showAddServiceModal}
        onClose={() => setShowAddServiceModal(false)}
        onCreated={(createdService) => {
          setPreselectedService(createdService)
          setShowCreateModal(true)
        }}
      />

      <DepartmentFormModal
        open={
          showCreateModal ||
          Boolean(editingDepartment)
        }
        department={editingDepartment}
        initialService={preselectedService}
        existingDepartments={departments}
        isSubmitting={
          createMutation.isPending ||
          updateMutation.isPending
        }
        error={mutationError?.message}
        onClose={() => {
          setShowCreateModal(false)
          setEditingDepartment(null)
          setPreselectedService(null)
          createMutation.reset()
          updateMutation.reset()
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onViewFeatures={handleViewFeatures}
        onViewDashboard={handleLoginAsDepartment}
      />

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

      <CreateRouteModal
        open={showRouteModal}
        onClose={() => setShowRouteModal(false)}
      />

      <CreateColumnModal
        open={showColumnModal}
        onClose={() => setShowColumnModal(false)}
      />
    </PageLayout>
  )
}
