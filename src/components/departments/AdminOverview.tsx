import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Users,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  Calendar,
  RotateCw,
  ChevronDown,
  ShieldCheck,
  Maximize2,
  LogIn,
} from 'lucide-react'
import {
  getAdminDepartmentSummary,
  toLocalDateTimeParam,
  type AdminDepartmentSummary,
} from '../../api/admin-summary.api'
import { getAdminDepartments } from '../../api/admin-departments.api'
import {
  getAdminBackup,
  restoreAdminSession,
  getSession,
  openSessionInNewTab,
  prepareLoginWindow,
  homeForRole,
} from '../../app/auth/session'
import { useLoginAsDepartment } from '../../features/auth/hooks/useLoginAsDepartment'
import type { Department } from '../../features/departments/types/department.types'
import './AdminOverview.css'

type RangePreset = '7d' | '30d' | '90d' | '365d'

const RANGE_OPTIONS: { value: RangePreset; label: string; days: number }[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: '365d', label: 'Last 12 months', days: 365 },
]

const numberFormat = new Intl.NumberFormat('en-IN')

/** GOOGLE_DEPARTMENT -> Google */
export function departmentLabel(type: string): string {
  if (!type) return 'Department'
  return type
    .replace(/_DEPARTMENT$/i, '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/** Distinct avatar theme color & initial per department */
function getDepartmentVisual(deptName: string) {
  const normalized = deptName.toLowerCase()
  if (normalized.includes('support')) return { initial: 'S', bg: 'bg-amber-100 text-amber-700 border-amber-200' }
  if (normalized.includes('billing')) return { initial: 'B', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  if (normalized.includes('seo')) return { initial: 'S', bg: 'bg-cyan-100 text-cyan-700 border-cyan-200' }
  if (normalized.includes('advertisement') || normalized.includes('ad'))
    return { initial: 'A', bg: 'bg-blue-100 text-blue-700 border-blue-200' }
  if (normalized.includes('smo')) return { initial: 'S', bg: 'bg-rose-100 text-rose-700 border-rose-200' }
  if (normalized.includes('google')) return { initial: 'G', bg: 'bg-purple-100 text-purple-700 border-purple-200' }
  if (normalized.includes('onboarding')) return { initial: 'O', bg: 'bg-sky-100 text-sky-700 border-sky-200' }
  if (normalized.includes('automation')) return { initial: 'A', bg: 'bg-orange-100 text-orange-700 border-orange-200' }
  if (normalized.includes('sales')) return { initial: 'S', bg: 'bg-teal-100 text-teal-700 border-teal-200' }
  if (normalized.includes('website')) return { initial: 'W', bg: 'bg-indigo-100 text-indigo-700 border-indigo-200' }
  if (normalized.includes('marketing')) return { initial: 'M', bg: 'bg-pink-100 text-pink-700 border-pink-200' }
  if (normalized.includes('delivery')) return { initial: 'D', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  return { initial: deptName.charAt(0).toUpperCase() || 'D', bg: 'bg-slate-100 text-slate-700 border-slate-200' }
}

function useRange(preset: RangePreset) {
  return useMemo(() => {
    const days = RANGE_OPTIONS.find((option) => option.value === preset)?.days ?? 30
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)
    return { startDate: toLocalDateTimeParam(start), endDate: toLocalDateTimeParam(end) }
  }, [preset])
}

type SortFilter = 'delayed' | 'customers' | 'alphabetical'

interface AdminOverviewProps {
  /** Department heads list */
  departments?: Department[]
  /** Department types */
  departmentTypes: string[]
  /** Global refresh action */
  onRefreshAll?: () => void
}

export function AdminOverview({
  departments = [],
  departmentTypes,
  onRefreshAll,
}: AdminOverviewProps) {
  const navigate = useNavigate()
  const [preset, setPreset] = useState<RangePreset>('30d')
  const [sortFilter, setSortFilter] = useState<SortFilter>('delayed')
  const [loggingInEmail, setLoggingInEmail] = useState<string | null>(null)
  const range = useRange(preset)

  // Login-as API mutation
  const loginAsMutation = useLoginAsDepartment()

  // Check if admin is currently impersonating/parking
  const adminBackup = useMemo(() => getAdminBackup(), [])

  // 1. Fetch Company-wide Totals
  const totalsQuery = useQuery({
    queryKey: ['admin-summary', preset, 'ALL'],
    queryFn: () => getAdminDepartmentSummary(range),
    staleTime: 60_000,
  })

  // 2. Fetch User Counts across departments for head ranking
  const adminUsersQuery = useQuery({
    queryKey: ['admin-departments-users-count'],
    queryFn: () => getAdminDepartments({ size: 500 }),
    staleTime: 120_000,
  })

  // Map departmentType -> user count
  const userCountByDept = useMemo(() => {
    const map = new Map<string, number>()
    const users = adminUsersQuery.data?.data ?? []
    for (const u of users) {
      const type = u.departmentType
      if (type) {
        map.set(type, (map.get(type) || 0) + 1)
      }
    }
    return map
  }, [adminUsersQuery.data])

  // Map departmentType -> head object
  const headByDept = useMemo(() => {
    const map = new Map<string, Department>()
    for (const d of departments) {
      if (d.type && !map.has(d.type)) {
        map.set(d.type, d)
      }
    }
    return map
  }, [departments])

  // 3. Fetch summary for each department
  const departmentQueries = useQueries({
    queries: departmentTypes.map((departmentType) => ({
      queryKey: ['admin-summary', preset, departmentType],
      queryFn: () => getAdminDepartmentSummary({ ...range, departmentType }),
      staleTime: 60_000,
    })),
  })

  // Combine query data with department details
  const enrichedDepartments = useMemo(() => {
    return departmentTypes.map((departmentType, index) => {
      const summary = departmentQueries[index]?.data
      const head = headByDept.get(departmentType)
      const headFromUsers = adminUsersQuery.data?.data?.find(
        (u) => u.departmentType === departmentType && u.isHead,
      )

      const label = departmentLabel(departmentType)
      const headName = head?.name || head?.username || headFromUsers?.username || `${label} Head`
      const headEmail = head?.email || headFromUsers?.email || ''
      const userCount = userCountByDept.get(departmentType) || 1

      const totalCustomers = summary?.totalCustomers ?? 0
      const delayedServices = summary?.delayedServices ?? 0
      const completedServices = summary?.completedServices ?? 0
      const inProgressServices = summary?.inProgressServices ?? 0
      const pendingServices = summary?.pendingServices ?? 0
      const cancelledServices = summary?.cancelledServices ?? 0

      const totalServices =
        completedServices + inProgressServices + pendingServices + cancelledServices ||
        totalCustomers

      const completionPercent =
        totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0

      const delayPercent =
        totalServices > 0 ? Math.round((delayedServices / totalServices) * 100) : 0

      return {
        departmentType,
        label,
        headName,
        headEmail,
        userCount,
        summary,
        totalCustomers,
        delayedServices,
        completedServices,
        inProgressServices,
        pendingServices,
        totalServices,
        completionPercent,
        delayPercent,
        isPending: departmentQueries[index]?.isPending ?? true,
      }
    })
  }, [departmentTypes, departmentQueries, headByDept, adminUsersQuery.data, userCountByDept])

  // Sorted departments for Department Health
  const sortedDepartments = useMemo(() => {
    const items = [...enrichedDepartments]
    if (sortFilter === 'delayed') {
      return items.sort((a, b) => b.delayedServices - a.delayedServices)
    }
    if (sortFilter === 'customers') {
      return items.sort((a, b) => b.totalCustomers - a.totalCustomers)
    }
    if (sortFilter === 'alphabetical') {
      return items.sort((a, b) => a.label.localeCompare(b.label))
    }
    return items
  }, [enrichedDepartments, sortFilter])

  // Delayed ranking for "Where delays are"
  const delayedRanking = useMemo(() => {
    return [...enrichedDepartments]
      .filter((d) => d.delayedServices > 0)
      .sort((a, b) => b.delayedServices - a.delayedServices)
  }, [enrichedDepartments])

  const maxDelay = useMemo(() => {
    return Math.max(...delayedRanking.map((d) => d.delayedServices), 1)
  }, [delayedRanking])

  // Heads ranking for "Department heads"
  const rankedHeads = useMemo(() => {
    return [...enrichedDepartments]
      .sort((a, b) => {
        if (b.completionPercent !== a.completionPercent) {
          return b.completionPercent - a.completionPercent
        }
        return b.completedServices - a.completedServices
      })
      .slice(0, 8)
  }, [enrichedDepartments])

  const isRefreshing =
    (totalsQuery.isFetching && !totalsQuery.isPending) ||
    departmentQueries.some((query) => query.isFetching && !query.isPending)

  const handleRefresh = async () => {
    onRefreshAll?.()
    await Promise.all([
      totalsQuery.refetch(),
      adminUsersQuery.refetch(),
      ...departmentQueries.map((query) => query.refetch()),
    ])
  }

  // Login as department head API action
  const handleLoginAsHead = (email: string, headName: string) => {
    if (!email) {
      alert(`No login credentials found for ${headName}`)
      return
    }

    setLoggingInEmail(email)
    const newWindow = window.open('', '_blank')
    prepareLoginWindow(newWindow)
    const adminSession = getSession()

    loginAsMutation.mutate(email, {
      onSuccess: (session) => {
        const targetRoute = homeForRole(
          session.user.role,
          session.user.departmentType,
        )
        openSessionInNewTab(session, targetRoute, newWindow, adminSession)
      },
      onError: (err) => {
        if (newWindow) {
          newWindow.close()
        }
        console.error('Failed to log in as department head:', err)
        alert(`Login failed: ${err.message}`)
      },
      onSettled: () => {
        setLoggingInEmail(null)
      },
    })
  }

  const totals = totalsQuery.data
  const totalServices =
    (totals?.completedServices ?? 0) +
    (totals?.inProgressServices ?? 0) +
    (totals?.pendingServices ?? 0) +
    (totals?.cancelledServices ?? 0) || (totals?.totalCustomers ?? 1)

  const pendingPercent =
    totalServices > 0
      ? Math.round(((totals?.pendingServices ?? 0) / totalServices) * 100)
      : 0
  const completedPercent =
    totalServices > 0
      ? Math.round(((totals?.completedServices ?? 0) / totalServices) * 100)
      : 0

  const activeRangeLabel =
    RANGE_OPTIONS.find((r) => r.value === preset)?.label ?? 'Last 30 days'

  return (
    <div className="overview-page-wrapper">
      {/* 1. TOP ROYAL BLUE WELCOME BANNER */}
      <section className="overview-welcome-banner">
        <div className="overview-welcome-left">
          <div className="overview-welcome-avatar">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="overview-welcome-title">Welcome back, Super Admin</h1>
            <p className="overview-welcome-subtitle">
              Across {departmentTypes.length} active departments • {activeRangeLabel}
            </p>
          </div>
        </div>

        <div className="overview-welcome-actions">
          {/* Date Range Selector Pill */}
          <div className="overview-range-pill">
            <Calendar className="w-3.5 h-3.5 text-blue-200" />
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as RangePreset)}
              aria-label="Select Date Range"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-blue-200 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="overview-action-btn"
            onClick={handleRefresh}
            title="Refresh overview"
            disabled={isRefreshing}
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="overview-action-btn"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {})
              } else {
                document.exitFullscreen().catch(() => {})
              }
            }}
            title="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 2. NOTICE / IMPERSONATION STRIP (CONDITIONAL) */}
      {adminBackup && (
        <section className="overview-notice-banner" role="status">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>
              You are logged in as <strong>{adminBackup.user.name || 'Onboarding Head'}</strong> -{' '}
              {adminBackup.user.role || 'Department head'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="overview-notice-btn-amber"
              onClick={() => navigate({ to: '/head' })}
            >
              Open their dashboard
            </button>
            <button
              type="button"
              className="overview-notice-btn-blue"
              onClick={() => {
                restoreAdminSession()
                window.location.reload()
              }}
            >
              Back to Super Admin
            </button>
          </div>
        </section>
      )}

      {/* 3. TOP 6 METRIC CARDS ROW */}
      <section className="overview-kpi-grid">
        {/* Card 1: CUSTOMERS */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-head text-indigo-500">
            <Users className="w-4 h-4" />
            <span>CUSTOMERS</span>
          </div>
          <div className="overview-kpi-value text-slate-900">
            {totalsQuery.isPending ? (
              <span className="overview-skeleton" />
            ) : (
              numberFormat.format(totals?.totalCustomers ?? 0)
            )}
          </div>
          <div className="overview-kpi-sub">Unique accounts</div>
        </div>

        {/* Card 2: PENDING */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-head text-amber-500">
            <Clock className="w-4 h-4" />
            <span>PENDING</span>
          </div>
          <div className="overview-kpi-value text-amber-600">
            {totalsQuery.isPending ? (
              <span className="overview-skeleton" />
            ) : (
              numberFormat.format(totals?.pendingServices ?? 0)
            )}
          </div>
          <div className="overview-kpi-sub">{pendingPercent}% of services</div>
        </div>

        {/* Card 3: IN PROGRESS */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-head text-blue-500">
            <Zap className="w-4 h-4" />
            <span>IN PROGRESS</span>
          </div>
          <div className="overview-kpi-value text-blue-600">
            {totalsQuery.isPending ? (
              <span className="overview-skeleton" />
            ) : (
              numberFormat.format(totals?.inProgressServices ?? 0)
            )}
          </div>
          <div className="overview-kpi-sub">Being worked on</div>
        </div>

        {/* Card 4: COMPLETED */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-head text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
            <span>COMPLETED</span>
          </div>
          <div className="overview-kpi-value text-emerald-600">
            {totalsQuery.isPending ? (
              <span className="overview-skeleton" />
            ) : (
              numberFormat.format(totals?.completedServices ?? 0)
            )}
          </div>
          <div className="overview-kpi-sub">{completedPercent}% of services</div>
        </div>

        {/* Card 5: DELAYED */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-head text-rose-500">
            <AlertTriangle className="w-4 h-4" />
            <span>DELAYED</span>
          </div>
          <div className="overview-kpi-value text-rose-600">
            {totalsQuery.isPending ? (
              <span className="overview-skeleton" />
            ) : (
              numberFormat.format(totals?.delayedServices ?? 0)
            )}
          </div>
          <div className="overview-kpi-sub">Past their TAT</div>
        </div>

        {/* Card 6: DEPARTMENTS */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-head text-indigo-500">
            <LayoutGrid className="w-4 h-4" />
            <span>DEPARTMENTS</span>
          </div>
          <div className="overview-kpi-value text-indigo-600">
            {departmentTypes.length}
          </div>
          <div className="overview-kpi-sub">All users in total</div>
        </div>
      </section>

      {/* 4. DEPARTMENT HEALTH SECTION */}
      <section className="overview-health-section">
        <div className="overview-health-header">
          <div className="flex items-baseline gap-2">
            <h2 className="overview-section-title">Department health</h2>
            <span className="overview-section-subtitle">Click a department for details</span>
          </div>

          <div className="overview-sort-tabs">
            <button
              type="button"
              className={`overview-sort-pill ${sortFilter === 'delayed' ? 'is-active' : ''}`}
              onClick={() => setSortFilter('delayed')}
            >
              Most delayed
            </button>
            <button
              type="button"
              className={`overview-sort-pill ${sortFilter === 'customers' ? 'is-active' : ''}`}
              onClick={() => setSortFilter('customers')}
            >
              Most customers
            </button>
            <button
              type="button"
              className={`overview-sort-pill ${sortFilter === 'alphabetical' ? 'is-active' : ''}`}
              onClick={() => setSortFilter('alphabetical')}
            >
              A – Z
            </button>
          </div>
        </div>

        {/* Department Health Grid */}
        <div className="overview-dept-grid">
          {sortedDepartments.map((dept) => {
            const visual = getDepartmentVisual(dept.label)
            const completed = dept.completedServices
            const inProgress = dept.inProgressServices
            const pending = dept.pendingServices
            const delayed = dept.delayedServices
            const total = dept.totalServices || 1

            const pctCompleted = (completed / total) * 100
            const pctInProgress = (inProgress / total) * 100
            const pctPending = (pending / total) * 100
            const pctDelayed = (delayed / total) * 100

            return (
              <article
                key={dept.departmentType}
                className="overview-dept-card"
                onClick={() =>
                  navigate({
                    to: '/admin',
                    search: { departmentType: dept.departmentType } as any,
                  })
                }
              >
                {/* Top Row: Icon, Title, Head, Delayed Badge */}
                <div className="overview-dept-card-top">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`overview-dept-badge ${visual.bg}`}>
                      {visual.initial}
                    </div>
                    <div className="min-w-0">
                      <h3 className="overview-dept-title truncate">{dept.label}</h3>
                      <p className="overview-dept-head-name truncate">{dept.headName}</p>
                    </div>
                  </div>

                  {delayed > 0 && (
                    <span className="overview-dept-delayed-badge">
                      {numberFormat.format(delayed)} delayed
                    </span>
                  )}
                </div>

                {/* Middle Row: Customers Count & Completion % */}
                <div className="overview-dept-card-counts">
                  <div>
                    <span className="overview-dept-count-number">
                      {numberFormat.format(dept.totalCustomers)}
                    </span>
                    <span className="overview-dept-count-label">customers</span>
                  </div>
                  <span
                    className={`overview-dept-pct ${
                      dept.completionPercent > 50 ? 'text-emerald-600' : 'text-slate-600'
                    }`}
                  >
                    {dept.completionPercent}%
                  </span>
                </div>

                {/* Multi-segment Progress Bar */}
                <div className="overview-dept-bar-track">
                  {pctCompleted > 0 && (
                    <span
                      className="overview-bar-seg bg-emerald-500"
                      style={{ width: `${pctCompleted}%` }}
                      title={`Completed: ${completed}`}
                    />
                  )}
                  {pctInProgress > 0 && (
                    <span
                      className="overview-bar-seg bg-blue-500"
                      style={{ width: `${pctInProgress}%` }}
                      title={`In progress: ${inProgress}`}
                    />
                  )}
                  {pctPending > 0 && (
                    <span
                      className="overview-bar-seg bg-amber-400"
                      style={{ width: `${pctPending}%` }}
                      title={`Pending: ${pending}`}
                    />
                  )}
                  {pctDelayed > 0 && (
                    <span
                      className="overview-bar-seg bg-rose-500"
                      style={{ width: `${pctDelayed}%` }}
                      title={`Delayed: ${delayed}`}
                    />
                  )}
                </div>

                {/* Bottom Row: Micro Legend with Dots */}
                <div className="overview-dept-legend">
                  <span>
                    <i className="overview-dot bg-emerald-500" />
                    {completed} done
                  </span>
                  <span>
                    <i className="overview-dot bg-blue-500" />
                    {inProgress} active
                  </span>
                  <span>
                    <i className="overview-dot bg-amber-400" />
                    {pending} pending
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* 5. BOTTOM 2-WIDGET ROW: WHERE DELAYS ARE & DEPARTMENT HEADS */}
      <section className="overview-bottom-grid">
        {/* Left Widget: Where delays are */}
        <article className="overview-widget-card">
          <div className="overview-widget-header">
            <h2 className="overview-section-title">Where delays are</h2>
            <span className="overview-section-subtitle">Delayed customers by department</span>
          </div>

          <div className="overview-delays-list">
            {delayedRanking.length === 0 ? (
              <p className="overview-empty-state">No delayed customers reported across departments.</p>
            ) : (
              delayedRanking.map((dept) => {
                const widthPercent = Math.max(6, Math.round((dept.delayedServices / maxDelay) * 100))
                const isHigh = dept.delayPercent >= 50

                return (
                  <div key={dept.departmentType} className="overview-delay-row">
                    <span className="overview-delay-label truncate">{dept.label}</span>
                    <div className="overview-delay-bar-container">
                      <div
                        className={`overview-delay-bar ${isHigh ? 'bg-rose-500' : 'bg-amber-400'}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <span className="overview-delay-stat">
                      {numberFormat.format(dept.delayedServices)} · {dept.delayPercent}%
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </article>

        {/* Right Widget: Department heads */}
        <article className="overview-widget-card">
          <div className="overview-widget-header">
            <h2 className="overview-section-title">Department heads</h2>
            <span className="overview-section-subtitle">Ranked by completion</span>
          </div>

          <div className="overview-heads-list">
            {rankedHeads.map((dept, index) => {
              const rank = index + 1
              const rankClass =
                rank === 1
                  ? 'is-gold'
                  : rank === 2
                  ? 'is-blue'
                  : rank === 3
                  ? 'is-cyan'
                  : 'is-slate'

              const pct = dept.completionPercent
              const barColor =
                pct > 60 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-400' : 'bg-slate-300'

              const isLoggingIn = loggingInEmail === dept.headEmail

              return (
                <div key={dept.departmentType} className="overview-head-row">
                  {/* Rank Badge */}
                  <div className={`overview-rank-badge ${rankClass}`}>{rank}</div>

                  {/* Head Info */}
                  <div className="overview-head-info min-w-0 flex-1">
                    <div className="overview-head-name truncate">{dept.headName}</div>
                    <div className="overview-head-sub truncate">
                      {dept.label} • {dept.userCount} users
                    </div>
                  </div>

                  {/* Progress & Stat */}
                  <div className="overview-head-stat-group">
                    <div className="overview-head-mini-bar">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="overview-head-pct-label">{pct}% complete</span>
                  </div>

                  {/* Login as Department Head Button */}
                  <button
                    type="button"
                    className="overview-head-login-btn"
                    onClick={() => handleLoginAsHead(dept.headEmail, dept.headName)}
                    title={
                      dept.headEmail
                        ? `Login as ${dept.headName}`
                        : `No email found for ${dept.headName}`
                    }
                    disabled={isLoggingIn || !dept.headEmail}
                    aria-label={`Login as ${dept.headName}`}
                  >
                    {isLoggingIn ? (
                      <RotateCw className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </div>
  )
}
