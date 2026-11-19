import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  Hash,
  User,
  Calendar,
  Layers,
} from 'lucide-react'
import { getCallsHistory, type AirtelCallSummary } from '../../../api/airtel.api'
import type { TimeRangeFilterValue } from './TimeRangeFilter'

const PAGE_SIZE = 20

function resolveDateRange(filter?: TimeRangeFilterValue): { fromDate?: string; toDate?: string } {
  if (!filter || filter.preset === 'all') return {}

  const now = new Date()
  const toYmd = (d: Date) => d.toISOString().slice(0, 10)

  if (filter.preset === 'custom') {
    return {
      fromDate: filter.startDate ? filter.startDate.slice(0, 10) : undefined,
      toDate: filter.endDate ? filter.endDate.slice(0, 10) : undefined,
    }
  }

  if (filter.days) {
    const from = new Date(now)
    from.setDate(now.getDate() - filter.days)
    return {
      fromDate: toYmd(from),
      toDate: toYmd(now),
    }
  }

  if (filter.months === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      fromDate: toYmd(from),
      toDate: toYmd(now),
    }
  }

  if (filter.months === 'previous') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      fromDate: toYmd(from),
      toDate: toYmd(to),
    }
  }

  if (filter.months) {
    const m = parseInt(filter.months, 10) || 1
    const from = new Date(now.getFullYear(), now.getMonth() - m, 1)
    return {
      fromDate: toYmd(from),
      toDate: toYmd(now),
    }
  }

  return {}
}

function formatWhen(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMs(ms?: number | null) {
  if (!ms || ms <= 0) return '—'
  const total = Math.round(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

function normalizeCustomer(value: string) {
  const v = value.trim()
  if (!v) return ''
  const digits = v.replace(/\D/g, '')
  if (/^[\d\s+()-]+$/.test(v) && digits.length >= 10) return digits.slice(-10)
  return v
}

function normalizeTicketNumber(value: string) {
  const v = value.trim().replace(/\s+/g, '')
  if (!v) return ''
  if (/^\d+$/.test(v)) return `TICKET${v}`
  return v.toUpperCase()
}

function prettyDept(value?: string) {
  if (!value) return '—'
  return value
    .replace(/_DEPARTMENT$/i, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusClass(status?: string) {
  const s = (status || '').toUpperCase()
  if (s.includes('ANSWER') || s.includes('COMPLETE') || s.includes('CONNECTED'))
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (s.includes('MISS') || s.includes('NO_ANSWER') || s.includes('FAIL') || s.includes('BUSY'))
    return 'bg-rose-50 text-rose-700 border border-rose-200'
  return 'bg-slate-100 text-slate-600 border border-slate-200'
}

export function HelpCenterCallsView({
  departmentType,
  timeFilter,
}: {
  departmentType?: string
  timeFilter?: TimeRangeFilterValue
}) {
  const [callType, setCallType] = useState<string>('ALL')
  const [status, setStatus] = useState<string>('ALL')
  const [customerInput, setCustomerInput] = useState('')
  const [customer, setCustomer] = useState('')
  const [ticketInput, setTicketInput] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)

  // Resolve top preset dates (All Time, 3 Days, 7 Days, This Month, etc.)
  const dateRangeFromPreset = useMemo(() => resolveDateRange(timeFilter), [timeFilter])
  const activeFromDate = fromDate || dateRangeFromPreset.fromDate
  const activeToDate = toDate || dateRangeFromPreset.toDate

  // debounce the customer + ticket boxes
  useEffect(() => {
    const t = setTimeout(() => {
      setCustomer(normalizeCustomer(customerInput))
      setTicketNumber(normalizeTicketNumber(ticketInput))
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [customerInput, ticketInput])

  const query = useQuery({
    queryKey: [
      'help-center-calls',
      'TICKET',
      status,
      callType,
      customer,
      ticketNumber,
      activeFromDate,
      activeToDate,
      page,
      departmentType ?? '',
    ],
    queryFn: () =>
      getCallsHistory({
        page,
        size: PAGE_SIZE,
        status: status === 'ALL' ? undefined : status,
        callType: callType === 'ALL' ? undefined : callType,
        search: customer || undefined,
        ticketNumber: ticketNumber || undefined,
        fromDate: activeFromDate || undefined,
        toDate: activeToDate || undefined,
        contextType: 'TICKET',
        ...(departmentType ? ({ departmentType } as Record<string, string>) : {}),
      }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  const calls: AirtelCallSummary[] = query.data?.data ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.totalPage ?? 1)

  // Quick stats
  const answeredCount = calls.filter((c) =>
    (c.overallCallStatus || '').toUpperCase().includes('ANSWER')
  ).length
  const missedCount = calls.filter((c) => {
    const s = (c.overallCallStatus || '').toUpperCase()
    return s.includes('MISS') || s.includes('NO_ANSWER') || s.includes('FAIL')
  }).length

  return (
    <div className="space-y-4">
      {/* Top Card: Summary & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Calls</span>
            <PhoneCall className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Answered Calls</span>
            <PhoneIncoming className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{answeredCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Missed / Failed</span>
            <PhoneOutgoing className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">{missedCount}</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <PhoneCall className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Calls View</h2>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                  <Hash className="h-3 w-3" /> Ticket Calls Only
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {total} ticket call{total === 1 ? '' : 's'} recorded · audio recordings appear shortly after calls conclude
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 border-b border-slate-100 bg-slate-50/30">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(0)
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ANSWERED">Answered</option>
              <option value="MISSED">Missed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Call Type Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Type:</span>
            <select
              value={callType}
              onChange={(e) => {
                setCallType(e.target.value)
                setPage(0)
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="OUTBOUND">Outbound</option>
              <option value="INBOUND">Inbound</option>
            </select>
          </div>

          {/* Search Customer */}
          <div className="relative min-w-[180px] flex-1">
            <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              placeholder="Search phone or customer name"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Search Ticket */}
          <div className="relative w-[180px]">
            <Hash className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="Filter ticket #"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-mono shadow-2xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate || dateRangeFromPreset.fromDate || ''}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(0)
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
              title="From date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={toDate || dateRangeFromPreset.toDate || ''}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(0)
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-2xs focus:border-blue-500 focus:outline-none"
              title="To date"
            />
          </div>

          {/* Clear Filters */}
          {(customerInput ||
            ticketInput ||
            fromDate ||
            toDate ||
            status !== 'ALL' ||
            callType !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setCustomerInput('')
                setTicketInput('')
                setFromDate('')
                setToDate('')
                setStatus('ALL')
                setCallType('ALL')
                setPage(0)
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {query.isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">Fetching call records…</p>
            </div>
          ) : query.isError ? (
            <div className="py-20 text-center text-sm text-rose-600">
              Could not load calls. Please ensure notification service is running or click Refresh.
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
              <PhoneCall className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Call Records Found</p>
              <p className="text-xs text-slate-400 mt-1">
                There are no calls matching the current filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date &amp; Time</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Caller (Agent)</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Department</th>
                  <th className="px-3 py-3 font-semibold">Ticket Context</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Talk Time</th>
                  <th className="px-3 py-3 font-semibold">Total Duration</th>
                  <th className="px-5 py-3 font-semibold">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((c) => {
                  const outbound = (c.callType || '').toUpperCase().includes('OUT')
                  const DirIcon = outbound ? PhoneOutgoing : PhoneIncoming
                  return (
                    <tr key={String(c.id)} className="align-middle hover:bg-slate-50/70 transition-colors">
                      <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-700">
                        {formatWhen(c.callTimestamp || c.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                          <DirIcon className={`h-3.5 w-3.5 ${outbound ? 'text-blue-500' : 'text-emerald-500'}`} />
                          {outbound ? 'Outbound' : c.callType ? 'Inbound' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[170px] truncate font-medium text-slate-900" title={c.callerName}>
                          {c.callerName || '—'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">{c.callerNumber || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setCustomerInput(c.destinationNumber || c.customerName || '')}
                          title="Filter by this customer"
                          className="text-left group cursor-pointer"
                        >
                          <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-600">
                            {c.destinationName || c.customerName || 'Customer'}
                          </span>
                          <span className="block text-[11px] font-mono text-slate-500">{c.destinationNumber || ''}</span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {prettyDept(c.departmentType)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {c.ticketNumber ? (
                          <button
                            type="button"
                            onClick={() => setTicketInput(c.ticketNumber || '')}
                            title="Filter by this ticket"
                            className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            {c.ticketNumber}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Department</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusClass(c.overallCallStatus)}`}>
                          {c.overallCallStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-800">
                        {formatMs(c.conversationDurationMs)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                        {c.durationMs ? formatMs(c.durationMs) : c.overallCallDuration || '—'}
                      </td>
                      <td className="px-5 py-3">
                        {c.recordingUrl ? (
                          <audio controls preload="none" src={c.recordingUrl} className="h-8 w-[210px]" />
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No recording</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page <strong className="text-slate-800">{page + 1}</strong> of{' '}
              <strong className="text-slate-800">{totalPages}</strong> ({total} total calls)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0 || query.isFetching}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page >= totalPages - 1 || query.isFetching}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
