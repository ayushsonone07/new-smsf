import { useState } from 'react'
import { useAdminDepartments } from '../../features/departments/hooks/useAdminDepartments'
import { Button } from '../ui/Button'
import { DataTable } from '../ui/DataTable'
import { ErrorState } from '../ui/ErrorState'
import { FilterTabs } from '../ui/FilterTabs'
import { LoadingState } from '../ui/LoadingState'
import { Pill } from '../ui/Pill'

type HeadFilter = 'all' | 'heads' | 'members'

const PAGE_SIZE = 10

function isHeadParam(filter: HeadFilter): boolean | undefined {
  if (filter === 'heads') {
    return true
  }

  if (filter === 'members') {
    return false
  }

  return undefined
}

/**
 * "Show all Department" — every department user from
 * `GET /api/auth/admin/departments`, with head/member tabs
 * and server-side pagination.
 */
export function AllDepartmentsPanel() {
  const [filter, setFilter] = useState<HeadFilter>('all')
  const [page, setPage] = useState(0)

  const departmentsQuery = useAdminDepartments({
    page,
    size: PAGE_SIZE,
    isHead: isHeadParam(filter),
  })

  function handleFilterChange(next: HeadFilter) {
    setFilter(next)
    setPage(0)
  }

  const rows = departmentsQuery.data?.data ?? []
  const totalPages = departmentsQuery.data?.totalPage ?? 1
  const totalElements = departmentsQuery.data?.totalElements ?? 0

  return (
    <div>
      <FilterTabs<HeadFilter>
        ariaLabel="Filter departments by headship"
        value={filter}
        onChange={handleFilterChange}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'heads', label: 'Heads' },
          { value: 'members', label: 'Members' },
        ]}
        trailing={
          !departmentsQuery.isPending && !departmentsQuery.isError ? (
            <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>
              {totalElements} total
            </span>
          ) : undefined
        }
      />

      {departmentsQuery.isPending ? (
        <LoadingState message="Loading departments..." />
      ) : departmentsQuery.isError ? (
        <ErrorState
          title="Unable to load departments"
          message={departmentsQuery.error.message}
          onRetry={() => departmentsQuery.refetch()}
        />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'username',
                title: 'Username',
                render: (row) => (
                  <div>
                    <strong>{row.username}</strong>

                    <div
                      style={{ fontSize: '0.8rem', opacity: 0.7 }}
                    >
                      {row.email}
                    </div>
                  </div>
                ),
              },
              {
                key: 'departmentType',
                title: 'Department',
                render: (row) => row.departmentType ?? '—',
              },
              {
                key: 'role',
                title: 'Role',
                render: (row) => row.role ?? '—',
              },
              {
                key: 'isHead',
                title: 'Head',
                render: (row) => (
                  <Pill
                    tone={row.isHead ? 'success' : 'neutral'}
                    size="sm"
                  >
                    {row.isHead ? 'Head' : 'Member'}
                  </Pill>
                ),
              },
              {
                key: 'contact',
                title: 'Contact',
                render: (row) => row.contact ?? '—',
              },
            ]}
            rows={rows}
            rowKey={(row, index) =>
              row.departmentId
                ? `${row.departmentId}-${index}`
                : `${row.username}-${index}`
            }
            emptyState="No departments found for this filter."
          />

          <div
            className="table-pagination"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '0.75rem',
            }}
          >
            <Button
              variant="secondary"
              disabled={page <= 0 || departmentsQuery.isFetching}
              onClick={() => setPage((value) => Math.max(value - 1, 0))}
            >
              ← Prev
            </Button>

            <span>
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>

            <Button
              variant="secondary"
              disabled={
                page + 1 >= Math.max(totalPages, 1) ||
                departmentsQuery.isFetching
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Next →
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
