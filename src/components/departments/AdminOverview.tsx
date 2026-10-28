import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  getAdminDepartmentSummary,
  toLocalDateTimeParam,
  type AdminDepartmentSummary,
} from '../../api/admin-summary.api'
import './AdminOverview.css'

type RangePreset = '7d' | '30d' | '90d' | '365d'

const RANGE_OPTIONS: { value: RangePreset; label: string; days: number }[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '365d', label: 'Last 12 months', days: 365 },
]

const numberFormat = new Intl.NumberFormat('en-IN')

/** GOOGLE_DEPARTMENT -> Google */
function departmentLabel(type: string): string {
  return type
    .replace(/_DEPARTMENT$/i, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function useRange(preset: RangePreset) {
  return useMemo(() => {
    const days = RANGE_OPTIONS.find((option) => option.value === preset)?.days ?? 30
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)
    return { startDate: toLocalDateTimeParam(start), endDate: toLocalDateTimeParam(end) }
  }, [preset])
}

interface AdminOverviewProps {
  /** Department types from the department list (e.g. GOOGLE_DEPARTMENT) */
  departmentTypes: string[]
}

/**
 * SuperAdmin overview: company-wide service totals plus one card per department,
 * from GET /api/auth/admin/summary (the API SMSF's SuperAdmin dashboard uses).
 * Read-only — it does not change the department list below it.
 */
export function AdminOverview({ departmentTypes }: AdminOverviewProps) {
  const [preset, setPreset] = useState<RangePreset>('30d')
  const range = useRange(preset)

  const totalsQuery = useQuery({
    queryKey: ['admin-summary', preset, 'ALL'],
    queryFn: () => getAdminDepartmentSummary(range),
    staleTime: 60_000,
  })

  const departmentQueries = useQueries({
    queries: departmentTypes.map((departmentType) => ({
      queryKey: ['admin-summary', preset, departmentType],
      queryFn: () => getAdminDepartmentSummary({ ...range, departmentType }),
      staleTime: 60_000,
    })),
  })

  const departmentCards = departmentTypes
    .map((departmentType, index) => ({ departmentType, query: departmentQueries[index] }))
    .sort((a, b) => (b.query?.data?.totalCustomers ?? -1) - (a.query?.data?.totalCustomers ?? -1))

  const totals = totalsQuery.data
  const tiles: { label: string; value: number | undefined; tone: string }[] = [
    { label: 'Customers', value: totals?.totalCustomers, tone: 'ink' },
    { label: 'Pending', value: totals?.pendingServices, tone: 'amber' },
    { label: 'In progress', value: totals?.inProgressServices, tone: 'blue' },
    { label: 'Completed', value: totals?.completedServices, tone: 'green' },
    { label: 'Cancelled', value: totals?.cancelledServices, tone: 'slate' },
    { label: 'Delayed', value: totals?.delayedServices, tone: 'red' },
  ]

  return (
    <section className="admin-overview" aria-labelledby="admin-overview-title">
      <div className="admin-overview__head">
        <div>
          <h2 id="admin-overview-title">Overview</h2>
          <p>Services created in the selected period, across all departments</p>
        </div>
        <label className="admin-overview__range">
          <span className="sr-only">Period</span>
          <select value={preset} onChange={(event) => setPreset(event.target.value as RangePreset)}>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalsQuery.isError ? (
        <div className="admin-overview__error" role="alert">
          <span>
            Could not load the overview:{' '}
            {totalsQuery.error instanceof Error ? totalsQuery.error.message : 'unknown error'}
          </span>
          <button type="button" onClick={() => void totalsQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <div className="admin-overview__tiles">
          {tiles.map((tile) => (
            <div key={tile.label} className={`admin-overview__tile admin-overview__tile--${tile.tone}`}>
              <span className="admin-overview__tile-label">{tile.label}</span>
              <strong className="admin-overview__tile-value">
                {totalsQuery.isPending ? (
                  <span className="admin-overview__skeleton" aria-label="Loading" />
                ) : (
                  numberFormat.format(tile.value ?? 0)
                )}
              </strong>
            </div>
          ))}
        </div>
      )}

      {departmentCards.length > 0 && (
        <div className="admin-overview__departments">
          {departmentCards.map(({ departmentType, query }) => (
            <DepartmentCard
              key={departmentType}
              departmentType={departmentType}
              summary={query?.data}
              isPending={query?.isPending ?? true}
              error={query?.isError ? query.error : null}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function DepartmentCard({
  departmentType,
  summary,
  isPending,
  error,
}: {
  departmentType: string
  summary: AdminDepartmentSummary | undefined
  isPending: boolean
  error: Error | null
}) {
  const segments = summary
    ? [
        { key: 'completed', label: 'Completed', value: summary.completedServices },
        { key: 'progress', label: 'In progress', value: summary.inProgressServices },
        { key: 'pending', label: 'Pending', value: summary.pendingServices },
        { key: 'cancelled', label: 'Cancelled', value: summary.cancelledServices },
      ]
    : []
  const totalServices = segments.reduce((sum, segment) => sum + segment.value, 0)
  const breakdown = segments.map((s) => `${s.label} ${numberFormat.format(s.value)}`).join(', ')

  return (
    <article className="admin-overview__dept">
      <div className="admin-overview__dept-head">
        <h3>{departmentLabel(departmentType)}</h3>
        {summary && summary.delayedServices > 0 && (
          <span className="admin-overview__delayed">{numberFormat.format(summary.delayedServices)} delayed</span>
        )}
      </div>

      {isPending ? (
        <span className="admin-overview__skeleton admin-overview__skeleton--wide" aria-label="Loading" />
      ) : error ? (
        <p className="admin-overview__dept-error">Could not load</p>
      ) : summary ? (
        <>
          <div className="admin-overview__dept-total">
            <strong>{numberFormat.format(summary.totalCustomers)}</strong>
            <span>customers</span>
          </div>
          <div className="admin-overview__bar" role="img" aria-label={breakdown} title={breakdown}>
            {totalServices > 0 &&
              segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <span
                    key={segment.key}
                    className={`admin-overview__bar-seg admin-overview__bar-seg--${segment.key}`}
                    style={{ width: `${(segment.value / totalServices) * 100}%` }}
                  />
                ))}
          </div>
          <dl className="admin-overview__legend">
            {segments.map((segment) => (
              <div key={segment.key}>
                <dt>
                  <span className={`admin-overview__dot admin-overview__bar-seg--${segment.key}`} />
                  {segment.label}
                </dt>
                <dd>{numberFormat.format(segment.value)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </article>
  )
}
