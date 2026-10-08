import type { Customer } from '../../features/departments/types/customer.types'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { StatusBadge } from '../common/StatusBadge'

interface CustomerTableProps {
  customers: Customer[]
  canEdit: boolean
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function CustomerTable({
  customers,
  canEdit,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <EmptyState
        icon="♙"
        title="No customers found"
        description="Try changing your search or add a new customer."
      />
    )
  }

  const columns = [
    { key: 'customer', title: 'CUSTOMER' },
    { key: 'company', title: 'COMPANY' },
    { key: 'phone', title: 'PHONE' },
    { key: 'status', title: 'STATUS' },
    { key: 'created', title: 'CREATED' },
    ...(canEdit
      ? [
          {
            key: 'actions',
            title: 'ACTIONS',
            className: 'actions-heading',
          },
        ]
      : []),
  ]

  return (
    <DataTable columns={columns}>
      {customers.map((customer) => (
        <tr key={customer.id}>
          <td>
            <div className="department-cell">
              <div className="department-icon">
                ♙
              </div>

              <div>
                <strong>{customer.name}</strong>

                <span>{customer.email}</span>
              </div>
            </div>
          </td>

          <td>{customer.company}</td>

          <td>{customer.phone}</td>

          <td>
            <StatusBadge
              status={customer.status}
              variant={
                customer.status === 'ACTIVE'
                  ? 'active'
                  : 'inactive'
              }
            />
          </td>

          <td>
            {new Date(
              customer.createdAt,
            ).toLocaleDateString()}
          </td>

          {canEdit && (
            <td>
              <div className="row-actions">
                <Button
                  variant="action-edit"
                  onClick={() =>
                    onEdit(customer)
                  }
                  title="Edit"
                >
                  ✎
                </Button>

                <Button
                  variant="action-delete"
                  onClick={() =>
                    onDelete(customer)
                  }
                  title="Delete"
                >
                  ⌫
                </Button>
              </div>
            </td>
          )}
        </tr>
      ))}
    </DataTable>
  )
}
