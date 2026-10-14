import { Fragment, useState } from 'react'
import type { Department } from '../../features/departments/types/department.types'
import { DepartmentRoutesDropdown } from '../../features/departments/components/DepartmentRoutesDropdown'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'

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
  { key: 'role', title: 'ROLE' },
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
  const [expandedDepartmentId, setExpandedDepartmentId] = useState<string | null>(null)

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
        <Fragment key={department.id}>
          <tr className="department-account-row">
            <td>
              <div className="department-cell">
                <div className="department-icon">
                  ▦
                </div>

                <div>
                  <button
                    type="button"
                    className="department-expand-button"
                    aria-expanded={expandedDepartmentId === department.id}
                    onClick={() => setExpandedDepartmentId(
                      (current) => current === department.id ? null : department.id,
                    )}
                  >
                    <strong>{department.type || 'Unknown'}</strong>
                    <span className="department-expand-chevron" aria-hidden="true">
                      {expandedDepartmentId === department.id ? '⌄' : '›'}
                    </span>
                  </button>

                  <span>{department.name}</span>
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
              {department.role ? (
                <span className="role-badge">
                  {department.role}
                </span>
              ) : (
                <span className="text-muted">—</span>
              )}
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
          {expandedDepartmentId === department.id ? (
            <tr className="department-routes-row">
              <td colSpan={columns.length}>
                {department.type ? (
                  <DepartmentRoutesDropdown departmentType={department.type} />
                ) : (
                  <p className="department-route-state">
                    This department does not have a department type configured.
                  </p>
                )}
              </td>
            </tr>
          ) : null}
        </Fragment>
      ))}
    </DataTable>
  )
}
