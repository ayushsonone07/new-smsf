import { useState, useMemo } from 'react'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ArrowLeft,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type {
  HelpCenterDashboardAnalytics,
  HelpCenterDashboardUserAnalytics,
  EmployeeTicketWithCreator,
} from '../../../features/departments/types/help-center.types'

interface HelpCenterAnalyticsViewProps {
  analytics: HelpCenterDashboardAnalytics | null
  tickets?: EmployeeTicketWithCreator[]
  isLoading: boolean
  isRefreshing?: boolean
  error?: string | null
  onRefresh: () => void
}

const statusCardConfig = [
  { key: 'open', label: 'Open', borderClass: 'border-amber-200' },
  { key: 'inProgress', label: 'In Progress', borderClass: 'border-blue-200' },
  { key: 'waitingOnCustomer', label: 'Waiting', borderClass: 'border-purple-200' },
  { key: 'resolved', label: 'Resolved', borderClass: 'border-green-200' },
  { key: 'closed', label: 'Closed', borderClass: 'border-slate-200' },
  { key: 'escalated', label: 'Escalated', borderClass: 'border-rose-200' },
]

export function HelpCenterAnalyticsView({
  analytics: apiAnalytics,
  tickets = [],
  isLoading,
  isRefreshing,
  error,
  onRefresh,
}: HelpCenterAnalyticsViewProps) {
  const [selectedUser, setSelectedUser] = useState<HelpCenterDashboardUserAnalytics | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Derive analytics if apiAnalytics is empty or not provided
  const analytics: HelpCenterDashboardAnalytics = useMemo(() => {
    if (apiAnalytics && (apiAnalytics.overallTotalTickets > 0 || apiAnalytics.users.length > 0)) {
      return apiAnalytics
    }

    // Build derived analytics from tickets
    const userMap = new Map<string, HelpCenterDashboardUserAnalytics>()
    let open = 0
    let inProgress = 0
    let waiting = 0
    let resolved = 0
    let closed = 0
    let escalated = 0

    tickets.forEach((t) => {
      const status = t.ticketStatus?.toUpperCase()
      if (status === 'OPEN') open++
      else if (status === 'IN_PROGRESS') inProgress++
      else if (status === 'WAITING_ON_CUSTOMER') waiting++
      else if (status === 'RESOLVED') resolved++
      else if (status === 'CLOSED') closed++
      else if (status === 'ESCALATED') escalated++

      const userEmail = t.creatorEmail || 'unknown'
      const userName = t.creatorName || userEmail.split('@')[0] || 'Team User'
      const deptName = t.departmentName || 'DEPARTMENT'

      if (!userMap.has(userEmail)) {
        userMap.set(userEmail, {
          userId: t.creatorId || 1,
          userName,
          userEmail,
          departmentId: 1,
          departmentName: deptName,
          totalTickets: 0,
          open: 0,
          inProgress: 0,
          waitingOnCustomer: 0,
          resolved: 0,
          closed: 0,
          escalated: 0,
        })
      }

      const u = userMap.get(userEmail)!
      u.totalTickets++
      if (status === 'OPEN') u.open++
      else if (status === 'IN_PROGRESS') u.inProgress++
      else if (status === 'WAITING_ON_CUSTOMER') u.waitingOnCustomer++
      else if (status === 'RESOLVED') u.resolved++
      else if (status === 'CLOSED') u.closed++
      else if (status === 'ESCALATED') u.escalated++
    })

    return {
      users: Array.from(userMap.values()),
      overallTotalTickets: tickets.length,
      overallOpen: open,
      overallInProgress: inProgress,
      overallWaitingOnCustomer: waiting,
      overallResolved: resolved,
      overallClosed: closed,
      overallEscalated: escalated,
      overallSolved: resolved + closed,
      overallUnsolved: open + inProgress + waiting + escalated,
    }
  }, [apiAnalytics, tickets])

  const overallTotal = useMemo(() => {
    if (selectedUser) return selectedUser.totalTickets
    return analytics.overallTotalTickets
  }, [analytics, selectedUser])

  const solved = useMemo(() => {
    if (selectedUser) return selectedUser.resolved + selectedUser.closed
    return analytics.overallResolved + analytics.overallClosed
  }, [analytics, selectedUser])

  const notSolved = useMemo(() => {
    if (selectedUser) {
      return (
        selectedUser.open +
        selectedUser.inProgress +
        selectedUser.waitingOnCustomer +
        selectedUser.escalated
      )
    }
    return (
      analytics.overallOpen +
      analytics.overallInProgress +
      analytics.overallWaitingOnCustomer +
      analytics.overallEscalated
    )
  }, [analytics, selectedUser])

  // Filtered users for the user table
  const userList = useMemo(() => {
    if (selectedUser) return [selectedUser]
    const users = analytics.users || []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const name = u.userName?.toLowerCase() || ''
      const email = u.userEmail?.toLowerCase() || ''
      const dept = u.departmentName?.toLowerCase() || ''
      return name.includes(q) || email.includes(q) || dept.includes(q)
    })
  }, [analytics, selectedUser, searchQuery])

  function getStatusValue(key: string) {
    if (selectedUser) {
      switch (key) {
        case 'open':
          return selectedUser.open
        case 'inProgress':
          return selectedUser.inProgress
        case 'waitingOnCustomer':
          return selectedUser.waitingOnCustomer
        case 'resolved':
          return selectedUser.resolved
        case 'closed':
          return selectedUser.closed
        case 'escalated':
          return selectedUser.escalated
        default:
          return 0
      }
    }
    switch (key) {
      case 'open':
        return analytics.overallOpen
      case 'inProgress':
        return analytics.overallInProgress
      case 'waitingOnCustomer':
        return analytics.overallWaitingOnCustomer
      case 'resolved':
        return analytics.overallResolved
      case 'closed':
        return analytics.overallClosed
      case 'escalated':
        return analytics.overallEscalated
      default:
        return 0
    }
  }

  // Calculate percentages for pie chart
  const solvedPercent = overallTotal > 0 ? (solved / overallTotal) * 100 : 0
  const notSolvedPercent = overallTotal > 0 ? (notSolved / overallTotal) * 100 : 0

  if (isLoading && overallTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-700">Loading Help Center analytics…</p>
      </div>
    )
  }

  if (error && overallTotal === 0) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Failed to load analytics</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                {selectedUser ? `${selectedUser.userName}'s Analytics` : 'Help Center Analytics'}
              </h2>
              {selectedUser && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Users className="h-3 w-3" />
                  Individual View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedUser
                ? `Showing ticket metrics for ${selectedUser.userEmail}`
                : 'Ticket metrics and workload distribution across department'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedUser && (
            <button
              type="button"
              onClick={() => {
                setSelectedUser(null)
                setSearchQuery('')
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Department</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-xs transition-colors disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Status Metrics Cards (7 Cards) ── */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
          Overview: {overallTotal} Total Tickets
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
            <p className="text-xs font-medium text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{overallTotal}</p>
          </div>
          {statusCardConfig.map((cfg) => {
            const val = getStatusValue(cfg.key)
            return (
              <div
                key={cfg.key}
                className={`p-4 rounded-xl border ${cfg.borderClass} bg-white shadow-2xs`}
              >
                <p className="text-xs font-medium text-slate-500">{cfg.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{val}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Solved vs Not Solved Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Solved
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-950 mt-1">{solved}</p>
          <p className="text-xs text-emerald-700 mt-0.5 font-medium">
            {solvedPercent.toFixed(1)}% of total tickets
          </p>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-rose-600" />
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Not Solved
            </p>
          </div>
          <p className="text-2xl font-bold text-rose-950 mt-1">{notSolved}</p>
          <p className="text-xs text-rose-700 mt-0.5 font-medium">
            {notSolvedPercent.toFixed(1)}% of total tickets
          </p>
        </div>
      </div>

      {/* ── Charts: Donut Pie & Bar Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Solved vs Not Solved Donut Chart */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Solved vs Not Solved</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* SVG Donut */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Solved stroke */}
                {overallTotal > 0 && (
                  <path
                    className="text-emerald-500"
                    strokeDasharray={`${solvedPercent}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
                {/* Not solved stroke */}
                {overallTotal > 0 && notSolved > 0 && (
                  <path
                    className="text-rose-500"
                    strokeDasharray={`${notSolvedPercent}, 100`}
                    strokeDashoffset={`-${solvedPercent}`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900">{overallTotal}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  Tickets
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Solved: <span className="font-bold">{solved}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{solvedPercent.toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Not Solved: <span className="font-bold">{notSolved}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{notSolvedPercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets by User Bar Chart */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">
            {selectedUser ? 'User Ticket Breakdown' : 'Tickets by Team Member'}
          </h3>
          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {userList.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No member data available</p>
            ) : (
              userList.slice(0, 8).map((u) => {
                const max = Math.max(...userList.map((x) => x.totalTickets), 1)
                const widthPercent = Math.max((u.totalTickets / max) * 100, 4)

                return (
                  <div key={u.userEmail} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate max-w-[180px]">
                        {u.userName}
                      </span>
                      <span className="font-bold text-slate-900">{u.totalTickets}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── User-wise Analytics Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {selectedUser ? 'User Details' : 'Team Member Analytics'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any row to drill down into individual metrics
            </p>
          </div>

          {!selectedUser && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user or email..."
                className="w-full h-8 pl-8 pr-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap">Name</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Email</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Total</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Open</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">In Prog.</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Waiting</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Resolved</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Closed</th>
                <th className="py-3 px-3 whitespace-nowrap text-center">Escalated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No team members found
                  </td>
                </tr>
              ) : (
                userList.map((u) => (
                  <tr
                    key={u.userEmail}
                    onClick={() => {
                      if (!selectedUser) {
                        setSelectedUser(u)
                      }
                    }}
                    className={`transition-colors ${
                      !selectedUser
                        ? 'hover:bg-blue-50/50 cursor-pointer'
                        : 'hover:bg-transparent'
                    }`}
                  >
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {u.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{u.userName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">{u.userEmail}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 whitespace-nowrap">
                      {u.totalTickets}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                        {u.open}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                        {u.inProgress}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">
                        {u.waitingOnCustomer}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                        {u.resolved}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 whitespace-nowrap">
                      {u.closed}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {u.escalated > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                          {u.escalated}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

