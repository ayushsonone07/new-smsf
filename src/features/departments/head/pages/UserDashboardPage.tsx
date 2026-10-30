import { useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '../../../../app/auth/session'
import { useOnboardingDashboardSummary } from '../../hooks/useOnboardingDashboardSummary'
import { useOnboardingDashboardMembers } from '../../hooks/useOnboardingDashboardMembers'
import { getDepartmentSummary } from '../../../../api/service-flow.api'
import { RecurringDashboardPage } from './RecurringDashboardPage'
import { DashboardHeader } from '../../../../components/head/dashboard/DashboardHeader'
import { DashboardStatCards } from '../../../../components/head/dashboard/DashboardStatCards'
import { OnboardingTrend } from '../../../../components/head/dashboard/OnboardingTrend'
import { TeamTargetAchievement } from '../../../../components/head/dashboard/TeamTargetAchievement'
import { StatusBreakdown } from '../../../../components/head/dashboard/StatusBreakdown'
import { MostActiveDay } from '../../../../components/head/dashboard/MostActiveDay'
import { DelayWhoseSide } from '../../../../components/head/dashboard/DelayWhoseSide'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import type { OnboardingSummaryKpis } from '../../types/onboarding-dashboard.types'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import { resolveDeptFromPath, buildDepartmentRoute } from '../utils/routeUtils'
import { useNavigate } from '@tanstack/react-router'
import {
  Users,
  Clock,
  Activity,
  CheckCircle,
  RefreshCw,
  Globe,
  Bot,
  Layers,
  TrendingUp,
  BarChart2,
  ArrowRight,
} from 'lucide-react'
import {
  fetchAutomationCount,
  fetchLightAutowebisionCustomers,
} from '../../../../api/autowebsion.api'
import '../../../../components/head/dashboard/Dashboard.css'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const EMPTY_KPIS: OnboardingSummaryKpis = {
  totalCustomers: 0,
  totalOnboarded: 0,
  totalCompleted: 0,
  totalInProgress: 0,
  totalPending: 0,
  totalDelayed: 0,
  presentUsers: 0,
  absentUsers: 0,
}

interface DateRange {
  startDate?: string
  endDate?: string
  allTime?: boolean
}

/** Local-timezone `YYYY-MM-DD` (UTC slicing would shift the day). */
function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/**
 * Period dropdown → `startDate` / `endDate` of the summary API.
 * "Custom range" has no date picker yet — it falls back to the
 * last 7 days.
 */
function rangeFor(period: string, customRange?: { from: string; to: string }): DateRange {
  const today = new Date()
  const end = toIsoDate(today)

  switch (period) {
    case 'Last 7 days':
      return {
        startDate: toIsoDate(shiftDays(today, -6)),
        endDate: end,
      }
    case 'Custom range':
      return customRange?.from && customRange?.to
        ? { startDate: customRange.from, endDate: customRange.to }
        : { startDate: end, endDate: end }
    case 'This month':
      return {
        startDate: toIsoDate(
          new Date(today.getFullYear(), today.getMonth(), 1),
        ),
        endDate: end,
      }
    case 'All time':
      return { allTime: true }
    default:
      return { startDate: end, endDate: end }
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function num(value: number | undefined): string {
  return (value ?? 0).toLocaleString('en-US')
}

/** "▲ 12.5%" pill, empty string hides the pill. */
function growthLabel(
  current: number,
  previous: number,
): string {
  if (!previous) return ''
  const pct = ((current - previous) / previous) * 100
  return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`
}

function percent(part: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

function SemiGauge({ pct }: { pct: number }) {
  const r = 68
  const cx = 90
  const cy = 85
  const circ = Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const offset = circ * (1 - clamped / 100)
  return (
    <svg width="180" height="105" viewBox="0 0 180 105" className="overflow-visible">
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="#10b981"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${circ}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill="#0f172a"
        style={{ fontSize: 24, fontWeight: 700 }}
      >
        {clamped}%
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        fill="#94a3b8"
        style={{ fontSize: 11, fontWeight: 500 }}
      >
        avg performance
      </text>
    </svg>
  )
}

function AutowebsionUserDashboard({ rawDepartment }: { rawDepartment: string }) {
  const session = getSession()
  const userEmail = session?.user.email || session?.user.username || ''
  const navigate = useNavigate()

  const query = useQuery({
    queryKey: ['userAutomationCount', userEmail],
    queryFn: () => fetchAutomationCount(userEmail),
    enabled: Boolean(userEmail),
  })

  const countData = query.data || []
  const webEntry = countData.find((c) => c.serviceCategory?.toUpperCase() === 'WEBSITE') || {
    serviceCategory: 'WEBSITE',
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  }
  const autoEntry = countData.find((c) => c.serviceCategory?.toUpperCase() === 'AUTOMATION') || {
    serviceCategory: 'AUTOMATION',
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  }
  const allEntry = countData.find((c) => c.serviceCategory?.toUpperCase() === 'AUTOWEBSION') || {
    serviceCategory: 'AUTOWEBSION',
    total: webEntry.total + autoEntry.total,
    pending: webEntry.pending + autoEntry.pending,
    inProgress: webEntry.inProgress + autoEntry.inProgress,
    completed: webEntry.completed + autoEntry.completed,
  }

  const hasWebsiteAssigned = webEntry.total > 0 || rawDepartment.toUpperCase().includes('WEBSITE')
  const hasAutomationAssigned = autoEntry.total > 0 || rawDepartment.toUpperCase().includes('AUTOMATION')
  const hasBoth =
    (hasWebsiteAssigned && hasAutomationAssigned) ||
    (!hasWebsiteAssigned && !hasAutomationAssigned && rawDepartment.toUpperCase().includes('AUTOWEB'))

  const [tab, setTab] = useState<'ALL' | 'WEBSITE' | 'AUTOMATION'>(
    hasBoth ? 'ALL' : hasAutomationAssigned ? 'AUTOMATION' : 'WEBSITE',
  )
  const [chartMode, setChartMode] = useState<'bar' | 'realtime'>('bar')

  const userCustomersQuery = useQuery({
    queryKey: ['userAutowebCustomers', tab, userEmail],
    queryFn: () => {
      const dept =
        tab === 'WEBSITE'
          ? 'WEBSITE_DEPARTMENT'
          : tab === 'AUTOMATION'
            ? 'AUTOMATION_DEPARTMENT'
            : undefined
      return fetchLightAutowebisionCustomers({
        page: 0,
        size: 5,
        departmentType: dept,
        assignedUserEmail: userEmail,
      })
    },
    enabled: Boolean(userEmail),
  })

  if (query.isPending) {
    return <LoadingState message="Loading your personal dashboard..." />
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Unable to load dashboard"
        message={query.error.message}
        onRetry={() => {
          void query.refetch()
          void userCustomersQuery.refetch()
        }}
      />
    )
  }

  const activeEntry = tab === 'WEBSITE' ? webEntry : tab === 'AUTOMATION' ? autoEntry : allEntry
  const completionRate =
    activeEntry.total > 0 ? Math.round((activeEntry.completed / activeEntry.total) * 100) : 0
  const inProgressRate =
    activeEntry.total > 0 ? Math.round((activeEntry.inProgress / activeEntry.total) * 100) : 0
  const efficiencyScore =
    activeEntry.total > 0
      ? Math.round(((activeEntry.completed + activeEntry.inProgress) / activeEntry.total) * 100)
      : 0
  const avgPerformance = Math.round((completionRate + efficiencyScore) / 2)
  // Light "refreshing" state for the sections fed by the counts query.
  const countsDimClass = query.isFetching ? ' opacity-60 pointer-events-none' : ''

  return (
    <motion.div
      className="p-6 max-w-7xl mx-auto space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Top Banner */}
      <motion.div
        variants={sectionVariants}
        className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-md">
            <TrendingUp className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              Department Dashboard 👋
            </h1>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
              Welcome back, <span className="font-semibold text-slate-700">{session?.user.name || 'User'}</span>. Here is your personal task & performance overview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            {hasBoth ? (
              <>
                <Layers size={13} />
                <span>Website & Automation</span>
              </>
            ) : hasAutomationAssigned ? (
              <>
                <Bot size={13} />
                <span>Automation User</span>
              </>
            ) : (
              <>
                <Globe size={13} />
                <span>Website User</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              void query.refetch()
              void userCustomersQuery.refetch()
            }}
            disabled={query.isFetching || userCustomersQuery.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} className={query.isFetching || userCustomersQuery.isFetching ? 'animate-spin text-blue-600' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* Tabs if user has both assigned */}
      {hasBoth && (
        <motion.div variants={sectionVariants} className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setTab('ALL')
                void query.refetch()
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'ALL'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={14} />
              <span>Autowebsion ({allEntry.total})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('WEBSITE')
                void query.refetch()
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'WEBSITE'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe size={14} />
              <span>Website ({webEntry.total})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('AUTOMATION')
                void query.refetch()
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tab === 'AUTOMATION'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot size={14} />
              <span>Automation ({autoEntry.total})</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* 4 KPI Cards */}
      <motion.div variants={sectionVariants} className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity${countsDimClass}`}>
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</span>
            <div className="p-2.5 rounded-xl text-white bg-blue-600 shadow-xs">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">{activeEntry.total.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{completionRate}% completion rate</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Services</span>
            <div className="p-2.5 rounded-xl text-white bg-amber-500 shadow-xs">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-600">{activeEntry.pending.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Awaiting action</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="p-2.5 rounded-xl text-white bg-indigo-600 shadow-xs">
              <Activity size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-indigo-600">{activeEntry.inProgress.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{inProgressRate}% actively processing</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Services</span>
            <div className="p-2.5 rounded-xl text-white bg-emerald-600 shadow-xs">
              <CheckCircle size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-600">{activeEntry.completed.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{completionRate}% successfully delivered</p>
          </div>
        </div>
      </motion.div>

      {/* Performance Summary & Analytics */}
      <motion.div variants={sectionVariants} className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity${countsDimClass}`}>
        {/* Performance Summary */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg text-white shadow-xs">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Performance Summary</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Metrics</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
            <div className="flex-shrink-0 flex justify-center">
              <SemiGauge pct={avgPerformance} />
            </div>
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Completion rate</p>
                    <p className="text-[11px] text-slate-400">Services delivered</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-purple-600">{completionRate}%</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Efficiency score</p>
                    <p className="text-[11px] text-slate-400">Active vs pending</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-600">{efficiencyScore}%</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">Pending services</p>
                    <p className="text-[11px] text-slate-400">Awaiting action</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-600">{activeEntry.pending}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Analytics */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white shadow-xs">
                <BarChart2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Service Analytics</h3>
                <p className="text-[11px] text-slate-500">Breakdown of assigned customer tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartMode === 'bar' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bar
              </button>
              <button
                type="button"
                onClick={() => setChartMode('realtime')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  chartMode === 'realtime' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Real-time
              </button>
            </div>
          </div>

          {chartMode === 'bar' ? (
            <div className="space-y-4 my-auto">
              {hasBoth ? (
                <>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-blue-700 flex items-center gap-1.5"><Globe size={13} /> Website ({webEntry.total})</span>
                      <span className="text-slate-500">{webEntry.completed} completed ({webEntry.total > 0 ? Math.round((webEntry.completed / webEntry.total) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                      <div style={{ width: `${webEntry.total > 0 ? (webEntry.completed / webEntry.total) * 100 : 0}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${webEntry.total > 0 ? (webEntry.inProgress / webEntry.total) * 100 : 0}%` }} className="bg-indigo-500 h-full" />
                      <div style={{ width: `${webEntry.total > 0 ? (webEntry.pending / webEntry.total) * 100 : 0}%` }} className="bg-amber-400 h-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-purple-700 flex items-center gap-1.5"><Bot size={13} /> Automation ({autoEntry.total})</span>
                      <span className="text-slate-500">{autoEntry.completed} completed ({autoEntry.total > 0 ? Math.round((autoEntry.completed / autoEntry.total) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                      <div style={{ width: `${autoEntry.total > 0 ? (autoEntry.completed / autoEntry.total) * 100 : 0}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${autoEntry.total > 0 ? (autoEntry.inProgress / autoEntry.total) * 100 : 0}%` }} className="bg-indigo-500 h-full" />
                      <div style={{ width: `${autoEntry.total > 0 ? (autoEntry.pending / autoEntry.total) * 100 : 0}%` }} className="bg-amber-400 h-full" />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700 font-bold">{activeEntry.serviceCategory} ({activeEntry.total})</span>
                    <span className="text-slate-500">{activeEntry.completed} completed</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                    <div style={{ width: `${activeEntry.total > 0 ? (activeEntry.completed / activeEntry.total) * 100 : 0}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${activeEntry.total > 0 ? (activeEntry.inProgress / activeEntry.total) * 100 : 0}%` }} className="bg-indigo-500 h-full" />
                    <div style={{ width: `${activeEntry.total > 0 ? (activeEntry.pending / activeEntry.total) * 100 : 0}%` }} className="bg-amber-400 h-full" />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Completed</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> In Progress</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Pending</span>
              </div>
            </div>
          ) : (
            <div className="flex items-end justify-around h-36 pt-2 border-b border-slate-100">
              {[
                { label: 'Total', val: activeEntry.total, color: 'bg-blue-500' },
                { label: 'Done', val: activeEntry.completed, color: 'bg-emerald-500' },
                { label: 'Active', val: activeEntry.inProgress, color: 'bg-indigo-500' },
                { label: 'Pending', val: activeEntry.pending, color: 'bg-amber-400' },
              ].map((bar) => {
                const maxVal = Math.max(activeEntry.total, 1)
                const h = Math.max(14, Math.round((bar.val / maxVal) * 95))
                return (
                  <div key={bar.label} className="flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700">{bar.val}</span>
                    <div
                      className={`w-10 rounded-t-md transition-all duration-500 ${bar.color}`}
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{bar.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Action Navigation Links */}
      <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasWebsiteAssigned && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/70 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-blue-600 rounded-xl text-white shadow-xs">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Website Customers ({webEntry.total})</h4>
                <p className="text-xs text-slate-600">View and update your assigned website customer tasks</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = buildDepartmentRoute('website-customers', rawDepartment, 'USER')
                navigate({ to: target as never })
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>View List</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {hasAutomationAssigned && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/70 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-purple-600 rounded-xl text-white shadow-xs">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Automation Customers ({autoEntry.total})</h4>
                <p className="text-xs text-slate-600">View and update your assigned automation customer tasks</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = buildDepartmentRoute('automation-customers', rawDepartment, 'USER')
                navigate({ to: target as never })
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span>View List</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

/**
 * Personal dashboard of a logged-in department USER — routes between
 * Autowebsion / Website / Automation personal dashboard and standard dashboard.
 */
export function UserDashboardPage() {
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const rawDepartment = session?.user.departmentType || deptFromUrl || ''
  const isAutowebsion = Boolean(
    rawDepartment && (
      rawDepartment.toUpperCase().includes('AUTOWEB') ||
      rawDepartment.toUpperCase().includes('WEBSITE') ||
      rawDepartment.toUpperCase().includes('AUTOMATION')
    ) ||
    (typeof window !== 'undefined' && (
      window.location.pathname.includes('autoweb') ||
      window.location.pathname.includes('website') ||
      window.location.pathname.includes('automation')
    ))
  )

  const isRecurring = Boolean(rawDepartment && rawDepartment.toUpperCase().includes('RECURRING')) || (typeof window !== 'undefined' && window.location.pathname.includes('recurring'))
  if (isRecurring) {
    return <RecurringDashboardPage />
  }
  if (isAutowebsion) {
    return <AutowebsionUserDashboard rawDepartment={rawDepartment} />
  }

  return <StandardUserDashboard rawDepartment={rawDepartment} />
}

function StandardUserDashboard({ rawDepartment }: { rawDepartment: string }) {
  const [datePeriod, setDatePeriod] = useState('Today')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const session = getSession()
  const name = session?.user.name ?? 'there'
  const isGoogle =
    rawDepartment.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/google-user') ||
        window.location.pathname.startsWith('/google')))

  const range = useMemo(
    () => rangeFor(datePeriod, customRange),
    [datePeriod, customRange],
  )
  const summaryParams = useMemo(
    () => ({
      department: 'ONBOARDING_DEPARTMENT',
      startDate: range.startDate,
      endDate: range.endDate,
      allTime: range.allTime,
    }),
    [range],
  )
  const query = useOnboardingDashboardSummary(summaryParams, { enabled: !isGoogle })

  const membersParams = useMemo(
    () => ({
      department: 'ONBOARDING_DEPARTMENT',
      page: 0,
      size: 10,
      startDate: range.startDate,
      endDate: range.endDate,
      allTime: range.allTime,
    }),
    [range],
  )
  const membersQuery = useOnboardingDashboardMembers(membersParams, { enabled: !isGoogle })

  const googleQuery = useQuery({
    queryKey: ['department-summary', range.startDate, range.endDate, range.allTime],
    queryFn: () =>
      getDepartmentSummary({
        startDate: range.allTime ? undefined : (range.startDate ? `${range.startDate}T00:00:00` : undefined),
        endDate: range.allTime ? undefined : (range.endDate ? `${range.endDate}T23:59:59` : undefined),
      }),
    enabled: isGoogle,
  })

  const { isColumnEnabled, refetch: refetchPermissions } =
    useDepartmentColumnPermissions(isGoogle ? 'GOOGLE_DEPARTMENT' : 'ONBOARDING_DEPARTMENT')
  const isStatusVisible = isColumnEnabled('Status')

  if (isGoogle) {
    if (googleQuery.isPending) {
      return <LoadingState message="Loading your dashboard..." />
    }
    if (googleQuery.isError) {
      return (
        <ErrorState
          title="Unable to load dashboard"
          message={googleQuery.error.message}
          onRetry={() => {
            void googleQuery.refetch()
          }}
        />
      )
    }
  } else {
    if (query.isPending || membersQuery.isPending) {
      return <LoadingState message="Loading your dashboard..." />
    }
    if (query.isError) {
      return (
        <ErrorState
          title="Unable to load dashboard"
          message={query.error.message}
          onRetry={() => {
            void query.refetch()
            void membersQuery.refetch()
            void refetchPermissions()
          }}
        />
      )
    }
  }

  const summary = query.data
  const googleSummary = googleQuery.data

  const kpis: OnboardingSummaryKpis = isGoogle
    ? {
        totalCustomers: googleSummary?.totalCustomers ?? 0,
        totalOnboarded: googleSummary?.completedServices ?? 0,
        totalCompleted: googleSummary?.completedServices ?? 0,
        totalInProgress: googleSummary?.inProgressServices ?? 0,
        totalPending: googleSummary?.pendingServices ?? 0,
        totalDelayed: googleSummary?.followUps ?? 0,
        presentUsers: googleSummary?.presentUsers ?? 1,
        absentUsers: googleSummary?.absentUsers ?? 0,
      }
    : (summary?.kpis ?? EMPTY_KPIS)

  const trend = summary?.trend
  const target = isGoogle
    ? {
        target: googleSummary?.target ?? 0,
        achieved: googleSummary?.completedServices ?? 0,
        remaining: Math.max(0, (googleSummary?.target ?? 0) - (googleSummary?.completedServices ?? 0)),
        percentage:
          (googleSummary?.target ?? 0) > 0
            ? Math.round(
                ((googleSummary?.completedServices ?? 0) / (googleSummary?.target ?? 1)) * 100,
              )
            : 0,
      }
    : summary?.teamTarget

  const totalGoogleTasks =
    (googleSummary?.pendingServices ?? 0) +
    (googleSummary?.inProgressServices ?? 0) +
    (googleSummary?.completedServices ?? 0) +
    (googleSummary?.followUps ?? 0)

  const breakdown = isGoogle
    ? {
        pending: {
          count: googleSummary?.pendingServices ?? 0,
          percentage:
            totalGoogleTasks > 0
              ? ((googleSummary?.pendingServices ?? 0) / totalGoogleTasks) * 100
              : 0,
        },
        inProgress: {
          count: googleSummary?.inProgressServices ?? 0,
          percentage:
            totalGoogleTasks > 0
              ? ((googleSummary?.inProgressServices ?? 0) / totalGoogleTasks) * 100
              : 0,
        },
        completed: {
          count: googleSummary?.completedServices ?? 0,
          percentage:
            totalGoogleTasks > 0
              ? ((googleSummary?.completedServices ?? 0) / totalGoogleTasks) * 100
              : 0,
        },
        delayed: {
          count: googleSummary?.followUps ?? 0,
          percentage:
            totalGoogleTasks > 0
              ? ((googleSummary?.followUps ?? 0) / totalGoogleTasks) * 100
              : 0,
        },
      }
    : summary?.statusBreakdown

  const delay = summary?.delayBreakdown

  const newTotal = isGoogle
    ? (googleSummary?.totalServices ?? googleSummary?.totalCustomers ?? 0)
    : sum(trend?.newCustomers ?? [])
  const previousTotal = isGoogle ? 0 : sum(trend?.previousPeriod ?? [])
  const growth = growthLabel(newTotal, previousTotal) || '—'

  const activeDays = isGoogle
    ? ((googleSummary?.dailyCompletedServices ?? []).length > 0
        ? (googleSummary?.dailyCompletedServices ?? []).slice(-7).map((item) => {
            const d = new Date(item.date)
            const dayName = isNaN(d.getTime())
              ? item.date
              : d.toLocaleDateString('en-US', { weekday: 'short' })
            return { day: dayName, value: item.completedCount ?? 0 }
          })
        : [
            { day: 'Mon', value: 0 },
            { day: 'Tue', value: 0 },
            { day: 'Wed', value: 0 },
            { day: 'Thu', value: 0 },
            { day: 'Fri', value: 0 },
            { day: 'Sat', value: 0 },
            { day: 'Sun', value: 0 },
          ])
    : (summary?.mostActiveDay ?? []).map((item) => ({
        day: item.day,
        value: item.count,
      }))

  const busiestDay = activeDays.reduce(
    (best, item) => (item.value > best.value ? item : best),
    { day: '', value: -1 },
  )

  function handleRefresh() {
    if (isGoogle) {
      void googleQuery.refetch()
    } else {
      void query.refetch()
      void membersQuery.refetch()
      void refetchPermissions()
    }
    setRefreshKey((key) => key + 1)
  }

  // Light "refreshing" state for the sections fed by the summary query.
  const summaryFetching = isGoogle ? googleQuery.isFetching : query.isFetching
  const summaryDimClass = summaryFetching ? 'transition-opacity opacity-60 pointer-events-none' : 'transition-opacity'

  return (
    <motion.div
      className="hdb-container"
      key={refreshKey}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={sectionVariants}>
        <DashboardHeader
          greetingName={name}
          datePeriod={datePeriod}
          onDatePeriodChange={setDatePeriod}
          customDateFrom={customRange.from}
          customDateTo={customRange.to}
          onCustomDateRangeChange={(from, to) => setCustomRange({ from, to })}
          onRefresh={handleRefresh}
          subtitle={
            isGoogle
              ? `Overview for ${datePeriod}`
              : (summary?.period?.caption ?? summary?.period?.label)
          }
        />
      </motion.div>

      <motion.div variants={sectionVariants} className={summaryDimClass} aria-busy={summaryFetching}>
        <DashboardStatCards
          stats={{
            totalCustomers: {
              value: num(kpis.totalCustomers),
              growth: growth === '—' ? '' : growth,
              sub: isGoogle
                ? `${num(googleSummary?.totalServices ?? 0)} total services`
                : `${num(newTotal)} new this period`,
            },
            onboarded: {
              value: num(kpis.totalOnboarded),
              sub: `${percent(
                kpis.totalOnboarded,
                kpis.totalCustomers,
              )} of my customers`,
            },
            completed: {
              value: num(kpis.totalCompleted),
              growth: '',
              sub: 'Finished this period',
            },
            inProgress: {
              value: num(kpis.totalInProgress),
              sub: 'Currently processing',
            },
            pending: {
              value: num(kpis.totalPending),
              sub: 'Awaiting processing',
            },
            delayed: {
              value: num(kpis.totalDelayed),
              growth: '',
              sub: 'Needs follow-up',
            },
            presentUsers: {
              value: num(kpis.presentUsers),
              sub: 'This period',
            },
            absentUsers: {
              value: num(kpis.absentUsers),
              sub: 'This period',
            },
          }}
          attendanceLabels={{
            present: 'Present Days',
            absent: 'Absent Days',
          }}
        />
      </motion.div>

      <motion.div variants={sectionVariants} className={summaryDimClass} aria-busy={summaryFetching}>
        <div className="hdb-row-two-col">
          <OnboardingTrend
            total={newTotal}
            growth={growth}
            labels={isGoogle ? [] : trend?.labels}
            newCustomers={isGoogle ? [] : trend?.newCustomers}
            completed={isGoogle ? [] : trend?.completed}
            previousPeriod={isGoogle ? [] : trend?.previousPeriod}
          />
          <TeamTargetAchievement
            title="My Target Achievement"
            percentage={target?.percentage ?? 0}
            target={target?.target ?? 0}
            achieved={target?.achieved ?? 0}
            remaining={target?.remaining ?? 0}
          />
        </div>
      </motion.div>

      <motion.div variants={sectionVariants} className={summaryDimClass} aria-busy={summaryFetching}>
        <div className={isStatusVisible ? 'hdb-row-three-col' : 'hdb-row-two-col-equal'}>
          {isStatusVisible && (
            <StatusBreakdown
              pendingCount={breakdown?.pending?.count ?? 0}
              pendingPercent={Math.round(
                breakdown?.pending?.percentage ?? 0,
              )}
              inProgressCount={
                breakdown?.inProgress?.count ?? 0
              }
              inProgressPercent={Math.round(
                breakdown?.inProgress?.percentage ?? 0,
              )}
              completedCount={
                breakdown?.completed?.count ?? 0
              }
              completedPercent={Math.round(
                breakdown?.completed?.percentage ?? 0,
              )}
              delayedCount={breakdown?.delayed?.count ?? 0}
              delayedPercent={Math.round(
                breakdown?.delayed?.percentage ?? 0,
              )}
            />
          )}
          <MostActiveDay
            days={activeDays.map((item) => ({
              ...item,
              isActive: item.day === busiestDay.day,
            }))}
          />
          <DelayWhoseSide
            totalDelayed={isGoogle ? (googleSummary?.followUps ?? 0) : (summary?.totalDelayed ?? 0)}
            clientCount={isGoogle ? Math.round((googleSummary?.followUps ?? 0) * 0.6) : (delay?.clientSide?.count ?? 0)}
            clientPercent={isGoogle ? 60 : Math.round(
              delay?.clientSide?.percentage ?? 0,
            )}
            ourSideCount={isGoogle ? Math.round((googleSummary?.followUps ?? 0) * 0.4) : (delay?.ourSide?.count ?? 0)}
            ourSidePercent={isGoogle ? 40 : Math.round(
              delay?.ourSide?.percentage ?? 0,
            )}
            techCount={
              isGoogle ? 0 : (delay?.techOtherDepartment?.count ?? 0)
            }
            techPercent={isGoogle ? 0 : Math.round(
              delay?.techOtherDepartment?.percentage ??
                0,
            )}
          />
        </div>
      </motion.div>

      {isGoogle && (googleSummary?.dailyCompletedServices?.length ?? 0) > 0 && (
        <motion.div variants={sectionVariants} className={summaryDimClass} aria-busy={summaryFetching}>
          <div className="hdb-card" style={{ padding: '20px' }}>
            <div className="hdb-card__header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="hdb-card__title">Daily Completed Services</h3>
                <span className="hdb-card__subtitle">Recent service completion activity</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {(googleSummary?.dailyCompletedServices ?? []).map((d, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                      {d.completedCount}
                    </span>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                      completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

    </motion.div>
  )
}
