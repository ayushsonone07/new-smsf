import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { DepartmentStats } from '../components/DepartmentStats'
import { DepartmentTable } from '../components/DepartmentTable'
import { DepartmentFormModal } from '../components/DepartmentFormModal'
import { DeleteDepartmentDialog } from '../components/DeleteDepartmentDialog'
import { useDepartments } from '../hooks/useDepartments'
import { useCreateDepartment } from '../hooks/useCreateDepartment'
import { useUpdateDepartment } from '../hooks/useUpdateDepartment'
import { useDeleteDepartment } from '../hooks/useDeleteDepartment'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../types/department.types'

export function DepartmentManagementPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null)
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null)
  const [showCreateModal, setShowCreateModal] =
    useState(false)

  const departmentsQuery = useDepartments()
  const createMutation = useCreateDepartment()
  const updateMutation = useUpdateDepartment()
  const deleteMutation = useDeleteDepartment()

  const departments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  )

  const filteredDepartments = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) {
      return departments
    }

    return departments.filter((department) =>
      [
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

  function handleCreate(
    data: CreateDepartmentRequest,
  ) {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowCreateModal(false)
      },
    })
  }

  function handleUpdate(
    data: UpdateDepartmentRequest,
  ) {
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

  function handleViewFeatures(
    department: Department,
  ) {
    navigate({
      to: '/admin/departments/$departmentId',
      params: { departmentId: department.id },
    })
  }

  function handleDelete() {
    if (!departmentToDelete) return

    deleteMutation.mutate(
      departmentToDelete.id,
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
      <main className="page-content">
        <div className="loading-state">
          Loading departments...
        </div>
      </main>
    )
  }

  if (departmentsQuery.isError) {
    return (
      <main className="page-content">
        <div className="error-state">
          <strong>
            Unable to load departments
          </strong>

          <p>
            {departmentsQuery.error.message}
          </p>

          <button
            className="primary-button"
            onClick={() =>
              departmentsQuery.refetch()
            }
          >
            Try Again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-content">
      <header className="topbar">
        <div>
          <p className="breadcrumb">
            Administration / Departments
          </p>

          <h1>Department Management</h1>

          <p className="page-description">
            Create and manage department login accounts.
          </p>
        </div>

        <div className="topbar-actions">
          <button
            className="icon-button"
            aria-label="Notifications"
          >
            ♢
          </button>

          <div className="profile-chip">
            <div className="admin-avatar small">
              A
            </div>

            <div>
              <strong>Admin</strong>
              <span>Super Admin</span>
            </div>
          </div>
        </div>
      </header>

      <DepartmentStats
        departments={departments}
      />

      <section className="content-card">
        <div className="table-toolbar">
          <div>
            <h2>Department Accounts</h2>

            <p>
              Manage login credentials and access
              for each department.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() =>
              setShowCreateModal(true)
            }
          >
            <span>＋</span>
            Create Department Login
          </button>
        </div>

        <div className="filter-row">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search departments, username or email..."
            />
          </div>
        </div>

        <DepartmentTable
          departments={filteredDepartments}
          onEdit={setEditingDepartment}
          onDelete={setDepartmentToDelete}
          onViewFeatures={handleViewFeatures}
        />
      </section>

      <DepartmentFormModal
        open={
          showCreateModal ||
          Boolean(editingDepartment)
        }
        department={editingDepartment}
        isSubmitting={
          createMutation.isPending ||
          updateMutation.isPending
        }
        error={
          mutationError?.message
        }
        onClose={() => {
          setShowCreateModal(false)
          setEditingDepartment(null)
          createMutation.reset()
          updateMutation.reset()
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
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
    </main>
  )
}