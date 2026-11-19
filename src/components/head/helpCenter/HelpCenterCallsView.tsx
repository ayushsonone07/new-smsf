import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  RefreshCw,
  Hash,
  Search,
  X,
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

// Badge colours — new-smsf tokens
function statusClass(status?: string) {
  const s = (status || '').toUpperCase()
  if (s.includes('ANSWER') || s.includes('COMPLETE') || s.includes('CONNECTED')) return 'bg-[#e0f6ec] text-[#127756]'
  if (s.includes('MISS') || s.includes('NO_ANSWER') || s.includes('FAIL') || s.includes('BUSY')) return 'bg-[#fce8ed] text-[#aa3655]'
  return 'bg-[#fbf0d6] text-[#8b5f09]'
}

const INPUT =
  'h-10 rounded-[10px] border border-[#e2e6ee] bg-white px-3 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-[#2459e0] focus:outline-none focus:ring-[3px] focus:ring-[#2459e0]/15'
const BTN =
  'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#e2e6ee] bg-white px-4 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60'

export function HelpCenterCallsView({
  departmentType,
  timeFilter,
  isDepartmentHead = false,
}: {
  departmentType?: string
  timeFilter?: TimeRangeFilterValue
  /** Heads see all ticket calls in their department; users only their own (enforced by the backend). */
  isDepartmentHead?: boolean
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

  // Quick stats (current page)
  const answeredCount = calls.filter((c) => (c.overallCallStatus || '').toUpperCase().includes('ANSWER')).length
  const missedCount = calls.filter((c) => {
    const s = (c.overallCallStatus || '').toUpperCase()
    return s.includes('MISS') || s.includes('NO_ANSWER') || s.includes('FAIL')
  }).length

  const hasFilters = Boolean(customerInput || ticketInput || fromDate || toDate || status !== 'ALL' || callType !== 'ALL')

  function clearFilters() {
    setCustomerInput('')
    setTicketInput('')
    setFromDate('')
    setToDate('')
    setStatus('ALL')
    setCallType('ALL')
    setPage(0)
  }

  const statCards = [
    { label: 'Total ticket calls', value: total, icon: PhoneCall, tone: 'bg-[#eaf0ff] text-[#2459e0]' },
    { label: 'Answered (this page)', value: answeredCount, icon: PhoneIncoming, tone: 'bg-[#e0f6ec] text-[#127756]' },
    { label: 'Missed / failed (this page)', value: missedCount, icon: PhoneMissed, tone: 'bg-[#fce8ed] text-[#aa3655]' },
  ]

  return (
    <div className="space-y-4">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="flex items-center gap-3.5 rounded-2xl border border-[#e6e9f0] bg-white p-4">
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[26px] font-bold leading-none text-slate-900">
                  {query.isLoading ? '–' : card.value}
                </span>
                <span className="mt-1.5 block text-[13px] text-slate-500">{card.label}</span>
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Calls panel ── */}
      <div className="overflow-hidden rounded-2xl border border-[#e6e9f0] bg-white">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#e6e9f0] px-4 py-3.5">
          <h2 className="text-base font-bold text-slate-900">Calls View</h2>
          <span className="inline-flex items-center gap-1 rounded-md border border-[#c7d6fb] bg-[#eaf0ff] px-2 py-0.5 text-xs font-semibold text-[#2459e0]">
            <Hash className="h-3.5 w-3.5" /> Ticket Calls Only
          </span>
          <span className="text-[13px] text-slate-500">
            {isDepartmentHead ? 'All ticket calls made in your department' : 'Only calls you made'} · recordings appear shortly after a call ends
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#e6e9f0] px-4 py-3.5">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(0)
            }}
            aria-label="Call status"
            className={INPUT}
          >
            <option value="ALL">All statuses</option>
            <option value="ANSWERED">Answered</option>
            <option value="MISSED">Missed</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={callType}
            onChange={(e) => {
              setCallType(e.target.value)
              setPage(0)
            }}
            aria-label="Call type"
            className={INPUT}
          >
            <option value="ALL">All types</option>
            <option value="OUTBOUND">Outbound</option>
            <option value="INBOUND">Inbound</option>
          </select>

          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              placeholder="Search customer phone or name"
              aria-label="Search customer"
              className={`${INPUT} w-full pl-8`}
            />
          </div>

          <div className="relative w-full sm:w-[180px]">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="Ticket #"
              aria-label="Ticket number"
              className={`${INPUT} w-full pl-8 font-mono`}
            />
          </div>

          <input
            type="date"
            value={fromDate || dateRangeFromPreset.fromDate || ''}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(0)
            }}
            aria-label="From date"
            title="From date"
            className={INPUT}
          />
          <input
            type="date"
            value={toDate || dateRangeFromPreset.toDate || ''}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(0)
            }}
            aria-label="To date"
            title="To date"
            className={INPUT}
          />

          {hasFilters && (
            <button type="button" onClick={clearFilters} className={BTN}>
              <X className="h-3.5 w-3.5 text-slate-500" /> Clear
            </button>
          )}
          <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className={BTN}>
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin text-[#2459e0]' : 'text-slate-500'}`} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {query.isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#2459e0]" />
              <p className="text-sm font-medium">Fetching call records…</p>
            </div>
          ) : query.isError ? (
            <div className="py-20 text-center text-sm text-rose-600">Couldn't load calls. Try Refresh.</div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <PhoneCall className="mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No call records found</p>
              <p className="mt-1 text-xs text-slate-400">There are no calls matching these filters.</p>
            </div>
          ) : (
            <table className="w-full min-w-[1000px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-[11.5px] font-bold uppercase tracking-[0.05em] text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3.5">Date &amp; Time</th>
                  <th className="whitespace-nowrap px-3.5 py-3.5">Caller (Agent)</th>
                  <th className="whitespace-nowrap px-3.5 py-3.5">Customer</th>
                  <th className="whitespace-nowrap px-3.5 py-3.5">Department</th>
                  <th className="whitespace-nowrap px-3.5 py-3.5">Status</th>
                  <th className="whitespace-nowrap px-3.5 py-3.5">Talk Time</th>
                  <th className="whitespace-nowrap px-3.5 py-3.5">Total Duration</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Recording</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => {
                  const outbound = (c.callType || '').toUpperCase().includes('OUT')
                  const DirIcon = outbound ? PhoneOutgoing : PhoneIncoming
                  return (
                    <tr key={String(c.id)} className="border-t border-slate-100 align-middle transition-colors hover:bg-[#f1f5ff]">
                      {/* Date & Time + call type */}
                      <td className="px-4 py-3.5">
                        <div className="whitespace-nowrap font-semibold text-slate-800">
                          {formatWhen(c.callTimestamp || c.createdAt)}
                        </div>
                        <span
                          className={`mt-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            outbound ? 'bg-[#e8f0fe] text-[#1550ad]' : 'bg-[#f3e8ff] text-[#7e3bc9]'
                          }`}
                        >
                          <DirIcon className="h-3.5 w-3.5" />
                          {outbound ? 'Outbound' : c.callType ? 'Inbound' : '—'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="max-w-[200px] truncate font-semibold text-slate-800" title={c.callerName}>
                          {c.callerName || '—'}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500">{c.callerNumber || ''}</div>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <button
                          type="button"
                          onClick={() => setCustomerInput(c.destinationNumber || c.customerName || '')}
                          title="Filter by this customer"
                          className="group text-left"
                        >
                          <span className="block max-w-[200px] truncate font-semibold text-slate-800 group-hover:text-[#2459e0]">
                            {c.destinationName || c.customerName || 'Customer'}
                          </span>
                          <span className="mt-0.5 block font-mono text-xs text-slate-500">{c.destinationNumber || ''}</span>
                        </button>
                      </td>
                      {/* Department + ticket context */}
                      <td className="px-3.5 py-3.5">
                        <div className="whitespace-nowrap font-semibold text-slate-800">{prettyDept(c.departmentType)}</div>
                        {c.ticketNumber ? (
                          <button
                            type="button"
                            onClick={() => setTicketInput(c.ticketNumber || '')}
                            title="Filter by this ticket"
                            className="mt-1.5 whitespace-nowrap rounded-md border border-[#c7d6fb] bg-[#eaf0ff] px-2 py-0.5 font-mono text-xs font-semibold text-[#2459e0] transition-colors hover:bg-[#dbe6ff]"
                          >
                            {c.ticketNumber}
                          </button>
                        ) : (
                          <div className="mt-1 text-xs text-slate-400">Department call</div>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(c.overallCallStatus)}`}>
                          {c.overallCallStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3.5 font-semibold text-slate-800">{formatMs(c.conversationDurationMs)}</td>
                      <td className="whitespace-nowrap px-3.5 py-3.5 text-slate-700">
                        {c.durationMs ? formatMs(c.durationMs) : c.overallCallDuration || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {c.recordingUrl ? (
                          <audio controls preload="none" src={c.recordingUrl} className="h-9 w-[230px]" />
                        ) : (
                          <span className="text-xs text-slate-400">No recording</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e9f0] px-4 py-3">
          <span className="text-[13px] text-slate-500">
            {total} call{total === 1 ? '' : 's'} · {isDepartmentHead ? 'Department scope' : 'Your calls only'}
            {totalPages > 1 ? ` · Page ${page + 1} of ${totalPages}` : ''}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0 || query.isFetching}
                className={BTN}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page >= totalPages - 1 || query.isFetching}
                className={BTN}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
