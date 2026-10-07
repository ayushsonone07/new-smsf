import { useMemo, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useDepartments } from '../hooks/useDepartments'
import { useDepartmentCustomers } from '../hooks/useDepartmentCustomers'
import { useCreateCustomer } from '../hooks/useCreateCustomer'
import { useUpdateCustomer } from '../hooks/useUpdateCustomer'
import { useDeleteCustomer } from '../hooks/useDeleteCustomer'
import type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '../types/customer.types'
import { CustomerTable } from '../../../components/customers/CustomerTable'
import { CustomerStats } from '../../../components/customers/CustomerStats'
import {
  CustomerFilters,
  type CustomerStatusFilter,
} from '../../../components/customers/CustomerFilters'
import { CustomerFormModal } from '../../../components/customers/CustomerFormModal'
import { DeleteCustomerDialog } from '../../../components/customers/DeleteCustomerDialog'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'

type DepartmentRole =
  | 'department-head'
  | 'department-user'

export function DepartmentCustomersPage() {
  const { departmentId } = useParams({
    from: '/departments/$departmentId/customers',
  })

  // Placeholder for the authenticated user's role.
  // Replace with the session role when auth is added.
  const [role, setRole] =
    useState<DepartmentRole>('department-head')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<CustomerStatusFilter>('ALL')
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null)
  const [customerToDelete, setCustomerToDelete] =
    useState<Customer | null>(null)
  const [showCreateModal, setShowCreateModal] =
    useState(false)

  const departmentsQuery = useDepartments()
  const customersQuery =
    useDepartmentCustomers(departmentId)
  const createMutation =
    useCreateCustomer(departmentId)
  const updateMutation =
    useUpdateCustomer(departmentId)
  const deleteMutation =
    useDeleteCustomer(departmentId)

  const department = departmentsQuery.data?.find(
    (item) => item.id === departmentId,
  )

  const customers = useMemo(
    () => customersQuery.data ?? [],
    [customersQuery.data],
  )

  // Department heads can manage customers;
  // department users have read-only access.
  const canEdit = role === 'department-head'

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase()

    return customers.filter((customer) => {
      const matchesSearch =
        !value ||
        [
          customer.name,
          customer.email,
          customer.company,
          customer.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(value)

      const matchesStatus =
        statusFilter === 'ALL' ||
        customer.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [customers, search, statusFilter])

  function handleCreate(
    data: CreateCustomerRequest,
  ) {
    createMutation.mutate(
      { departmentId, data },
      {
        onSuccess: () => {
          setShowCreateModal(false)
        },
      },
    )
  }

  function handleUpdate(
    data: UpdateCustomerRequest,
  ) {
    if (!editingCustomer) return

    updateMutation.mutate(
      { id: editingCustomer.id, data },
      {
        onSuccess: () => {
          setEditingCustomer(null)
        },
      },
    )
  }

  function handleDelete() {
    if (!customerToDelete) return

    deleteMutation.mutate(customerToDelete.id, {
      onSuccess: () => {
        setCustomerToDelete(null)
      },
    })
  }

  const mutationError =
    createMutation.error ||
    updateMutation.error ||
    deleteMutation.error

  if (customersQuery.isPending) {
    return (
      <PageLayout>
        <LoadingState message="Loading customers..." />
      </PageLayout>
    )
  }

  if (customersQuery.isError) {
    return (
      <PageLayout>
        <ErrorState
          title="Unable to load customers"
          message={customersQuery.error.message}
          onRetry={() => customersQuery.refetch()}
        />
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            Departments /{' '}
            {department?.name ?? 'Customers'}
          </>
        }
        title={`${department?.name ?? 'Department'} Customers`}
        description="Customer accounts linked to this department."
        actions={
          <>
            <div
              className="role-toggle"
              role="group"
              aria-label="View as role"
            >
              <button
                type="button"
                className={`role-option ${
                  role === 'department-head'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setRole('department-head')
                }
              >
                Department Head
              </button>

              <button
                type="button"
                className={`role-option ${
                  role === 'department-user'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setRole('department-user')
                }
              >
                Department User
              </button>
            </div>

            {canEdit && (
              <Button
                onClick={() =>
                  setShowCreateModal(true)
                }
              >
                <span>＋</span> Add Customer
              </Button>
            )}
          </>
        }
      />

      <CustomerStats customers={customers} />

      <Card>
        <div className="table-toolbar">
          <div>
            <h2>Customers</h2>

            <p>
              {canEdit
                ? 'Manage customer accounts for this department.'
                : 'View customer accounts for this department.'}
            </p>
          </div>
        </div>

        <CustomerFilters
          search={search}
          statusFilter={statusFilter}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
        />

        <CustomerTable
          customers={filteredCustomers}
          canEdit={canEdit}
          onEdit={setEditingCustomer}
          onDelete={setCustomerToDelete}
        />
      </Card>

      {canEdit && (
        <>
          <CustomerFormModal
            open={
              showCreateModal ||
              Boolean(editingCustomer)
            }
            customer={editingCustomer}
            isSubmitting={
              createMutation.isPending ||
              updateMutation.isPending
            }
            error={mutationError?.message}
            onClose={() => {
              setShowCreateModal(false)
              setEditingCustomer(null)
              createMutation.reset()
              updateMutation.reset()
            }}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
          />

          <DeleteCustomerDialog
            customer={customerToDelete}
            isDeleting={deleteMutation.isPending}
            error={deleteMutation.error?.message}
            onClose={() => {
              setCustomerToDelete(null)
              deleteMutation.reset()
            }}
            onConfirm={handleDelete}
          />
        </>
      )}
    </PageLayout>
  )
}
