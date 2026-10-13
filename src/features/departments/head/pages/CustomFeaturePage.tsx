import { useMemo } from 'react'
import { getSession } from '../../../../app/auth/session'
import {
  useDynamicColumns,
  useDynamicRoutes,
} from '../../../permissions/hooks/useDynamicPermissions'
import { isRouteMatch } from '../../../permissions/hooks/useDepartmentRoutePermissions'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { useDepartmentCustomerRows } from '../../hooks/useDepartmentUsersList'
import type { DepartmentCustomerRowItem } from '../../../../api/department-users.api'
import { applyDynamicColumnOrder, readDynamicColumnOrder } from '../../../../utils/dynamicColumnOrder'

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function valueForColumn(row: DepartmentCustomerRowItem, columnName: string): unknown {
  const nested = row.customerDetails && typeof row.customerDetails === 'object'
    ? row.customerDetails
    : {}
  const values = { ...nested, ...row } as Record<string, unknown>
  const target = normalizedKey(columnName)
  const directKey = Object.keys(values).find((key) => normalizedKey(key) === target)
  if (directKey) return values[directKey]

  const aliases: Record<string, string[]> = {
    customer: ['ownerName', 'customerName', 'name'],
    customername: ['ownerName', 'customerName', 'name'],
    business: ['businessName', 'brandName'],
    phone: ['phoneNumber', 'phone', 'contact'],
    number: ['phoneNumber', 'phone', 'contact'],
    email: ['email'],
    status: ['status', 'onboardingStatus'],
    billupload: ['generatedBillInfo', 'billUrl', 'billingLink', 'paymentLinkSS'],
  }
  for (const alias of aliases[target] ?? []) {
    if (values[alias] !== null && values[alias] !== undefined && values[alias] !== '') {
      return values[alias]
    }
  }
  return '—'
}

/**
 * Dynamic screen for admin-created custom routes.
 * Displays any dynamic columns / components linked to this route in `access_customer_columns`.
 */
export function CustomFeaturePage({ feature }: { feature: FeaturePermission }) {
  const session = getSession()
  const departmentType = session?.user.departmentType || 'ONBOARDING_DEPARTMENT'
  const isHead = session?.user.role !== 'USER'

  const routesQuery = useDynamicRoutes(departmentType)
  const columnsQuery = useDynamicColumns(departmentType)
  const rowsQuery = useDepartmentCustomerRows(
    { page: 0, size: 100, compatible: true },
    { enabled: Boolean(session && feature.slug) },
  )

  const matchedRoute = useMemo(() => {
    return (routesQuery.data ?? []).find((r) => isRouteMatch(r, feature.slug))
  }, [routesQuery.data, feature.slug])

  const routeColumns = useMemo(() => {
    const allCols = columnsQuery.data ?? []
    if (!matchedRoute) return []
    const visibleColumns = allCols.filter((col) => {
      if (col.visibility === false || (col.visibility as unknown) === 0) {
        return false
      }
      if (isHead && (col.enableHead === false || (col.enableHead as unknown) === 0)) {
        return false
      }
      if (!isHead && (col.enableUser === false || (col.enableUser as unknown) === 0)) {
        return false
      }
      if (
        col.routeId === matchedRoute.routeId ||
        col.routesType === matchedRoute.routeId
      ) {
        return true
      }
      const colRoute = (col.routeName || '').trim().toLowerCase()
      const targetRoute = (matchedRoute.routeName || '').trim().toLowerCase()
      return Boolean(colRoute && colRoute === targetRoute)
    })
    return applyDynamicColumnOrder(
      visibleColumns,
      readDynamicColumnOrder(departmentType, matchedRoute.routeId),
    )
  }, [columnsQuery.data, matchedRoute, isHead, departmentType])

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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Route Data</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {rowsQuery.data?.totalElements ?? 0} row{rowsQuery.data?.totalElements === 1 ? '' : 's'}
            </span>
          </div>

          {rowsQuery.isPending ? (
            <div className="loading-state">Loading rows...</div>
          ) : rowsQuery.isError ? (
            <div className="error-state">
              <strong>Unable to load route rows</strong>
              <p>{rowsQuery.error.message}</p>
              <button className="primary-button" onClick={() => rowsQuery.refetch()}>Try Again</button>
            </div>
          ) : (
            <div className="table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {routeColumns.map((col) => <th key={col.columnId}>{col.columnName}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(rowsQuery.data?.customers ?? []).length > 0 ? (
                    rowsQuery.data?.customers.map((row, index) => (
                      <tr key={String(row.customerId ?? row.id ?? index)}>
                        {routeColumns.map((col) => (
                          <td key={col.columnId}>{displayValue(valueForColumn(row, col.columnName))}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={routeColumns.length} className="table-empty-cell">
                        No rows found for this department.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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
