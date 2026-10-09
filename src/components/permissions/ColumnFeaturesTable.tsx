import type {
  FeaturePermission,
  PermissionLevel,
  UpdateFeaturePermissionRequest,
} from '../../features/permissions/types/permission.types'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { Select } from '../ui/Select'
import { PermissionToggle } from './PermissionToggle'

interface ColumnFeaturesTableProps {
  features: FeaturePermission[]
  updatingFeatureId?: string
  onUpdate: (
    id: string,
    data: UpdateFeaturePermissionRequest,
  ) => void
}

const PERMISSION_OPTIONS: Array<{
  value: PermissionLevel
  label: string
}> = [
  { value: 'CAN_READ', label: 'Can Read' },
  { value: 'CAN_EDIT', label: 'Can Edit' },
]

const columns = [
  { key: 'column', title: 'COLUMN' },
  { key: 'enabled', title: 'ENABLE / DISABLE' },
  { key: 'userVisible', title: 'SHOW TO USER' },
  { key: 'roleA', title: 'ROLE A (HEAD)' },
  { key: 'roleB', title: 'ROLE B (USER)' },
]

/**
 * Admin table for column features: one row per table column
 * of the Customer List / Department Users screens. Switching
 * a row off hides that column in the head panel.
 */
export function ColumnFeaturesTable({
  features,
  updatingFeatureId,
  onUpdate,
}: ColumnFeaturesTableProps) {
  if (features.length === 0) {
    return (
      <EmptyState
        icon="⌗"
        title="No columns found"
        description="Columns of this table are seeded with the department."
      />
    )
  }

  return (
    <DataTable columns={columns}>
      {features.map((feature) => {
        const isUpdating = updatingFeatureId === feature.id

        return (
          <tr
            key={feature.id}
            className={feature.enabled ? '' : 'is-disabled-row'}
          >
            <td>
              <div className="feature-cell">
                <div>
                  <strong>{feature.name}</strong>
                  <span>{feature.description}</span>
                  <code className="feature-path">
                    {feature.columnKey}
                  </code>
                </div>
              </div>
            </td>

            <td>
              <PermissionToggle
                checked={feature.enabled}
                disabled={isUpdating}
                label={`Toggle ${feature.name} column`}
                onChange={(checked) =>
                  onUpdate(feature.id, { enabled: checked })
                }
              />
            </td>

            <td>
              <PermissionToggle
                checked={feature.userVisible !== false}
                disabled={isUpdating || !feature.enabled}
                label={`Show ${feature.name} column to user`}
                onChange={(checked) =>
                  onUpdate(feature.id, { userVisible: checked })
                }
              />
            </td>

            <td>
              <Select
                className="permission-select"
                aria-label={`${feature.name} role A permission`}
                value={feature.roleAPermission}
                disabled={isUpdating || !feature.enabled}
                onChange={(event) =>
                  onUpdate(feature.id, {
                    roleAPermission:
                      event.target.value as PermissionLevel,
                  })
                }
              >
                {PERMISSION_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </Select>
            </td>

            <td>
              <Select
                className="permission-select"
                aria-label={`${feature.name} role B permission`}
                value={feature.roleBPermission}
                disabled={isUpdating || !feature.enabled}
                onChange={(event) =>
                  onUpdate(feature.id, {
                    roleBPermission:
                      event.target.value as PermissionLevel,
                  })
                }
              >
                {PERMISSION_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </Select>
            </td>
          </tr>
        )
      })}
    </DataTable>
  )
}
