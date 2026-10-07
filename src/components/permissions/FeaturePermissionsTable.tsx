import type {
  FeaturePermission,
  PermissionLevel,
  UpdateFeaturePermissionRequest,
} from '../../features/permissions/types/permission.types'
import { DataTable } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { Select } from '../ui/Select'
import { PermissionToggle } from './PermissionToggle'

interface FeaturePermissionsTableProps {
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
  { key: 'feature', title: 'FEATURE' },
  { key: 'enabled', title: 'ENABLE / DISABLE' },
  { key: 'roleA', title: 'ROLE A' },
  { key: 'roleB', title: 'ROLE B' },
]

export function FeaturePermissionsTable({
  features,
  updatingFeatureId,
  onUpdate,
}: FeaturePermissionsTableProps) {
  if (features.length === 0) {
    return (
      <EmptyState
        icon="⌗"
        title="No features found"
        description="This department has no features assigned."
      />
    )
  }

  return (
    <DataTable columns={columns}>
      {features.map((feature) => {
        const isUpdating =
          updatingFeatureId === feature.id

        return (
          <tr key={feature.id}>
            <td>
              <div className="feature-cell">
                <strong>{feature.name}</strong>

                <span>
                  {feature.description}
                </span>
              </div>
            </td>

            <td>
              <PermissionToggle
                checked={feature.enabled}
                disabled={isUpdating}
                label={`Toggle ${feature.name}`}
                onChange={(checked) =>
                  onUpdate(feature.id, {
                    enabled: checked,
                  })
                }
              />
            </td>

            <td>
              <Select
                className="permission-select"
                aria-label={`${feature.name} role A permission`}
                value={feature.roleAPermission}
                disabled={
                  isUpdating || !feature.enabled
                }
                onChange={(event) =>
                  onUpdate(feature.id, {
                    roleAPermission:
                      event.target
                        .value as PermissionLevel,
                  })
                }
              >
                {PERMISSION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </Select>
            </td>

            <td>
              <Select
                className="permission-select"
                aria-label={`${feature.name} role B permission`}
                value={feature.roleBPermission}
                disabled={
                  isUpdating || !feature.enabled
                }
                onChange={(event) =>
                  onUpdate(feature.id, {
                    roleBPermission:
                      event.target
                        .value as PermissionLevel,
                  })
                }
              >
                {PERMISSION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </Select>
            </td>
          </tr>
        )
      })}
    </DataTable>
  )
}
