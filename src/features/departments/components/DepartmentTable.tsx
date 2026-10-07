import type { Department } from '../types/department.types'

interface DepartmentTableProps {
  departments: Department[]
  onEdit: (department: Department) => void
  onDelete: (department: Department) => void
  onViewFeatures: (department: Department) => void
}

export function DepartmentTable({
  departments,
  onEdit,
  onDelete,
  onViewFeatures,
}: DepartmentTableProps) {
  if (departments.length === 0) {
    return (
      <div className="empty-state">
        <div>⌕</div>
        <strong>No departments found</strong>
        <span>
          Try changing your search or create a new department.
        </span>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>DEPARTMENT</th>
            <th>LOGIN USERNAME</th>
            <th>EMAIL</th>
            <th>STATUS</th>
            <th>CREATED</th>
            <th className="actions-heading">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
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
                <span
                  className={`status-badge ${
                    department.status === 'ACTIVE'
                      ? 'active'
                      : 'inactive'
                  }`}
                >
                  <span />
                  {department.status}
                </span>
              </td>

              <td>
                {new Date(
                  department.createdAt,
                ).toLocaleDateString()}
              </td>

              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="action-button features"
                    onClick={(event) => {
                      event.stopPropagation()
                      onViewFeatures(department)
                    }}
                    title="View Features"
                  >
                    ⚙
                  </button>

                  <button
                    type="button"
                    className="action-button edit"
                    onClick={(event) => {
                      event.stopPropagation()
                      onEdit(department)
                    }}
                    title="Edit"
                  >
                    ✎
                  </button>

                  <button
                    type="button"
                    className="action-button delete"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(department)
                    }}
                    title="Delete"
                  >
                    ⌫
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}