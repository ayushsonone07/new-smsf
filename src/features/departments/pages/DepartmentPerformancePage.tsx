import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart2,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  Search,
} from 'lucide-react'
import {
  fetchDepartmentPerformance,
  type ServiceTypePerformanceItem,
  type DepartmentPerformancePageResponse,
} from '../../../api/department-performance.api'

function formatDepartmentName(dept?: string): string {
  if (!dept) return 'General'
  return dept
    .replace(/_DEPARTMENT$/i, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDepartmentColor(dept?: string) {
  const d = (dept || '').toUpperCase()
  if (d.includes('GOOGLE')) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (d.includes('WEBSITE')) return 'bg-cyan-50 text-cyan-700 border-cyan-200'
  if (d.includes('AUTOMATION')) return 'bg-purple-50 text-purple-700 border-purple-200'
  if (d.includes('SUPPORT')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (d.includes('SALES')) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (d.includes('SEO')) return 'bg-teal-50 text-teal-700 border-teal-200'
  if (d.includes('BILLING')) return 'bg-violet-50 text-violet-700 border-violet-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

export function DepartmentPerformancePage() {
  const [data, setData] = useState<DepartmentPerformancePageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchDepartmentPerformance({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        size,
      })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch department performance')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, page, size])

  useEffect(() => {
    loadData()
  }, [loadData])

  const rawRows: ServiceTypePerformanceItem[] = data?.data ?? []

  // Client-side quick search by service or department
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rawRows
    const q = search.toLowerCase()
    return rawRows.filter(
      (r) =>
        (r.serviceType || '').toLowerCase().includes(q) ||
        (r.departmentType || '').toLowerCase().includes(q),
    )
  }, [rawRows, search])

  // Aggregate stats across current dataset
  const aggregates = useMemo(() => {
    return rawRows.reduce(
      (acc, r) => ({
        totalCustomers: acc.totalCustomers + (r.totalCustomers || 0),
        completed: acc.completed + (r.completedCustomers || 0),
        inProgress: acc.inProgress + (r.inProgressCustomers || 0),
        pending: acc.pending + (r.pendingCustomers || 0),
        cancelled: acc.cancelled + (r.cancelledCustomers || 0) + (r.churnedCustomers || 0),
      }),
      { totalCustomers: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 },
    )
  }, [rawRows])

  const overallCompletionRate =
    aggregates.totalCustomers > 0
      ? Math.round((aggregates.completed / aggregates.totalCustomers) * 100)
      : 0

  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPage ?? 1

  const kpis = [
    {
      label: 'TOTAL CUSTOMERS',
      value: aggregates.totalCustomers,
      icon: Building2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      desc: 'Across active services',
    },
    {
      label: 'COMPLETED',
      value: aggregates.completed,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      desc: `${overallCompletionRate}% completion rate`,
    },
    {
      label: 'IN PROGRESS',
      value: aggregates.inProgress,
      icon: TrendingUp,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-100',
      desc: 'Active onboarding pipelines',
    },
    {
      label: 'PENDING',
      value: aggregates.pending,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      desc: 'Awaiting team action',
    },
    {
      label: 'CANCELLED / CHURN',
      value: aggregates.cancelled,
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      desc: 'Cancelled or inactive services',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* Top Banner / Breadcrumb */}
      <div>
        <nav className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
          <span>MBG Card</span>
          <span>&rsaquo;</span>
          <span>Management</span>
          <span>&rsaquo;</span>
          <span className="text-slate-600 font-medium">Department Performance</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <BarChart2 className="w-5 h-5" />
              </span>
              Department Performance Overview
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Service volume, customer delivery completion rates and operational bottlenecks
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {kpis.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`p-4 rounded-2xl border ${card.bg} bg-white shadow-xs transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  {card.label}
                </span>
                <span className={`p-1.5 rounded-lg ${card.color} bg-white shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tracking-tight">
                {card.value.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{card.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter service or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              From:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(0)
              }}
              className="py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
            />
            <span className="text-xs font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(0)
              }}
              className="py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {(startDate || endDate || search) && (
          <button
            type="button"
            onClick={() => {
              setStartDate('')
              setEndDate('')
              setSearch('')
              setPage(0)
            }}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            Clear Filters
          </button>
        )}
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Service Type</th>
                <th className="py-3 px-4 text-center">Pending</th>
                <th className="py-3 px-4 text-center">In Progress</th>
                <th className="py-3 px-4 text-center">Completed</th>
                <th className="py-3 px-4 text-center">Cancelled / Churn</th>
                <th className="py-3 px-4 text-center">Total Customers</th>
                <th className="py-3 px-4 w-44">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 w-24 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-8 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-8 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-8 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-8 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-12 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 w-32 bg-slate-200 rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BarChart2 className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No performance data found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No service records match the selected date range
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => {
                  const deptColor = getDepartmentColor(r.departmentType)
                  const total = r.totalCustomers || 0
                  const completed = r.completedCustomers || 0
                  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
                  const rowNum = page * size + idx + 1

                  return (
                    <tr
                      key={`${r.departmentType}-${r.serviceType}-${idx}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {rowNum}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${deptColor}`}
                        >
                          {formatDepartmentName(r.departmentType)}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {r.serviceType}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          {r.pendingCustomers ?? 0}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                          {r.inProgressCustomers ?? 0}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {r.completedCustomers ?? 0}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {(r.cancelledCustomers ?? 0) + (r.churnedCustomers ?? 0)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono text-xs">
                        {total.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rate >= 70
                                  ? 'bg-emerald-500'
                                  : rate >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold text-slate-700 w-10 text-right">
                            {rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value))
                setPage(0)
              }}
              className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              {[10, 20, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
            <span>
              Showing {rawRows.length > 0 ? page * size + 1 : 0}–
              {Math.min((page + 1) * size, totalElements)} of {totalElements}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="px-2 text-slate-700 font-medium">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

