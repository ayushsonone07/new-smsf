import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSession } from '../../../../app/auth/session'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import {
  getMyAirtelCalls,
  getMyAirtelAnalytics,
  getDepartmentAirtelCalls,
  getDepartmentAirtelAnalytics,
  getAirtelCallDetail,
  type AirtelCallSummary,
  type AirtelCallDetail,
  type AirtelAnalytics,
  type AirtelCallsQuery,
  type AirtelPagination,
} from '../../../../api/airtel.api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

const formatMs = (ms?: number | null): string => {
  if (ms == null || ms <= 0) return '—'
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const toYmd = (d?: Date): string | undefined => {
  if (!d) return undefined
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const StatusBadge = ({ status }: { status?: string | null }) => {
  const s = (status || '').toLowerCase()
  if (s === 'answered')
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        Answered
      </span>
    )
  if (s === 'missed')
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        Missed
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {status || '—'}
    </span>
  )
}

const TypeBadge = ({ type }: { type?: string | null }) => {
  const t = (type || '').toUpperCase()
  if (t === 'INBOUND')
    return <span className="text-xs font-medium text-sky-700">↙ Inbound</span>
  if (t === 'OUTBOUND')
    return <span className="text-xs font-medium text-violet-700">↗ Outbound</span>
  return <span className="text-xs text-slate-400">{type || '—'}</span>
}

const StatCard = ({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  accent: string
}) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
    </div>
  </div>
)

import { isUserGoogle } from '../utils/routeUtils'

const PAGE_SIZE_DEFAULT = 10

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  feature: FeaturePermission
}

export function MyAirtelCallsPage({ feature: _feature }: Props) {
  const session = getSession()
  const user = session?.user
  const isHead = user?.role === 'HEAD' || user?.role === 'ADMIN'
  const departmentType = isUserGoogle(user?.departmentType)
    ? 'GOOGLE_DEPARTMENT'
    : user?.departmentType || 'ONBOARDING_DEPARTMENT'

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [callType, setCallType] = useState('ALL')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT)

  // Data
  const [calls, setCalls] = useState<AirtelCallSummary[]>([])
  const [analytics, setAnalytics] = useState<AirtelAnalytics | null>(null)
  const [pagination, setPagination] = useState<AirtelPagination | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<AirtelCallDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, status, callType, startDate, endDate])

  const buildQuery = useCallback((): AirtelCallsQuery => ({
    search: debouncedSearch.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
    callType: callType === 'ALL' ? undefined : callType,
    fromDate: toYmd(startDate),
    toDate: toYmd(endDate),
    page,
    size: pageSize,
    sortBy: 'callTimestamp',
    sortDir: 'desc',
  }), [debouncedSearch, status, callType, startDate, endDate, page, pageSize])

  const analyticsQuery = useCallback((): AirtelCallsQuery => ({
    search: debouncedSearch.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
    callType: callType === 'ALL' ? undefined : callType,
    fromDate: toYmd(startDate),
    toDate: toYmd(endDate),
  }), [debouncedSearch, status, callType, startDate, endDate])

  // Fetch calls + analytics
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const q = buildQuery()
    const aq = analyticsQuery()

    const callsPromise = isHead && departmentType
      ? getDepartmentAirtelCalls(q, departmentType)
      : getMyAirtelCalls(q)

    const analyticsPromise = isHead && departmentType
      ? getDepartmentAirtelAnalytics(aq, departmentType)
      : getMyAirtelAnalytics(aq)

    callsPromise
      .then((res) => {
        if (!cancelled) {
          setCalls(res?.data ?? [])
          setPagination({
            pageNumber: res?.pageNumber ?? page,
            elementSize: res?.elementSize ?? pageSize,
            totalElements: res?.totalElements ?? 0,
            totalPage: res?.totalPage ?? 0,
            first: res?.first ?? true,
            last: res?.last ?? true,
          })
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    analyticsPromise
      .then((a) => { if (!cancelled) setAnalytics(a) })
      .catch(() => { /* analytics failure is non-critical */ })

    return () => { cancelled = true }
  }, [buildQuery, analyticsQuery, isHead, departmentType, page])

  const openDetail = async (id: number) => {
    setDetailOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const d = await getAirtelCallDetail(id)
      setDetail(d)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('ALL')
    setCallType('ALL')
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const prefix = isHead ? 'Department' : 'My'

  const statCards = useMemo(
    () => [
      {
        label: `${prefix} Calls`,
        value: (analytics?.totalCalls ?? 0).toLocaleString(),
        sub: `${analytics?.uniqueCallers ?? 0} unique callers`,
        icon: <span className="text-xl">📞</span>,
        accent: 'bg-indigo-50',
      },
      {
        label: 'Answered',
        value: (analytics?.answeredCalls ?? 0).toLocaleString(),
        sub: `${analytics?.answerRate ?? 0}% answer rate`,
        icon: <span className="text-xl">✅</span>,
        accent: 'bg-emerald-50',
      },
      {
        label: 'Missed',
        value: (analytics?.missedCalls ?? 0).toLocaleString(),
        sub: `${analytics?.otherCalls ?? 0} other`,
        icon: <span className="text-xl">📵</span>,
        accent: 'bg-rose-50',
      },
      {
        label: 'Avg Duration',
        value: formatMs(analytics?.avgDurationMs),
        sub: `Talk time ${formatMs(analytics?.totalConversationMs)}`,
        icon: <span className="text-xl">⏱</span>,
        accent: 'bg-amber-50',
      },
      {
        label: 'Recorded',
        value: (analytics?.recordedCalls ?? 0).toLocaleString(),
        sub: 'calls with audio',
        icon: <span className="text-xl">🎙</span>,
        accent: 'bg-sky-50',
      },
    ],
    [analytics, isHead],
  )

  return (
    <div className="space-y-5 p-4 mt-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">
          {isHead ? 'Department Airtel Calls' : 'My Airtel Calls'}
        </h2>
        <p className="text-sm text-slate-500">
          {isHead
            ? `All calls for ${departmentType.replace(/_/g, ' ')} department`
            : 'Your call history filtered by your phone number'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-600">Search</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Number, customer or session id"
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div className="min-w-[130px]">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="ALL">All statuses</option>
              <option value="Answered">Answered</option>
              <option value="Missed">Missed</option>
            </select>
          </div>

          <div className="min-w-[130px]">
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="ALL">All types</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
          </div>

          <div className="flex gap-2 min-w-[240px]">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600">From</label>
              <input
                type="date"
                value={startDate ? toYmd(startDate) : ''}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600">To</label>
              <input
                type="date"
                value={endDate ? toYmd(endDate) : ''}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <button
            onClick={resetFilters}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/70 text-slate-600">
                <th className="px-4 py-3 text-left font-semibold">Time</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Caller</th>
                <th className="px-4 py-3 text-left font-semibold">Caller ID</th>
                <th className="px-4 py-3 text-left font-semibold">Destination</th>
                <th className="px-4 py-3 text-left font-semibold">Duration</th>
                <th className="px-4 py-3 text-left font-semibold">Talk</th>
                <th className="px-4 py-3 text-center font-semibold">Rec</th>
                <th className="px-4 py-3 text-center font-semibold">Legs</th>
                <th className="px-4 py-3 text-left font-semibold">Session ID</th>
                <th className="px-4 py-3 text-center font-semibold">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={13} className="px-4 py-3">
                      <div className="h-6 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-rose-600">
                    ⚠ {error}
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-slate-500">
                    No calls found for the selected filters.
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDateTime(c.callTimestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.overallCallStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={c.callType} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.customerName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{c.callerNumber || '—'}</div>
                      {c.callerCircleName && (
                        <div className="text-xs text-slate-400">{c.callerCircleName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.airtelCallerId || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{c.destinationNumber || '—'}</div>
                      {c.destinationName && (
                        <div className="text-xs text-slate-400">{c.destinationName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {c.overallCallDuration || formatMs(c.durationMs)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatMs(c.conversationDurationMs)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.hasRecording && c.recordingUrl ? (
                        <a
                          href={c.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center text-sky-600 hover:text-sky-700"
                          title="Open recording"
                        >
                          🔊
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {c.participantCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                      {c.sessionId ? c.sessionId.slice(0, 14) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetail(c.id)}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        👁 View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(pagination?.totalElements ?? 0) > 0 && (
          <div className="border-t px-4 py-3 flex items-center justify-between text-sm text-slate-600">
            <span>
              Showing {page * pageSize + 1}–
              {Math.min((page + 1) * pageSize, pagination?.totalElements ?? 0)} of{' '}
              {pagination?.totalElements ?? 0}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
                className="rounded border border-slate-200 px-2 py-1 text-xs"
              >
                {[10, 20, 50].map((s) => (
                  <option key={s} value={s}>
                    {s} / page
                  </option>
                ))}
              </select>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
              >
                ←
              </button>
              <span className="text-xs text-slate-500">
                Page {page + 1} of {pagination?.totalPage ?? 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination?.last ?? true}
                className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                📞 Call Details
              </h3>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="space-y-2 py-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : !detail ? (
              <p className="py-6 text-center text-slate-500">Could not load this call.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detail.overallCallStatus} />
                  <TypeBadge type={detail.callType} />
                  <span className="text-xs text-slate-400">{formatDateTime(detail.callTimestamp)}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <DetailField label="Caller" value={detail.callerNumber} />
                  <DetailField label="Destination" value={detail.destinationNumber} />
                  <DetailField label="Customer" value={detail.customerName} />
                  <DetailField label="Caller Circle" value={detail.callerCircleName} />
                  <DetailField label="Operator" value={detail.callerOperatorName} />
                  <DetailField label="Hangup Cause" value={detail.hangupCause} />
                  <DetailField label="Total Duration" value={detail.overallCallDuration || formatMs(detail.durationMs)} />
                  <DetailField label="Talk Time" value={formatMs(detail.conversationDurationMs)} />
                  <DetailField label="Session ID" value={detail.sessionId} />
                </div>

                {detail.recordingUrl && (
                  <a
                    href={detail.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
                  >
                    🔊 Open Recording
                  </a>
                )}

                {(detail.participants?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">
                      Participants ({detail.participants?.length ?? 0})
                    </h4>
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500">
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Address</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.participants.map((p) => (
                            <tr key={p.id} className="border-t">
                              <td className="px-3 py-2">{p.participantIndex ?? '—'}</td>
                              <td className="px-3 py-2">
                                {p.participantAddress || '—'}
                                {p.participantName ? ` (${p.participantName})` : ''}
                              </td>
                              <td className="px-3 py-2">{p.participantType || '—'}</td>
                              <td className="px-3 py-2">{p.status || '—'}</td>
                              <td className="px-3 py-2">{formatMs(p.durationMs)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs text-slate-400">{label}</p>
    <p className="text-slate-700 break-all">{value || '—'}</p>
  </div>
)

