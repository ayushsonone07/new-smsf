import type {
  FeaturePermission,
  PermissionLevel,
  UpdateFeaturePermissionRequest,
} from '../types/permission.types'

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

export function FeaturePermissionsTable({
  features,
  updatingFeatureId,
  onUpdate,
}: FeaturePermissionsTableProps) {
  if (features.length === 0) {
    return (
      <div className="empty-state">
        <div>⌗</div>

        <strong>No features found</strong>

        <span>
          This department has no features assigned.
        </span>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>FEATURE</th>
            <th>ENABLE / DISABLE</th>
            <th>ROLE A</th>
            <th>ROLE B</th>
          </tr>
        </thead>

        <tbody>
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
                  <button
                    type="button"
                    role="switch"
                    aria-checked={feature.enabled}
                    aria-label={`Toggle ${feature.name}`}
                    className={`toggle-switch ${
                      feature.enabled ? 'on' : ''
                    }`}
                    disabled={isUpdating}
                    onClick={() =>
                      onUpdate(feature.id, {
                        enabled: !feature.enabled,
                      })
                    }
                  >
                    <span />
                  </button>
                </td>

                <td>
                  <select
                    className="permission-select"
                    aria-label={`${feature.name} role A permission`}
                    value={
                      feature.roleAPermission
                    }
                    disabled={
                      isUpdating || !feature.enabled
                    }
                    onChange={(event) =>
                      onUpdate(feature.id, {
                        roleAPermission: event.target
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
                  </select>
                </td>

                <td>
                  <select
                    className="permission-select"
                    aria-label={`${feature.name} role B permission`}
                    value={
                      feature.roleBPermission
                    }
                    disabled={
                      isUpdating || !feature.enabled
                    }
                    onChange={(event) =>
                      onUpdate(feature.id, {
                        roleBPermission: event.target
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
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
