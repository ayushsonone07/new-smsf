import type {
  DynamicColumnResponse,
  DynamicRouteResponse,
} from '../../../api/dynamic-permission.api'
import { PermissionToggle } from '../../../components/permissions/PermissionToggle'
import { Card } from '../../../components/ui/Card'
import { Select } from '../../../components/ui/Select'

interface DynamicRouteColumnsCardProps {
  route: DynamicRouteResponse
  columns: DynamicColumnResponse[]
  updatingColumnId?: string
  updatingPermissionColumnId?: string
  onAddColumn: () => void
  onToggleColumn: (
    column: DynamicColumnResponse,
    role: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    enabled: boolean,
  ) => void
  onPermissionChange: (
    column: DynamicColumnResponse,
    role: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    access: '1' | '12',
  ) => void
}

export function DynamicRouteColumnsCard({
  route,
  columns,
  updatingColumnId,
  updatingPermissionColumnId,
  onAddColumn,
  onToggleColumn,
  onPermissionChange,
}: DynamicRouteColumnsCardProps) {
  return (
    <Card>
      <div className="table-toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h2>{route.routeName}</h2>
            <span className="status-badge">{columns.length} columns</span>
          </div>
          <p>Components and columns configured for this route.</p>
        </div>

        <button type="button" className="secondary-button" onClick={onAddColumn}>
          + Add Dynamic Column
        </button>
      </div>

      {columns.length === 0 ? (
        <div className="empty-state">
          <div>⌗</div>
          <strong>No columns found</strong>
          <span>No component or column is linked to this route yet.</span>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>COLUMN / COMPONENT</th>
                <th>ENABLE FOR HEAD</th>
                <th>ENABLE FOR USER</th>
                <th>HEAD ACCESS</th>
                <th>USER ACCESS</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => {
                const isUpdating = updatingColumnId === column.columnId
                const isUpdatingPermission =
                  updatingPermissionColumnId === column.columnId
                const headAccess =
                  column.roleAPermission === '12' ||
                  column.roleAPermission === '2' ||
                  column.roleAPermission === 'CAN_EDIT'
                    ? '12'
                    : '1'
                const userAccess =
                  column.roleBPermission === '12' ||
                  column.roleBPermission === '2' ||
                  column.roleBPermission === 'CAN_EDIT'
                    ? '12'
                    : '1'
                return (
                  <tr key={column.columnId}>
                    <td>
                      <div className="feature-cell">
                        <strong>{column.columnName}</strong>
                        <span>{column.columnId}</span>
                      </div>
                    </td>
                    <td>
                      <PermissionToggle
                        checked={column.enableHead === true}
                        disabled={isUpdating}
                        label={`Toggle ${column.columnName} for department head`}
                        onChange={(enabled) =>
                          onToggleColumn(column, 'DEPARTMENT_HEAD', enabled)
                        }
                      />
                    </td>
                    <td>
                      <PermissionToggle
                        checked={column.enableUser === true}
                        disabled={isUpdating}
                        label={`Toggle ${column.columnName} for department user`}
                        onChange={(enabled) =>
                          onToggleColumn(column, 'DEPARTMENT_USER', enabled)
                        }
                      />
                    </td>
                    <td>
                      <Select
                        className="permission-select"
                        aria-label={`${column.columnName} head read write access`}
                        value={headAccess}
                        disabled={isUpdatingPermission || column.enableHead !== true}
                        onChange={(event) =>
                          onPermissionChange(
                            column,
                            'DEPARTMENT_HEAD',
                            event.target.value as '1' | '12',
                          )
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </td>
                    <td>
                      <Select
                        className="permission-select"
                        aria-label={`${column.columnName} user read write access`}
                        value={userAccess}
                        disabled={isUpdatingPermission || column.enableUser !== true}
                        onChange={(event) =>
                          onPermissionChange(
                            column,
                            'DEPARTMENT_USER',
                            event.target.value as '1' | '12',
                          )
                        }
                      >
                        <option value="1">Read Only</option>
                        <option value="12">Read + Write</option>
                      </Select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
