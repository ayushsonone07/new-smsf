import { useMemo, useState } from 'react'
import { SectionCard } from '../../../../components/head/shared/SectionCard'
import { Button } from '../../../../components/ui/Button'
import { Pill } from '../../../../components/ui/Pill'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { CustomerTable } from '../../../../components/customers/CustomerTable'
import { CustomerFormModal } from '../../../../components/customers/CustomerFormModal'
import { DeleteCustomerDialog } from '../../../../components/customers/DeleteCustomerDialog'
import {
  CustomerFilters,
  type CustomerStatusFilter,
} from '../../../../components/customers/CustomerFilters'
import { useDepartmentCustomers } from '../../hooks/useDepartmentCustomers'
import { useCreateCustomer } from '../../hooks/useCreateCustomer'
import { useUpdateCustomer } from '../../hooks/useUpdateCustomer'
import { useDeleteCustomer } from '../../hooks/useDeleteCustomer'
import { useColumnFeatures } from '../../../permissions/hooks/useColumnFeatures'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import type { Customer } from '../../types/customer.types'

/**
 * Head panel — Customer List. Which columns show up (and whether
 * this role may edit them) comes from the admin's column
 * features, so the table follows the permissions page live.
 */
export function CustomerListPage() {
  const departmentId = useHeadDepartmentId()
  const columnFeatures = useColumnFeatures(departmentId, 'customers')

  const customersQuery = useDepartmentCustomers(departmentId)
  const createMutation = useCreateCustomer(departmentId)
  const updateMutation = useUpdateCustomer(departmentId)
  const deleteMutation = useDeleteCustomer(departmentId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<CustomerStatusFilter>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)

  // Whether this role may create/edit/delete customers is decided
  // by the admin's Actions column permission — no separate screen
  // gate, so setting Actions to CAN_READ really makes it read-only.
  const canManage = columnFeatures.canEdit('actions')

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase()

    return (customersQuery.data ?? []).filter((customer) => {
      const matchesSearch =
        !value ||
        [customer.name, customer.email, customer.company]
          .join(' ')
          .toLowerCase()
          .includes(value)

      const matchesStatus =
        statusFilter === 'ALL' ||
        customer.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [customersQuery.data, search, statusFilter])

  if (customersQuery.isPending) {
    return <LoadingState message="Loading customers..." />
  }

  if (customersQuery.isError) {
    return (
      <ErrorState
        title="Unable to load customers"
        message={customersQuery.error.message}
        onRetry={() => customersQuery.refetch()}
      />
    )
  }

  function closeModal() {
    setShowCreate(false)
    setEditing(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function handleDelete() {
    if (!deleting) return

    deleteMutation.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    })
  }

  const mutationError =
    createMutation.error || updateMutation.error

  return (
    <>
      <div className="head-toolbar">
        <CustomerFilters
          search={search}
          statusFilter={statusFilter}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
        />

        {canManage ? (
          <Button
            className="head-primary-button"
            onClick={() => setShowCreate(true)}
          >
            ＋ Add Customer
          </Button>
        ) : null}
      </div>

      <SectionCard
        title="Customer Onboarding"
        meta={
          <Pill tone="info" size="sm">
            {filtered.length} customers
          </Pill>
        }
        hint="Columns & access set by the admin"
      >
        <CustomerTable
          customers={filtered}
          canEdit={canManage}
          hiddenColumns={columnFeatures.hiddenColumns}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      </SectionCard>

      {canManage ? (
        <>
          <CustomerFormModal
            open={showCreate || Boolean(editing)}
            customer={editing}
            isSubmitting={
              createMutation.isPending ||
              updateMutation.isPending
            }
            error={mutationError?.message}
            onClose={closeModal}
            onCreate={(data) =>
              createMutation.mutate(
                { departmentId, data },
                { onSuccess: closeModal },
              )
            }
            onUpdate={(data) => {
              if (!editing) return

              updateMutation.mutate(
                { id: editing.id, data },
                { onSuccess: closeModal },
              )
            }}
          />

          <DeleteCustomerDialog
            customer={deleting}
            isDeleting={deleteMutation.isPending}
            error={deleteMutation.error?.message}
            onClose={() => {
              setDeleting(null)
              deleteMutation.reset()
            }}
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </>
  )
}
