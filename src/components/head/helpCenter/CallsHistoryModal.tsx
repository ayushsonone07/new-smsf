import { useEffect, useState } from 'react'
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
  X,
} from 'lucide-react'
import { getCallsHistory, type AirtelCallSummary, type CallContextType } from '../../../api/airtel.api'

type SourceFilter = 'ALL' | CallContextType

const PAGE_SIZE = 20

function formatWhen(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

/** Phone-like input ("+91 82510 81096") → last 10 digits, to match stored numbers; names unchanged. */
function normalizeCustomer(value: string) {
  const v = value.trim()
  if (!v) return ''
  const digits = v.replace(/\D/g, '')
  if (/^[\d\s+()-]+$/.test(v) && digits.length >= 10) return digits.slice(-10)
  return v
}

/** "1794920044290" → "TICKET1794920044290"; "ticket123" → "TICKET123"; blank → "". */
function normalizeTicketNumber(value: string) {
  const v = value.trim().replace(/\s+/g, '')
  if (!v) return ''
  if (/^\d+$/.test(v)) return `TICKET${v}`
  return v.toUpperCase()
}

function prettyDept(value?: string) {
  if (!value) return '—'
  return value.replace(/_DEPARTMENT$/i, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusClass(status?: string) {
  const s = (status || '').toUpperCase()
  if (s.includes('ANSWER') || s.includes('COMPLETE') || s.includes('CONNECTED')) return 'bg-emerald-50 text-emerald-700'
  if (s.includes('MISS') || s.includes('NO_ANSWER') || s.includes('FAIL') || s.includes('BUSY')) return 'bg-rose-50 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

/**
 * "Calls History": all calls the viewer may see, with caller, customer, department,
 * durations, ticket number and the recording player.
 */
export function CallsHistoryModal({
  open,
  onClose,
  departmentType,
  defaultSource = 'ALL',
  lockSource = false,
  title = 'Calls History',
  initialTicketNumber = '',
  initialCustomer = '',
}: {
  open: boolean
  onClose: () => void
  /** SuperAdmin: optional department filter; heads/users are scoped by the server anyway */
  departmentType?: string
  defaultSource?: SourceFilter
  /** Fix the source to defaultSource and hide the All/Ticket/Department filter (e.g. Help & Support = tickets only) */
  lockSource?: boolean
  title?: string
  /** Open pre-filtered on one ticket (render with a `key` so a new value resets the filters) */
  initialTicketNumber?: string
  /** Open pre-filtered on one customer — phone number or name */
  initialCustomer?: string
}) {
  const [selectedSource, setSource] = useState<SourceFilter>(defaultSource)
  const source: SourceFilter = lockSource ? defaultSource : selectedSource
  const [customerInput, setCustomerInput] = useState(initialCustomer)
  const [customer, setCustomer] = useState(normalizeCustomer(initialCustomer))
  const [ticketInput, setTicketInput] = useState(initialTicketNumber)
  const [ticketNumber, setTicketNumber] = useState(normalizeTicketNumber(initialTicketNumber))
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)

  // debounce the customer + ticket boxes
  useEffect(() => {
    const t = setTimeout(() => {
      setCustomer(normalizeCustomer(customerInput))
      setTicketNumber(normalizeTicketNumber(ticketInput))
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [customerInput, ticketInput])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const query = useQuery({
    queryKey: ['calls-history', source, customer, ticketNumber, fromDate, toDate, page, departmentType ?? ''],
    queryFn: () =>
      getCallsHistory({
        page,
        size: PAGE_SIZE,
        // matches customer phone (caller/destination number) or customer name
        search: customer || undefined,
        ticketNumber: ticketNumber || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        contextType: source === 'ALL' ? undefined : source,
        ...(departmentType ? ({ departmentType } as Record<string, string>) : {}),
      }),
    enabled: open,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  if (!open) return null

  const calls: AirtelCallSummary[] = query.data?.data ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.totalPage ?? 1)

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-3 sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <PhoneCall className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              <p className="text-[11px] text-slate-500">
                {total} call{total === 1 ? '' : 's'} · recordings appear a few minutes after a call ends
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              placeholder="Customer phone or name"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs"
            />
          </div>
          <div className="relative w-[200px]">
            <Hash className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="Ticket number"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-mono"
            />
          </div>
          {lockSource ? (
            <span className="inline-flex h-9 items-center rounded-lg border border-blue-100 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700">
              {defaultSource === 'TICKET' ? 'Ticket calls only' : defaultSource === 'DEPARTMENT' ? 'Department calls only' : 'All calls'}
            </span>
          ) : (
            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value as SourceFilter)
                setPage(0)
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
            >
              <option value="ALL">All calls</option>
              <option value="TICKET">Ticket calls</option>
              <option value="DEPARTMENT">Department calls</option>
            </select>
          )}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(0)
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs"
            title="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(0)
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs"
            title="To date"
          />
          {(customerInput || ticketInput || fromDate || toDate || source !== defaultSource) && (
            <button
              type="button"
              onClick={() => {
                setCustomerInput('')
                setTicketInput('')
                setFromDate('')
                setToDate('')
                setSource(defaultSource)
                setPage(0)
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {query.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading calls…
            </div>
          ) : query.isError ? (
            <div className="py-16 text-center text-sm text-rose-600">Couldn't load calls. Try Refresh.</div>
          ) : calls.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">No calls found.</div>
          ) : (
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase tracking-wide text-slate-400 shadow-[0_1px_0_#f1f5f9]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date &amp; time</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold">Caller</th>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold">Department</th>
                  <th className="px-3 py-2.5 font-semibold">Ticket</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Talk time</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-4 py-2.5 font-semibold">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calls.map((c) => {
                  const outbound = (c.callType || '').toUpperCase().includes('OUT')
                  const DirIcon = outbound ? PhoneOutgoing : PhoneIncoming
                  return (
                    <tr key={String(c.id)} className="align-top hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatWhen(c.callTimestamp || c.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <DirIcon className="h-3.5 w-3.5 text-slate-400" />
                          {outbound ? 'Outbound' : c.callType ? 'Inbound' : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="max-w-[170px] truncate font-medium text-slate-800" title={c.callerName}>
                          {c.callerName || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">{c.callerNumber || ''}</div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setCustomerInput(c.destinationNumber || c.customerName || '')}
                          title="Show only this customer's calls"
                          className="block max-w-[170px] text-left hover:underline"
                        >
                          <span className="block truncate font-medium text-slate-800">{c.destinationName || c.customerName || '—'}</span>
                          <span className="block text-[11px] text-slate-400">{c.destinationNumber || ''}</span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">{prettyDept(c.departmentType)}</td>
                      <td className="px-3 py-3">
                        {c.ticketNumber ? (
                          <button
                            type="button"
                            onClick={() => setTicketInput(c.ticketNumber || '')}
                            title="Show only this ticket's calls"
                            className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] text-blue-700 hover:bg-blue-100"
                          >
                            {c.ticketNumber}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Department</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(c.overallCallStatus)}`}>
                          {c.overallCallStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatMs(c.conversationDurationMs)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        {c.durationMs ? formatMs(c.durationMs) : c.overallCallDuration || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.recordingUrl ? (
                          <audio controls preload="none" src={c.recordingUrl} className="h-8 w-[220px]" />
                        ) : (
                          <span className="text-[11px] text-slate-400">Not available</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || query.isFetching}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages || query.isFetching}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
