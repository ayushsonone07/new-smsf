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
import { RefreshButton } from '../../../components/ui/RefreshButton'

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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm shadow-emerald-500/10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Answered
      </span>
    )
  if (s === 'missed')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-sm shadow-rose-500/10">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        Missed
      </span>
    )
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200/60 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {status || '—'}
    </span>
  )
}

const TypeBadge = ({ type }: { type?: string | null }) => {
  const t = (type || '').toUpperCase()
  if (t === 'INBOUND')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200/80 px-2.5 py-1 text-xs font-bold text-sky-700 shadow-sm shadow-sky-500/10">
        <PhoneIncoming className="h-3.5 w-3.5 text-sky-500" /> Inbound
      </span>
    )
  if (t === 'OUTBOUND')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200/80 px-2.5 py-1 text-xs font-bold text-violet-700 shadow-sm shadow-violet-500/10">
        <PhoneOutgoing className="h-3.5 w-3.5 text-violet-500" /> Outbound
      </span>
    )
  return <span className="text-xs text-slate-400 font-medium">{type || '—'}</span>
}

const StatCard = ({
  icon,
  label,
  value,
  sub,
  accent,
  glow = 'hover:border-indigo-200 hover:shadow-indigo-500/10',
  topBar = 'bg-indigo-500',
}: {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  accent: string
  glow?: string
  topBar?: string
}) => (
  <div className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${glow}`}>
    <div className={`absolute top-0 left-0 right-0 h-1.5 ${topBar} opacity-90`} />
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-1.5 text-2xl font-black text-slate-800 tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs font-medium text-slate-500 truncate">{sub}</p>}
      </div>
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${accent} transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  </div>
)

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-0.5 text-sm font-bold text-slate-800 break-all">{value || '—'}</p>
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
  // Bumped by the refresh button to re-run the calls + analytics load below.
  const [reloadKey, setReloadKey] = useState(0)

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<AirtelCallDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

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
  }, [selectedScope, isAllCalls, buildQuery, analyticsQuery, page, pageSize, reloadKey])

  const loadDetail = (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    return getAirtelCallDetail(id)
      .then((res) => setDetail(res))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }

  const openDetail = (id: number) => {
    setDetailOpen(true)
    setDetailId(id)
    void loadDetail(id)
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
        icon: <PhoneCall className="h-5 w-5 text-white" />,
        accent: 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/25 text-white',
        glow: 'hover:border-indigo-300 hover:shadow-indigo-500/15',
        topBar: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      },
      {
        label: 'Answered',
        value: (analytics?.answeredCalls ?? 0).toLocaleString(),
        sub: `${analytics?.answerRate ?? 0}% answer rate`,
        icon: <TrendingUp className="h-5 w-5 text-white" />,
        accent: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 text-white',
        glow: 'hover:border-emerald-300 hover:shadow-emerald-500/15',
        topBar: 'bg-gradient-to-r from-emerald-500 to-teal-600',
      },
      {
        label: 'Missed',
        value: (analytics?.missedCalls ?? 0).toLocaleString(),
        sub: `${analytics?.otherCalls ?? 0} other`,
        icon: <PhoneMissed className="h-5 w-5 text-white" />,
        accent: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-md shadow-rose-500/25 text-white',
        glow: 'hover:border-rose-300 hover:shadow-rose-500/15',
        topBar: 'bg-gradient-to-r from-rose-500 to-red-600',
      },
      {
        label: 'Avg Duration',
        value: formatMs(analytics?.avgDurationMs),
        sub: `Talk time ${formatMs(analytics?.totalConversationMs)}`,
        icon: <Clock className="h-5 w-5 text-white" />,
        accent: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/25 text-white',
        glow: 'hover:border-amber-300 hover:shadow-amber-500/15',
        topBar: 'bg-gradient-to-r from-amber-400 to-orange-500',
      },
      {
        label: 'Recorded',
        value: (analytics?.recordedCalls ?? 0).toLocaleString(),
        sub: 'calls with audio',
        icon: <Volume2 className="h-5 w-5 text-white" />,
        accent: 'bg-gradient-to-br from-sky-400 to-blue-600 shadow-md shadow-sky-500/25 text-white',
        glow: 'hover:border-sky-300 hover:shadow-sky-500/15',
        topBar: 'bg-gradient-to-r from-sky-400 to-blue-600',
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            onClick={backToDepartments}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>Back</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
              {isAllCalls
                ? 'All Airtel Calls'
                : `${selectedDepartmentInfo?.label ?? 'Department'} Airtel Calls`}
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {isAllCalls
                ? 'Showing call records across every department.'
                : selectedDepartmentInfo?.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
        <RefreshButton
          onRefresh={() => setReloadKey((key) => key + 1)}
          isRefreshing={loading}
          label="calls"
          size={16}
          className="rounded-xl p-2.5 shadow-sm"
        />
        {!isAllCalls && (
          <button
            type="button"
            onClick={() => selectScope(ALL_CALLS)}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:brightness-105 active:scale-95 transition-all duration-200 cursor-pointer self-start sm:self-auto"
          >
            <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <PhoneCall className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
            <span>Show All Calls</span>
          </button>
        )}
        </div>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div
        className={`grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 transition-opacity ${loading ? 'opacity-60' : ''}`}
        aria-busy={loading}
      >
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 sm:p-5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
        <div className="flex flex-wrap items-end gap-3.5">
          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Search</label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Number, customer or session id"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Status */}
          <div className="min-w-[140px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="ALL">All statuses</option>
              <option value="Answered">Answered</option>
              <option value="Missed">Missed</option>
            </select>
          </div>

          {/* Type */}
          <div className="min-w-[140px]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Type</label>
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
            >
              <option value="ALL">All types</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Date range</label>
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
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180 text-slate-500 group-hover:text-indigo-600" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Calls Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-left">Type</th>
                <th className="px-5 py-3.5 text-left">Caller</th>
                <th className="px-5 py-3.5 text-left">Destination</th>
                <th className="px-5 py-3.5 text-center">Rec</th>
                <th className="px-5 py-3.5 text-center">Legs</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-7 w-full animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-rose-600">
                    <AlertCircle className="mx-auto mb-2 h-7 w-7 text-rose-500 animate-bounce" />
                    <p className="font-semibold">{error}</p>
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-500">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <PhoneCall className="h-6 w-6" />
                    </div>
                    <p className="font-semibold text-slate-700">No calls found</p>
                    <p className="mt-1 text-xs text-slate-400">Try adjusting your search filters or selected date range.</p>
                  </td>
                </tr>
              ) : (
                calls.map((c) => (
                  <tr
                    key={c.id}
                    className="group transition-all duration-150 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:via-sky-50/20 hover:to-transparent"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={c.overallCallStatus} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <TypeBadge type={c.callType} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          <Phone className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 tracking-tight">{c.callerNumber || '—'}</div>
                          {c.callerCircleName && (
                            <div className="text-[11px] font-medium text-slate-400">{c.callerCircleName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                          <PhoneOutgoing className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 tracking-tight">{c.destinationNumber || '—'}</div>
                          {c.destinationName && (
                            <div className="text-[11px] font-medium text-slate-400">{c.destinationName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {c.hasRecording && c.recordingUrl ? (
                        <a
                          href={c.recordingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-sky-50 border border-sky-200/70 text-sky-600 hover:bg-sky-100 hover:text-sky-700 shadow-sm hover:shadow-sky-500/20 active:scale-90 transition-all duration-150"
                          title="Play recording"
                        >
                          <Volume2 className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/60 px-2.5 py-1 text-xs font-bold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {c.participantCount ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openDetail(c.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 shadow-sm hover:shadow-indigo-500/15 active:scale-90 transition-all duration-150 cursor-pointer"
                        title="View Call Details"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-indigo-50/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">Call Details</h3>
                  <p className="text-xs font-medium text-slate-500">Comprehensive Airtel call session metadata</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
              {detailId !== null && (
                <RefreshButton
                  onRefresh={() => loadDetail(detailId)}
                  isRefreshing={detailLoading}
                  label="call details"
                />
              )}
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="text-slate-400 hover:text-slate-600 h-8 w-8 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {detailLoading ? (
                <div className="space-y-3 py-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-6 w-full animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : !detail ? (
                <p className="py-6 text-center text-slate-500">Could not load this call details.</p>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge status={detail.overallCallStatus} />
                    <TypeBadge type={detail.callType} />
                    <span className="text-xs text-slate-500 font-semibold bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-full">
                      {formatDateTime(detail.callTimestamp)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <DetailField label="Caller" value={detail.callerNumber} />
                    <DetailField label="Destination" value={detail.destinationNumber} />
                    <DetailField label="Customer" value={detail.customerName} />
                    <DetailField label="Caller ID" value={detail.airtelCallerId} />
                    <DetailField label="Caller Circle" value={detail.callerCircleName} />
                    <DetailField label="Dest Circle" value={detail.destinationCircleName} />
                    <DetailField label="Operator" value={detail.callerOperatorName} />
                    <DetailField label="Hangup Cause" value={detail.hangupCause} />
                    <DetailField
                      label="Total Duration"
                      value={detail.overallCallDuration || formatMs(detail.durationMs)}
                    />
                    <DetailField label="Talk Time" value={formatMs(detail.conversationDurationMs)} />
                    <div className="sm:col-span-2">
                      <DetailField label="Session ID" value={detail.sessionId} />
                    </div>
                  </div>

                  {detail.recordingUrl && (
                    <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-indigo-50/40 to-sky-50 p-4 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/25">
                          <Volume2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Call Audio Recording Available</p>
                          <p className="text-[11px] text-slate-500 font-medium">Listen to or download the full conversation</p>
                        </div>
                      </div>
                      <a
                        href={detail.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-500/35 hover:brightness-105 active:scale-95 transition-all"
                      >
                        <Volume2 className="h-3.5 w-3.5" /> Play Recording
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
        </div>
      )}
    </div>
  )
}
