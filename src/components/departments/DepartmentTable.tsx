import type { Department } from '../../features/departments/types/department.types'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { StatusBadge } from '../common/StatusBadge'

interface DepartmentTableProps {
  departments: Department[]
  onEdit: (department: Department) => void
  onDelete: (department: Department) => void
  onViewFeatures: (department: Department) => void
  onViewDashboard: (department: Department) => void
  /** Id of the department whose login token is being generated. */
  loggingInId?: string | null
}

const columns = [
  { key: 'department', title: 'DEPARTMENT' },
  { key: 'username', title: 'LOGIN USERNAME' },
  { key: 'email', title: 'EMAIL' },
  { key: 'status', title: 'STATUS' },
  { key: 'created', title: 'CREATED' },
  {
    key: 'actions',
    title: 'ACTIONS',
    className: 'actions-heading',
  },
]

export function DepartmentTable({
  departments,
  onEdit,
  onDelete,
  onViewFeatures,
  onViewDashboard,
  loggingInId = null,
}: DepartmentTableProps) {
  if (departments.length === 0) {
    return (
      <EmptyState
        icon="⌕"
        title="No departments found"
        description="Try changing your search or create a new department."
      />
    )
  }

  return (
    <DataTable columns={columns}>
      {departments.map((department) => (
        <tr
          key={department.id}
          className="clickable-row"
          onClick={() =>
            onViewFeatures(department)
          }
        >
          <td>
            <div className="department-cell">
              <div className="department-icon">
                ▦
              </div>

              <div>
                <strong>{department.name}</strong>

                <span>Department account</span>
              </div>
            </div>
          </td>

          <td>
            <span className="username">
              {department.username}
            </span>
          </td>

          <td>{department.email}</td>

          <td>
            <StatusBadge
              status={department.status}
              variant={
                department.status === 'ACTIVE'
                  ? 'active'
                  : 'inactive'
              }
            />
          </td>

          <td>
            {new Date(
              department.createdAt,
            ).toLocaleDateString()}
          </td>

          <td>
            <div className="row-actions">
              <Button
                variant="action-dashboard"
                disabled={loggingInId !== null}
                onClick={(event) => {
                  event.stopPropagation()
                  onViewDashboard(department)
                }}
                title="Login as this department"
                aria-label={`Login as ${department.name}`}
              >
                {loggingInId === department.id ? '…' : '⌂'}
              </Button>

              <Button
                variant="action-features"
                onClick={(event) => {
                  event.stopPropagation()
                  onViewFeatures(department)
                }}
                title="View Features"
              >
                ⚙
              </Button>

              <Button
                variant="action-edit"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(department)
                }}
                title="Edit"
              >
                ✎
              </Button>

              <Button
                variant="action-delete"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(department)
                }}
                title="Delete"
              >
                ⌫
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  )
}
