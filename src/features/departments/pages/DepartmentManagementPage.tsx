import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useCreateDepartment } from '../hooks/useCreateDepartment'
import { useUpdateDepartment } from '../hooks/useUpdateDepartment'
import { useDeleteDepartment } from '../hooks/useDeleteDepartment'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../types/department.types'
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
  const [search, setSearch] = useState('')
  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null)
  const [departmentToDelete, setDepartmentToDelete] =
    useState<Department | null>(null)
  const [showCreateModal, setShowCreateModal] =
    useState(false)
  const [showRouteModal, setShowRouteModal] = useState(false)
  const [showColumnModal, setShowColumnModal] = useState(false)

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

  function handleViewDashboard(
    department: Department,
  ) {
    navigate({
      to: '/departments/$departmentId/dashboard',
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
        breadcrumb="Administration / Departments"
        title="Department Management"
        description="Create and manage department login accounts."
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
              onClick={() => setShowCreateModal(true)}
            >
              <span>＋</span> Create Department Login
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
          onViewDashboard={handleViewDashboard}
        />
      </Card>

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
