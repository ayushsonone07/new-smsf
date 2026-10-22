import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Users,
  Search,
  RefreshCw,
  Volume2,
  Eye,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Bot,
  Building,
  ChevronRight,
  Globe,
  Headphones,
  Megaphone,
  Palette,
  UserPlus,
  X,
} from 'lucide-react'
import {
  getAirtelCalls,
  getAirtelAnalytics,
  getDepartmentAirtelCalls,
  getDepartmentAirtelAnalytics,
  getAirtelCallDetail,
  type AirtelCallSummary,
  type AirtelCallDetail,
  type AirtelAnalytics,
  type AirtelCallsQuery,
  type AirtelPagination,
} from '../../../api/airtel.api'
import { DepartmentDateRangePicker } from './components/DepartmentDateRangePicker'

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
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        Answered
      </span>
    )
  if (s === 'missed')
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
        Missed
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      {status || '—'}
    </span>
  )
}

const TypeBadge = ({ type }: { type?: string | null }) => {
  const t = (type || '').toUpperCase()
  if (t === 'INBOUND')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
        <PhoneIncoming className="h-3.5 w-3.5" /> Inbound
      </span>
    )
  if (t === 'OUTBOUND')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700">
        <PhoneOutgoing className="h-3.5 w-3.5" /> Outbound
      </span>
    )
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
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
    </div>
  </div>
)

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs font-medium text-slate-400">{label}</p>
    <p className="text-sm font-semibold text-slate-700 break-all">{value || '—'}</p>
  </div>
)

const PAGE_SIZE_DEFAULT = 10
const ALL_CALLS = 'ALL'

const formatDepartmentLabel = (dept: string): string =>
  dept
    .replace(/_DEPARTMENT$/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase())

const BOX_TONES = {
  indigo: { badge: 'bg-indigo-50 text-indigo-600', hover: 'group-hover:bg-indigo-600', border: 'hover:border-indigo-200', chevron: 'group-hover:text-indigo-500' },
  blue: { badge: 'bg-blue-50 text-blue-600', hover: 'group-hover:bg-blue-600', border: 'hover:border-blue-200', chevron: 'group-hover:text-blue-500' },
  violet: { badge: 'bg-violet-50 text-violet-600', hover: 'group-hover:bg-violet-600', border: 'hover:border-violet-200', chevron: 'group-hover:text-violet-500' },
  rose: { badge: 'bg-rose-50 text-rose-600', hover: 'group-hover:bg-rose-600', border: 'hover:border-rose-200', chevron: 'group-hover:text-rose-500' },
  fuchsia: { badge: 'bg-fuchsia-50 text-fuchsia-600', hover: 'group-hover:bg-fuchsia-600', border: 'hover:border-fuchsia-200', chevron: 'group-hover:text-fuchsia-500' },
  emerald: { badge: 'bg-emerald-50 text-emerald-600', hover: 'group-hover:bg-emerald-600', border: 'hover:border-emerald-200', chevron: 'group-hover:text-emerald-500' },
} as const

const DEPARTMENT_BOXES = [
  { type: 'ONBOARDING_DEPARTMENT', label: 'Onboarding', description: 'New customer onboarding pipeline', icon: UserPlus, tone: 'indigo' as const },
  { type: 'GOOGLE_DEPARTMENT', label: 'Google', description: 'Google services & campaigns', icon: Globe, tone: 'blue' as const },
  { type: 'AUTOWEBSION_DEPARTMENT', label: 'Autowebsion', description: 'Website & automation operations', icon: Bot, tone: 'violet' as const },
  { type: 'ADVERTISEMENT_DEPARTMENT', label: 'Advertisement', description: 'Ad campaigns & promotions', icon: Megaphone, tone: 'rose' as const },
  { type: 'SMO_DEPARTMENT', label: 'Creative', description: 'Creative design & social media assets', icon: Palette, tone: 'fuchsia' as const },
  { type: 'SUPPORT_DEPARTMENT', label: 'Support', description: 'Customer support & tickets', icon: Headphones, tone: 'emerald' as const },
]

const OTHER_DEPARTMENT_TYPES = [
  { type: 'AUTOMATION_DEPARTMENT', label: 'Automation' },
  { type: 'DELIVERY_DEPARTMENT', label: 'Delivery' },
  { type: 'SERVICE_EXPIRATION_DEPARTMENT', label: 'Service Expiration' },
  { type: 'QR_DEPARTMENT', label: 'QR' },
  { type: 'WEBSITE_DEPARTMENT', label: 'Website' },
  { type: 'SALES_DEPARTMENT', label: 'Sales' },
  { type: 'TELESALES_DEPARTMENT', label: 'Telesales' },
  { type: 'MARKETING_DEPARTMENT', label: 'Marketing' },
  { type: 'SEO_DEPARTMENT', label: 'SEO' },
  { type: 'BILLING_DEPARTMENT', label: 'Billing' },
  { type: 'RECURRING_DEPARTMENT', label: 'Recurring' },
]

const getDepartmentInfo = (departmentType: string) => {
  const curated = DEPARTMENT_BOXES.find((box) => box.type === departmentType)
  if (curated) return curated
  return {
    type: departmentType,
    label: formatDepartmentLabel(departmentType),
    description: 'Department Airtel call records',
    icon: Building,
  }
}

export function AdminAirtelServicePage() {
  const [selectedScope, setSelectedScope] = useState<string | null>(null)

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

  const isAllCalls = selectedScope === ALL_CALLS
  const selectedDepartmentInfo = selectedScope && !isAllCalls ? getDepartmentInfo(selectedScope) : null

  // Debounce search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, status, callType, startDate, endDate, selectedScope])

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

  // Fetch list + analytics whenever the scope or filters/paging change
  useEffect(() => {
    if (!selectedScope) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const q = buildQuery()
    const aq = analyticsQuery()

    const callsPromise = isAllCalls
      ? getAirtelCalls(q)
      : getDepartmentAirtelCalls(q, selectedScope)

    const analyticsPromise = isAllCalls
      ? getAirtelAnalytics(aq)
      : getDepartmentAirtelAnalytics(aq, selectedScope)

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
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to fetch calls')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    analyticsPromise
      .then((res) => {
        if (!cancelled) setAnalytics(res ?? null)
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedScope, isAllCalls, buildQuery, analyticsQuery, page, pageSize])

  const openDetail = (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    getAirtelCallDetail(id)
      .then((res) => setDetail(res))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('ALL')
    setCallType('ALL')
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const selectScope = (scope: string) => {
    setSelectedScope(scope)
    setPage(0)
    resetFilters()
  }

  const backToDepartments = () => {
    setSelectedScope(null)
    setPage(0)
    resetFilters()
  }

  const cards = useMemo(
    () => [
      {
        label: 'Total Calls',
        value: (analytics?.totalCalls ?? 0).toLocaleString(),
        sub: `${analytics?.uniqueCallers ?? 0} unique callers`,
        icon: <PhoneCall className="h-5 w-5 text-indigo-600" />,
        accent: 'bg-indigo-50',
      },
      {
        label: 'Answered',
        value: (analytics?.answeredCalls ?? 0).toLocaleString(),
        sub: `${analytics?.answerRate ?? 0}% answer rate`,
        icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
        accent: 'bg-emerald-50',
      },
      {
        label: 'Missed',
        value: (analytics?.missedCalls ?? 0).toLocaleString(),
        sub: `${analytics?.otherCalls ?? 0} other`,
        icon: <PhoneMissed className="h-5 w-5 text-rose-600" />,
        accent: 'bg-rose-50',
      },
      {
        label: 'Avg Duration',
        value: formatMs(analytics?.avgDurationMs),
        sub: `Talk time ${formatMs(analytics?.totalConversationMs)}`,
        icon: <Clock className="h-5 w-5 text-amber-600" />,
        accent: 'bg-amber-50',
      },
      {
        label: 'Recorded',
        value: (analytics?.recordedCalls ?? 0).toLocaleString(),
        sub: 'calls with audio',
        icon: <Volume2 className="h-5 w-5 text-sky-600" />,
        accent: 'bg-sky-50',
      },
    ],
    [analytics],
  )

  // ── Step 1: Department Scope Picker ─────────────────────────────────────────
  if (!selectedScope) {
    return (
      <div className="space-y-7 p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Select a Department</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Choose a department below to view its Airtel call list, or open every call at once.
            </p>
          </div>
        </div>

        {/* Show All Calls Banner */}
        <button
          type="button"
          onClick={() => selectScope(ALL_CALLS)}
          className="group flex w-full flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md cursor-pointer"
        >
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
            <PhoneCall className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-slate-900">Show All Calls</span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                All departments
              </span>
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              View the complete Airtel call list across every department
            </span>
          </span>
          <ChevronRight className="hidden sm:block h-5 w-5 flex-shrink-0 text-indigo-400 transition-all group-hover:translate-x-1" />
        </button>

        {/* Curated Departments Grid */}
        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Departments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEPARTMENT_BOXES.map(({ type, label, description, icon: Icon, tone }) => {
                const t = BOX_TONES[tone]
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => selectScope(type)}
                    className={`group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${t.border}`}
                  >
                    <span
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors group-hover:text-white ${t.badge} ${t.hover}`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">{label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5 truncate">{description}</span>
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 ${t.chevron}`}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Other Departments Select */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Building className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Other Departments</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every remaining department is still reachable here.
                </p>
              </div>
            </div>
            <div className="w-full sm:max-w-xs">
              <select
                onChange={(e) => {
                  if (e.target.value) selectScope(e.target.value)
                }}
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
              >
                <option value="" disabled>
                  Select a department...
                </option>
                {OTHER_DEPARTMENT_TYPES.map((d) => (
                  <option key={d.type} value={d.type}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Selected Department Calls & Analytics View ─────────────────────
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top action header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={backToDepartments}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900">
              {isAllCalls
                ? 'All Airtel Calls'
                : `${selectedDepartmentInfo?.label ?? 'Department'} Airtel Calls`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAllCalls
                ? 'Showing call records across every department.'
                : selectedDepartmentInfo?.description}
            </p>
          </div>
        </div>

        {!isAllCalls && (
          <button
            type="button"
            onClick={() => selectScope(ALL_CALLS)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
          >
            <PhoneCall className="h-4 w-4" /> Show All Calls
          </button>
        )}
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-slate-600">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Number, customer or session id"
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Status */}
          <div className="min-w-[130px]">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="ALL">All statuses</option>
              <option value="Answered">Answered</option>
              <option value="Missed">Missed</option>
            </select>
          </div>

          {/* Type */}
          <div className="min-w-[130px]">
            <label className="text-xs font-medium text-slate-600">Type</label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="ALL">All types</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Date range</label>
            <DepartmentDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={(s, e) => {
                setStartDate(s)
                setEndDate(e)
              }}
              onReset={() => {
                setStartDate(undefined)
                setEndDate(undefined)
              }}
            />
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Calls Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/70 text-slate-600 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Time</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Customer</th>
                <th className="px-4 py-3 text-left font-semibold">Caller</th>
                <th className="px-4 py-3 text-left font-semibold">Caller ID</th>
                <th className="px-4 py-3 text-left font-semibold">Destination</th>
                <th className="px-4 py-3 text-left font-semibold">Dest Circle</th>
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
                    <td colSpan={14} className="px-4 py-3">
                      <div className="h-6 w-full animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-rose-600">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6" />
                    {error}
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-slate-500">
                    No calls found for the selected filters.
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDateTime(c.callTimestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.overallCallStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={c.callType} />
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {c.customerName || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{c.callerNumber || '—'}</div>
                      {c.callerCircleName && (
                        <div className="text-xs text-slate-400">{c.callerCircleName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.airtelCallerId || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-medium">{c.destinationNumber || '—'}</div>
                      {c.destinationName && (
                        <div className="text-xs text-slate-400">{c.destinationName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.destinationCircleName || '—'}</td>
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
                          className="inline-flex items-center justify-center text-sky-600 hover:text-sky-700 transition-colors"
                          title="Open recording"
                        >
                          <Volume2 className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {c.participantCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                      {c.sessionId ? `${c.sessionId.slice(0, 14)}…` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => openDetail(c.id)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalElements > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-4 py-3 gap-3">
            <div className="text-xs text-slate-500">
              Showing {page * pageSize + 1} to{' '}
              {Math.min((page + 1) * pageSize, pagination.totalElements)} of{' '}
              {pagination.totalElements} calls
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
                className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={pagination?.first ?? true}
                className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-600 px-1">
                {page + 1} / {pagination?.totalPage || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination?.last ?? true}
                className="rounded border border-slate-200 px-3 py-1 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-indigo-600" /> Call Details
              </h3>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="space-y-3 py-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-5 w-full animate-pulse rounded bg-slate-100" />
                ))}
              </div>
            ) : !detail ? (
              <p className="py-6 text-center text-slate-500">Could not load this call details.</p>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detail.overallCallStatus} />
                  <TypeBadge type={detail.callType} />
                  <span className="text-xs text-slate-400 font-medium">
                    {formatDateTime(detail.callTimestamp)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <DetailField label="Caller" value={detail.callerNumber} />
                  <DetailField label="Destination" value={detail.destinationNumber} />
                  <DetailField label="Customer" value={detail.customerName} />
                  <DetailField label="Caller Circle" value={detail.callerCircleName} />
                  <DetailField label="Operator" value={detail.callerOperatorName} />
                  <DetailField label="Hangup Cause" value={detail.hangupCause} />
                  <DetailField
                    label="Total Duration"
                    value={detail.overallCallDuration || formatMs(detail.durationMs)}
                  />
                  <DetailField label="Talk Time" value={formatMs(detail.conversationDurationMs)} />
                  <DetailField label="Session ID" value={detail.sessionId} />
                </div>

                {detail.recordingUrl && (
                  <div>
                    <a
                      href={detail.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3.5 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                    >
                      <Volume2 className="h-4 w-4" /> Open Recording Audio
                    </a>
                  </div>
                )}

                {(detail.participants?.length ?? 0) > 0 && (
                  <div className="pt-2">
                    <h4 className="mb-2 text-sm font-bold text-slate-700">
                      Participants ({detail.participants?.length ?? 0})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase font-semibold">
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Address</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.participants ?? []).map((p) => (
                            <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono text-slate-500">
                                {p.participantIndex ?? '—'}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-700">
                                {p.participantAddress || '—'}
                                {p.participantName ? ` (${p.participantName})` : ''}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{p.participantType || '—'}</td>
                              <td className="px-3 py-2">
                                <StatusBadge status={p.status} />
                              </td>
                              <td className="px-3 py-2 text-slate-700 font-mono">
                                {formatMs(p.durationMs)}
                              </td>
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
