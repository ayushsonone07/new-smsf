import { useState } from 'react'
import { accessLabel } from '../../api/my-access.api'
import type { MyColumnPermission } from '../../api/my-access.api'
import {
  useMyColumnPermissions,
  useMyRoutes,
} from '../../features/permissions/hooks/useMyAccess'
import { DataTable } from '../ui/DataTable'
import { ErrorState } from '../ui/ErrorState'
import { FilterTabs } from '../ui/FilterTabs'
import { LoadingState } from '../ui/LoadingState'
import { Pill } from '../ui/Pill'
import type { PillTone } from '../ui/Pill'

type AccessTab = 'routes' | 'columns'

function accessTone(
  access: string | null | undefined,
): PillTone {
  if (access === '12') {
    return 'success'
  }

  if (access === '1') {
    return 'info'
  }

  if (access === '2') {
    return 'warning'
  }

  return 'neutral'
}

/**
 * "Show all (R/C)" — the signed-in user's own routes and
 * column permissions side by side, each in its own tab.
 * Both lists come from the session-scoped backend reads
 * (`GET /api/auth/routs`, `GET /api/auth/my-column-permissions`).
 */
export function MyAccessPanel() {
  const [tab, setTab] = useState<AccessTab>('routes')

  const routesQuery = useMyRoutes()
  const columnsQuery = useMyColumnPermissions()

  const routes = routesQuery.data ?? []
  const columns = columnsQuery.data ?? []

  return (
    <div>
      <FilterTabs<AccessTab>
        ariaLabel="My routes and columns"
        value={tab}
        onChange={setTab}
        tabs={[
          {
            value: 'routes',
            label: 'Routes',
            count: routesQuery.data?.length,
          },
          {
            value: 'columns',
            label: 'Columns',
            count: columnsQuery.data?.length,
          },
        ]}
      />

      {tab === 'routes' ? (
        routesQuery.isPending ? (
          <LoadingState message="Loading your routes..." />
        ) : routesQuery.isError ? (
          <ErrorState
            title="Unable to load routes"
            message={routesQuery.error.message}
            onRetry={() => routesQuery.refetch()}
          />
        ) : (
          <DataTable
            columns={[
              {
                key: 'routeName',
                title: 'Route name',
                render: (row) => <strong>{row.routeName}</strong>,
              },
              {
                key: 'routeId',
                title: 'Route ID',
                render: (row) => (
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                    }}
                  >
                    {row.routeId}
                  </span>
                ),
              },
            ]}
            rows={routes}
            rowKey={(row) => row.routeId}
            emptyState="No routes assigned to your role yet."
          />
        )
      ) : columnsQuery.isPending ? (
        <LoadingState message="Loading your columns..." />
      ) : columnsQuery.isError ? (
        <ErrorState
          title="Unable to load columns"
          message={columnsQuery.error.message}
          onRetry={() => columnsQuery.refetch()}
        />
      ) : (
        <DataTable<MyColumnPermission>
          columns={[
            {
              key: 'columnName',
              title: 'Column name',
              render: (row) => (
                <strong>{row.columnName || row.columnId}</strong>
              ),
            },
            {
              key: 'access',
              title: 'Access',
              render: (row) => (
                <Pill tone={accessTone(row.access)} size="sm">
                  {accessLabel(row.access)}
                </Pill>
              ),
            },
            {
              key: 'columnId',
              title: 'Column ID',
              render: (row) => (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                  }}
                >
                  {row.columnId}
                </span>
              ),
            },
          ]}
          rows={columns}
          rowKey={(row) => row.columnId}
          emptyState="No columns configured for your role yet."
        />
      )}
    </div>
  )
}
