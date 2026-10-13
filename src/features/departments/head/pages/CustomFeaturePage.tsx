import { useMemo } from 'react'
import { getSession } from '../../../../app/auth/session'
import {
  useDynamicColumns,
  useDynamicRoutes,
} from '../../../permissions/hooks/useDynamicPermissions'
import { isColumnBelongingToRoute, isRouteMatch } from '../../../permissions/hooks/useDepartmentRoutePermissions'
import { resolveDeptFromPath } from '../utils/routeUtils'
import type { FeaturePermission } from '../../../permissions/types/permission.types'

/**
 * Dynamic screen for admin-created custom routes.
 * Displays any dynamic columns / components linked to this route in `access_customer_columns`.
 */
export function CustomFeaturePage({ feature }: { feature: FeaturePermission }) {
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const departmentType = session?.user.departmentType || deptFromUrl || 'ONBOARDING_DEPARTMENT'
  const isHead = session?.user.role !== 'USER'

  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)

  const matchedRoute = useMemo(() => {
    return (routesQuery.data ?? []).find((r) => isRouteMatch(r, feature.slug))
  }, [routesQuery.data, feature.slug])

  const routeColumns = useMemo(() => {
    const allCols = columnsQuery.data ?? []
    if (!matchedRoute) return []
    return allCols.filter((col) => {
      if (col.visibility === false || (col.visibility as unknown) === 0) {
        return false
      }
      if (isHead && (col.enableHead === false || (col.enableHead as unknown) === 0)) {
        return false
      }
      if (!isHead && (col.enableUser === false || (col.enableUser as unknown) === 0)) {
        return false
      }
      return isColumnBelongingToRoute(col, matchedRoute)
    })
  }, [columnsQuery.data, matchedRoute, isHead])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#2563eb',
            }}
          >
            {departmentType} • Dynamic Workspace
          </span>
          <h2 style={{ margin: '0.25rem 0', fontSize: '1.25rem', color: '#0f172a' }}>
            {feature.name}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            {matchedRoute
              ? `Connected to dynamic route "${matchedRoute.routeName}" (ID: ${matchedRoute.routeId})`
              : feature.description}
          </p>
        </div>

        <div
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '999px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}
        >
          {routeColumns.length} Active Dynamic Column{routeColumns.length === 1 ? '' : 's'}
        </div>
      </div>

      {routeColumns.length > 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem 1.5rem',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#1e293b' }}>
            Configured Route Columns &amp; Fields
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {routeColumns.map((col) => {
              const perm = isHead ? col.roleAPermission : col.roleBPermission
              const canEdit =
                perm === 'CAN_EDIT' || col.readWriteAccess === '12' || col.readWriteAccess === '2'
              return (
                <div
                  key={col.columnId}
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                      {col.columnName}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: canEdit ? '#dcfce7' : '#f1f5f9',
                        color: canEdit ? '#166534' : '#475569',
                      }}
                    >
                      {canEdit ? 'Read & Edit' : 'Read Only'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Column ID: <code>{col.columnId}</code>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="hpage-coming-soon" role="status">
          <svg
            className="hpage-coming-soon__illustration"
            viewBox="0 0 240 180"
            role="img"
            aria-label="Dynamic route ready"
          >
            <circle cx="120" cy="90" r="76" fill="#e8efff" />
            <path
              d="M53 131h134"
              fill="none"
              stroke="#b9c8e8"
              strokeLinecap="round"
              strokeWidth="5"
            />
            <rect
              x="74"
              y="51"
              width="92"
              height="69"
              rx="10"
              fill="#fff"
              stroke="#2459e0"
              strokeWidth="5"
            />
            <path d="M95 120h50l8 12H87l8-12Z" fill="#2459e0" />
            <path
              d="m104 78 12 12-12 12M122 102h19"
              fill="none"
              stroke="#ffc629"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
            <circle cx="177" cy="50" r="20" fill="#ffc629" />
            <path
              d="m168 50 6 6 12-13"
              fill="none"
              stroke="#172554"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
            />
          </svg>

          <h2>{feature.name} Workspace Ready</h2>
          <p>
            You can attach dynamic columns and components to this route from{' '}
            <strong>Admin → Department Features → Add Dynamic Column</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
