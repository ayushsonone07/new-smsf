import type { DynamicRouteResponse } from '../../../api/dynamic-permission.api'
import { PermissionToggle } from '../../../components/permissions/PermissionToggle'

interface DynamicRoutesTableProps {
  routes: DynamicRouteResponse[]
  updatingRouteId?: string
  selectedRouteId?: string
  onSelectRoute?: (route: DynamicRouteResponse) => void
  onToggle: (
    route: DynamicRouteResponse,
    role: 'DEPARTMENT_HEAD' | 'DEPARTMENT_USER',
    enabled: boolean,
  ) => void
}

export function DynamicRoutesTable({
  routes,
  updatingRouteId,
  selectedRouteId,
  onSelectRoute,
  onToggle,
}: DynamicRoutesTableProps) {
  if (routes.length === 0) {
    return (
      <div className="empty-state">
        <div>⌗</div>
        <strong>No routes found</strong>
        <span>No routes are assigned to this department.</span>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>ROUTE</th>
            <th>ENABLE FOR HEAD</th>
            <th>ENABLE FOR USER</th>
          </tr>
        </thead>

        <tbody>
          {routes.map((route) => {
            const isUpdating = updatingRouteId === route.routeId

            return (
              <tr
                key={route.routeId}
                className={selectedRouteId === route.routeId ? 'is-selected-row' : ''}
              >
                <td>
                  <div className="feature-cell">
                    {onSelectRoute ? (
                      <button
                        type="button"
                        className="route-select-button"
                        aria-pressed={selectedRouteId === route.routeId}
                        onClick={() => onSelectRoute(route)}
                      >
                        {route.routeName}
                      </button>
                    ) : (
                      <strong>{route.routeName}</strong>
                    )}
                    <span>{route.routeId}</span>
                  </div>
                </td>
                <td>
                  <PermissionToggle
                    checked={route.enableHead === true}
                    disabled={isUpdating}
                    label={`Toggle ${route.routeName} for department head`}
                    onChange={(enabled) =>
                      onToggle(route, 'DEPARTMENT_HEAD', enabled)
                    }
                  />
                </td>
                <td>
                  <PermissionToggle
                    checked={route.enableUser === true}
                    disabled={isUpdating}
                    label={`Toggle ${route.routeName} for department user`}
                    onChange={(enabled) =>
                      onToggle(route, 'DEPARTMENT_USER', enabled)
                    }
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
