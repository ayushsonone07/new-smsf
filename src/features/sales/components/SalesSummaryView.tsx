import React, { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import {
  fetchSalesHeadSummary,
  type SalesHeadSummaryResponse,
  type TelecallerItem,
} from '../../../api/sales-summary.api'

function formatRupees(amount?: number | string | null): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchSalesHeadSummary({
        totalSummary,
        departmentUser: departmentUser || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales summary')
    } finally {
      setLoading(false)
    }
  }, [totalSummary, departmentUser, startDate, endDate])

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

  const conversionPct =
    totalLeads > 0
      ? Math.round(((completedLeads + doneLeads) / totalLeads) * 100)
      : 0

  const statusCards = [
    {
      label: 'COMPLETED & DONE',
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
                <select
                  value={departmentUser}
                  onChange={(e) => setDepartmentUser(e.target.value)}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                >
                  <option value="">All Team Members</option>
                  {deptUsers.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Pickers */}
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
                  setTotalSummary(false)
                }}
                className="py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setTotalSummary(false)
                }}
                className="py-1 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
              />
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
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                totalSummary && !startDate && !endDate && !departmentUser
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

