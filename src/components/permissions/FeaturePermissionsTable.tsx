import type {
  FeaturePermission,
  PermissionLevel,
  UpdateFeaturePermissionRequest,
} from '../../features/permissions/types/permission.types'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { Select } from '../ui/Select'
import { Icon } from '../head/shared/Icon'
import { PermissionToggle } from './PermissionToggle'

interface FeaturePermissionsTableProps {
  features: FeaturePermission[]
  updatingFeatureId?: string
  onUpdate: (id: string, data: UpdateFeaturePermissionRequest) => void
  onEdit?: (feature: FeaturePermission) => void
  onDelete?: (feature: FeaturePermission) => void
  onMove?: (feature: FeaturePermission, direction: 'up' | 'down') => void
}

const PERMISSION_OPTIONS: Array<{ value: PermissionLevel; label: string }> = [
  { value: 'CAN_READ', label: 'Can Read' },
  { value: 'CAN_EDIT', label: 'Can Edit' },
]

const columns = [
  { key: 'order', title: 'ORDER' },
  { key: 'feature', title: 'MENU ITEM' },
  { key: 'enabled', title: 'ENABLE / DISABLE' },
  { key: 'roleA', title: 'ROLE A' },
  { key: 'roleB', title: 'ROLE B' },
  { key: 'actions', title: 'ACTIONS', className: 'actions-heading' },
]

/**
 * Admin table: every row is one sidebar item of the
 * department head panel — reorder, toggle, set role
 * access, edit or delete.
 */
export function FeaturePermissionsTable({
  features,
  updatingFeatureId,
  onUpdate,
  onEdit,
  onDelete,
  onMove,
}: FeaturePermissionsTableProps) {
  if (features.length === 0) {
    return (
      <EmptyState
        icon="⌗"
        title="No features found"
        description="Add a feature to give this department a menu item."
      />
    )
  }

  return (
    <DataTable columns={columns}>
      {features.map((feature, index) => {
        const isUpdating = updatingFeatureId === feature.id

        return (
          <tr key={feature.id} className={feature.enabled ? '' : 'is-disabled-row'}>
            <td>
              <div className="order-controls">
                <button
                  type="button"
                  className="order-button"
                  aria-label="Move up"
                  disabled={index === 0 || !onMove}
                  onClick={() => onMove?.(feature, 'up')}
                >
                  ▲
                </button>
                <span>{index + 1}</span>
                <button
                  type="button"
                  className="order-button"
                  aria-label="Move down"
                  disabled={index === features.length - 1 || !onMove}
                  onClick={() => onMove?.(feature, 'down')}
                >
                  ▼
                </button>
              </div>
            </td>

            <td>
              <div className="feature-cell feature-cell--icon">
                <span className="feature-icon">
                  <Icon name={feature.icon} size={16} />
                </span>
                <div>
                  <strong>{feature.name}</strong>
                  <span>{feature.description}</span>
                  <code className="feature-path">/head/{feature.slug}</code>
                </div>
              </div>
            </td>

            <td>
              <PermissionToggle
                checked={feature.enabled}
                disabled={isUpdating}
                label={`Toggle ${feature.name}`}
                onChange={(checked) => onUpdate(feature.id, { enabled: checked })}
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
                    roleAPermission: event.target.value as PermissionLevel,
                  })
                }
              >
                {PERMISSION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
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
                    roleBPermission: event.target.value as PermissionLevel,
                  })
                }
              >
                {PERMISSION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </td>

            <td>
              <div className="row-actions">
                {onEdit ? (
                  <button
                    type="button"
                    className="action-button edit"
                    title="Edit"
                    aria-label={`Edit ${feature.name}`}
                    onClick={() => onEdit(feature)}
                  >
                    ✎
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    className="action-button delete"
                    title="Delete"
                    aria-label={`Delete ${feature.name}`}
                    onClick={() => onDelete(feature)}
                  >
                    🗑
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        )
      })}
    </DataTable>
  )
}
