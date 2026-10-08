import type { Customer } from '../../features/departments/types/customer.types'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { StatusBadge } from '../common/StatusBadge'

/** Column keys an admin can switch off from the permissions page. */
export type CustomerColumnKey =
  | 'customer'
  | 'company'
  | 'phone'
  | 'status'
  | 'created'
  | 'actions'

interface CustomerTableProps {
  customers: Customer[]
  canEdit: boolean
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
  /** Column keys disabled by the admin — rendered nowhere. */
  hiddenColumns?: string[]
}

export function CustomerTable({
  customers,
  canEdit,
  onEdit,
  onDelete,
  hiddenColumns,
}: CustomerTableProps) {
  const visible = (key: CustomerColumnKey) =>
    !hiddenColumns?.includes(key)

  if (customers.length === 0) {
    return (
      <EmptyState
        icon="♙"
        title="No customers found"
        description="Try changing your search or add a new customer."
      />
    )
  }

  const showActions = visible('actions') && canEdit

  const columns = [
    ...(visible('customer')
      ? [{ key: 'customer', title: 'CUSTOMER' }]
      : []),
    ...(visible('company')
      ? [{ key: 'company', title: 'COMPANY' }]
      : []),
    ...(visible('phone')
      ? [{ key: 'phone', title: 'PHONE' }]
      : []),
    ...(visible('status')
      ? [{ key: 'status', title: 'STATUS' }]
      : []),
    ...(visible('created')
      ? [{ key: 'created', title: 'CREATED' }]
      : []),
    ...(showActions
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
          {visible('customer') ? (
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
          ) : null}

          {visible('company') ? (
            <td>{customer.company}</td>
          ) : null}

          {visible('phone') ? (
            <td>{customer.phone}</td>
          ) : null}

          {visible('status') ? (
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
          ) : null}

          {visible('created') ? (
            <td>
              {new Date(
                customer.createdAt,
              ).toLocaleDateString()}
            </td>
          ) : null}

          {showActions ? (
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
          ) : null}
        </tr>
      ))}
    </DataTable>
  )
}
