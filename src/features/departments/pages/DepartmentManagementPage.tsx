import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useUpdateDepartment } from '../hooks/useUpdateDepartment'
import { useDeleteDepartment } from '../hooks/useDeleteDepartment'
import { useLoginAsDepartment } from '../../auth/hooks/useLoginAsDepartment'
import {
  getSession,
  homeForRole,
  openSessionInNewTab,
} from '../../../app/auth/session'
import type {
  Department,
  UpdateDepartmentRequest,
} from '../types/department.types'
import { DepartmentTable } from '../../../components/departments/DepartmentTable'
import { DepartmentFormModal } from '../../../components/departments/DepartmentFormModal'
import { DeleteDepartmentDialog } from '../../../components/departments/DeleteDepartmentDialog'
import { DepartmentFilters } from '../../../components/departments/DepartmentFilters'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import './DepartmentManagementPage.css'
import { notifyHeadDeleted } from '../../../api/notification-factory'

export function DepartmentManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null)
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null)

  const departmentsQuery = useDepartments()
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
   */
  function handleLoginAsDepartment(department: Department) {
    loginAsMutation.reset()

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
          notifyHeadDeleted(departmentToDelete.name || departmentToDelete.username || '', departmentToDelete.email || '')
          setDepartmentToDelete(null)
        },
      },
    )
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
          onRetry={() => departmentsQuery.refetch()}
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="department-management-page">
        <PageHeader
          breadcrumb={
            <>
              <Link to="/admin">Administration</Link>
              {' / '}
              <span>Departments</span>
            </>
          }
          title="Departments"
          description="View and manage all registered department accounts."
        />

        {loginAsMutation.isError ? (
          <p className="auth-error" role="alert">
            Could not log in as department: {loginAsMutation.error.message}
          </p>
        ) : null}

        <Card className="department-management-card">
          <div className="table-toolbar">
            <div>
              <h2>Department List</h2>
              <p>Total {departments.length} department account(s) registered</p>
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

        {editingDepartment ? (
          <DepartmentFormModal
            open
            department={editingDepartment}
            existingDepartments={departments}
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
