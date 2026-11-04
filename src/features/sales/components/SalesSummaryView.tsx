import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  PhoneOff,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Filter,
  DollarSign,
  Briefcase,
  UserCheck,
  ChevronRight,
  ArrowUpRight,
  Target,
  BarChart3,
  Layers,
  ChevronDown,
  Check,
  X,
} from 'lucide-react'
import {
  fetchSalesHeadSummary,
  type SalesHeadSummaryResponse,
  type TelecallerItem,
} from '../../../api/sales-summary.api'
import { fetchFunnels, type FunnelItem } from '../../../api/leads.api'
import { DateRangePicker } from '../../../components/head/customers-list/CustomersListFilters'
import '../../customers/pages/AdminCustomersPage.css'

function formatRupees(amount?: number | string | null): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

function formatRepLabel(name?: string, email?: string): string {
  const n = (name || '').trim()
  const e = (email || '').trim()

  if (n && !n.includes('@')) {
    return n
  }

  const target = n || e
  if (!target) return 'All Team Members'

  if (target.includes('@')) {
    const prefix = target.split('@')[0]
    const parts = prefix.split(/[._-]/).filter(Boolean)
    if (parts.length > 1) {
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    }
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }

  return target
}

interface SearchableDropdownOption {
  value: string
  label: string
  subLabel?: string
  initial?: string
}

interface SearchableDropdownProps {
  value: string
  onChange: (value: string) => void
  options: SearchableDropdownOption[]
  allLabel: string
  searchPlaceholder?: string
  prefixIcon?: React.ReactNode
}

function SearchableDropdown({
  value,
  onChange,
  options,
  allLabel,
  searchPlaceholder = 'Search...',
  prefixIcon,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selectedOption = options.find(
    (opt) => opt.value.toLowerCase() === (value || '').toLowerCase()
  )
  const displayLabel = !value || value === 'all' ? allLabel : selectedOption?.label || value

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 250
      const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight
      const width = Math.max(rect.width, 220)
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
      setMenuPos({
        top: openUpwards ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left,
        width,
      })
      setSearch('')
      setIsOpen(true)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const handleClose = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleScroll = (e: Event) => {
      if (
        menuRef.current &&
        (menuRef.current === e.target || menuRef.current.contains(e.target as Node))
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleResize = () => setIsOpen(false)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClose)
    document.addEventListener('touchstart', handleClose)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClose)
      document.removeEventListener('touchstart', handleClose)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    )
  }, [options, search])

  const isSelectedActive = Boolean(value && value !== 'all')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`h-9 px-3 min-w-[170px] max-w-[240px] bg-white border rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs ${
          isSelectedActive
            ? 'bg-blue-50/60 border-blue-400 text-blue-900 font-semibold ring-2 ring-blue-500/10'
            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
        title={displayLabel}
      >
        <span className="flex items-center gap-1.5 truncate text-left font-medium min-w-0">
          {prefixIcon && <span className="shrink-0">{prefixIcon}</span>}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              minWidth: '200px',
              maxWidth: '280px',
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {options.length > 5 && (
              <div className="relative mb-1">
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-7 pl-2 pr-6 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            <div
              onScroll={(e) => e.stopPropagation()}
              className="max-h-[190px] overflow-y-auto space-y-0.5 custom-scrollbar"
            >
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className={`w-full px-2.5 py-1.5 flex items-center justify-between text-xs rounded-lg transition-colors cursor-pointer ${
                  !value || value === 'all'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{allLabel}</span>
                {(!value || value === 'all') && (
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1.5" />
                )}
              </button>

              {filteredOptions.length === 0 ? (
                <div className="py-2.5 text-center text-xs text-slate-400">No results found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = Boolean(value && opt.value.toLowerCase() === value.toLowerCase())

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value)
                        setIsOpen(false)
                      }}
                      className={`w-full px-2 py-1.5 flex items-center justify-between text-xs rounded-lg transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {opt.initial ? (
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                            {opt.initial}
                          </div>
                        ) : null}
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{opt.label}</span>
                          {opt.subLabel && (
                            <span className="text-[10px] text-slate-400 truncate font-normal">
                              {opt.subLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1.5" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

export function SalesSummaryView() {
  const [data, setData] = useState<SalesHeadSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [totalSummary, setTotalSummary] = useState(true)
  const [departmentUser, setDepartmentUser] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedFunnel, setSelectedFunnel] = useState<string>('all')
  const [funnels, setFunnels] = useState<FunnelItem[]>([])

  useEffect(() => {
    fetchFunnels().then((list) => setFunnels(list)).catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const formatIsoStart = (d?: string) => {
        if (!d) return undefined
        if (d.includes('T')) return d
        return new Date(`${d}T00:00:00`).toISOString()
      }
      const formatIsoEnd = (d?: string) => {
        if (!d) return undefined
        if (d.includes('T')) return d
        return new Date(`${d}T23:59:59.999`).toISOString()
      }

      const res = await fetchSalesHeadSummary({
        totalSummary,
        departmentUser: departmentUser || undefined,
        startDate: formatIsoStart(startDate),
        endDate: formatIsoEnd(endDate),
        funnelType: selectedFunnel !== 'all' ? selectedFunnel : undefined,
      })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales summary')
    } finally {
      setLoading(false)
    }
  }, [totalSummary, departmentUser, startDate, endDate, selectedFunnel])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalLeads = data?.totalLeads ?? 0
  const completedLeads = data?.completedLeads ?? 0
  const doneLeads = data?.doneLeads ?? 0
  const followUpLeads = data?.followUpLeads ?? 0
  const onProcessLeads = data?.onProcessLeads ?? 0
  const pendingLeads = data?.pendingLeads ?? 0
  const notConnectedLeads = data?.notConnectedLeads ?? 0
  const notInterestedLeads = data?.notInterestedLeads ?? 0

  const telecallers: TelecallerItem[] = data?.telecallers || data?.telecaller || []
  const deptUsers: string[] = data?.departmentUsers || []

  const agentOptions: SearchableDropdownOption[] = useMemo(() => {
    return deptUsers.map((user) => {
      const formatted = formatRepLabel('', user)
      return {
        value: user,
        label: formatted,
        subLabel: formatted !== user ? user : undefined,
        initial: user.charAt(0).toUpperCase(),
      }
    })
  }, [deptUsers])

  const funnelOptions: SearchableDropdownOption[] = useMemo(() => {
    return funnels.map((f, i) => {
      const name = f.funnelName || f.funnelType || ''
      return {
        value: name,
        label: name,
      }
    })
  }, [funnels])

  const conversionPct =
    totalLeads > 0
      ? Math.round(((completedLeads + doneLeads) / totalLeads) * 100)
      : 0

  const statusCards = [
    {
      label: 'COMPLETED & SALE WON',
      value: completedLeads + doneLeads,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      barColor: 'bg-emerald-500',
      share: totalLeads > 0 ? Math.round(((completedLeads + doneLeads) / totalLeads) * 100) : 0,
    },
    {
      label: 'FOLLOW UP',
      value: followUpLeads,
      icon: Clock,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-100',
      barColor: 'bg-sky-500',
      share: totalLeads > 0 ? Math.round((followUpLeads / totalLeads) * 100) : 0,
    },
    {
      label: 'ON PROCESS',
      value: onProcessLeads,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      barColor: 'bg-indigo-500',
      share: totalLeads > 0 ? Math.round((onProcessLeads / totalLeads) * 100) : 0,
    },
    {
      label: 'PENDING',
      value: pendingLeads,
      icon: Layers,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      barColor: 'bg-amber-500',
      share: totalLeads > 0 ? Math.round((pendingLeads / totalLeads) * 100) : 0,
    },
    {
      label: 'NOT CONNECTED',
      value: notConnectedLeads,
      icon: PhoneOff,
      color: 'text-slate-600',
      bg: 'bg-slate-50 border-slate-200',
      barColor: 'bg-slate-400',
      share: totalLeads > 0 ? Math.round((notConnectedLeads / totalLeads) * 100) : 0,
    },
    {
      label: 'NOT INTERESTED',
      value: notInterestedLeads,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      barColor: 'bg-rose-500',
      share: totalLeads > 0 ? Math.round((notInterestedLeads / totalLeads) * 100) : 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </span>
            Sales Performance Summary
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Executive revenue overview, funnel status metrics, and agent performance
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          Refresh
        </button>
      </div>

      {/* Revenue Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-linear-to-br from-indigo-900 to-indigo-800 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 opacity-10">
            <DollarSign className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Total Revenue
            </span>
            <div className="text-2xl lg:text-3xl font-extrabold mt-1 tracking-tight font-mono">
              {formatRupees(data?.totalRevenue ?? data?.overallRevenue ?? 0)}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-200">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>Overall pipeline sales volume</span>
            </div>
          </div>
        </div>

        {/* Current Month Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current Month Revenue
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight font-mono">
            {formatRupees(data?.currentMonthRevenue ?? 0)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active month accrual</span>
          </div>
        </div>

        {/* Last Month Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Last Month Revenue
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight font-mono">
            {formatRupees(data?.lastMonthRevenue ?? 0)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>Previous billing cycle</span>
          </div>
        </div>

        {/* Leads Conversion Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm relative overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Conversion Rate
          </span>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight font-mono">
            {conversionPct}%
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
            <Target className="w-4 h-4" />
            <span>{completedLeads + doneLeads} of {totalLeads} leads closed</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Department User Dropdown */}
            {deptUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Agent:</span>
                <SearchableDropdown
                  value={departmentUser}
                  onChange={(val) => {
                    setDepartmentUser(val)
                    setTotalSummary(false)
                  }}
                  options={agentOptions}
                  allLabel="All Team Members"
                  searchPlaceholder="Search agent..."
                />
              </div>
            )}

            {/* Funnel Type Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Funnel:</span>
              <SearchableDropdown
                value={selectedFunnel === 'all' ? '' : selectedFunnel}
                onChange={(val) => {
                  setSelectedFunnel(val || 'all')
                  setTotalSummary(false)
                }}
                options={funnelOptions}
                allLabel="All Funnels"
                searchPlaceholder="Search funnel..."
              />
            </div>

            {/* Date Range Picker (Synced with Leads Management) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Date Range:
              </span>
              <div className="leads-filter-date-picker relative z-30 min-w-[220px]">
                <DateRangePicker
                  label="Date Range"
                  from={startDate}
                  to={endDate}
                  onChange={(start, end) => {
                    setStartDate(start)
                    setEndDate(end)
                    setTotalSummary(false)
                  }}
                  onReset={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                />
              </div>
            </div>
          </div>

          {/* Toggle All Time / Total Summary */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTotalSummary(true)
                setStartDate('')
                setEndDate('')
                setDepartmentUser('')
                setSelectedFunnel('all')
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                totalSummary && !startDate && !endDate && !departmentUser && selectedFunnel === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All-Time Summary
            </button>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadData()}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Lead Status Breakdown Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          Lead Stage Distribution
          <span className="text-xs font-normal text-slate-400">({totalLeads} total leads)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statusCards.map((st) => {
            const Icon = st.icon
            return (
              <div
                key={st.label}
                className={`p-3.5 rounded-2xl border ${st.bg} bg-white shadow-xs flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                      {st.label}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${st.color}`} />
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono">
                    {st.value.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${st.barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, st.share))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium text-right mt-1">
                    {st.share}% of leads
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Telecaller / Agent Performance Table */}
      {telecallers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Telecaller & Agent Productivity
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {telecallers.length} active agent{telecallers.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Agent Name / User</th>
                  <th className="py-3 px-4 text-center">Total Assigned</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">Follow-up</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Not Connected</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {telecallers.map((t, idx) => {
                  const agentTotal = t.totalLeads ?? 0
                  const agentDone = t.completedLeads ?? 0
                  const rate = agentTotal > 0 ? Math.round((agentDone / agentTotal) * 100) : 0

                  return (
                    <tr key={t.id || t.username || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                          {(t.name || t.username || 'A')[0]}
                        </div>
                        <div>
                          <div>{t.name || t.username || 'Agent'}</div>
                          {t.username && t.name && (
                            <div className="text-[11px] text-slate-400 font-normal">{t.username}</div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-800">
                        {agentTotal}
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                        {agentDone}
                        {rate > 0 && (
                          <span className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                            {rate}%
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-sky-600">
                        {t.followUpLeads ?? 0}
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-amber-600">
                        {t.pendingLeads ?? 0}
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-slate-500">
                        {t.notConnectedLeads ?? 0}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {t.revenue ? formatRupees(t.revenue) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

