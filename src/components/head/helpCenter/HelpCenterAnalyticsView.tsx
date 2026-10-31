import { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Ticket,
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
  { key: 'open', label: 'Open', barClass: 'bg-amber-400', pillClass: 'bg-amber-100 text-amber-800' },
  { key: 'inProgress', label: 'In Progress', barClass: 'bg-blue-500', pillClass: 'bg-blue-100 text-blue-700' },
  { key: 'waitingOnCustomer', label: 'Waiting', barClass: 'bg-purple-400', pillClass: 'bg-purple-100 text-purple-700' },
  { key: 'resolved', label: 'Resolved', barClass: 'bg-emerald-500', pillClass: 'bg-emerald-100 text-emerald-700' },
  { key: 'closed', label: 'Closed', barClass: 'bg-slate-400', pillClass: 'bg-slate-100 text-slate-700' },
  { key: 'escalated', label: 'Escalated', barClass: 'bg-rose-500', pillClass: 'bg-rose-100 text-rose-700' },
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

  const escalatedCount = selectedUser ? selectedUser.escalated : analytics.overallEscalated
  const kpiCards = [
    { key: 'total', label: 'Total tickets', value: overallTotal, sub: selectedUser ? selectedUser.userEmail : 'Across the department', icon: Ticket, tone: 'bg-blue-50 text-blue-600' },
    { key: 'solved', label: 'Solved', value: solved, sub: `${solvedPercent.toFixed(1)}% of total`, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
    { key: 'unsolved', label: 'Not solved', value: notSolved, sub: `${notSolvedPercent.toFixed(1)}% of total`, icon: Clock, tone: 'bg-amber-50 text-amber-600' },
    { key: 'escalated', label: 'Escalated', value: escalatedCount, sub: 'Needs attention', icon: AlertTriangle, tone: 'bg-rose-50 text-rose-600' },
  ]
  const memberMax = Math.max(...userList.map((x) => x.totalTickets), 1)

  return (
    <div className={`space-y-4 transition-opacity ${isRefreshing ? 'opacity-60' : ''}`}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {selectedUser ? `${selectedUser.userName}'s analytics` : 'Help Center analytics'}
            </h2>
            {selectedUser && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Users className="h-3 w-3" />
                Individual view
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedUser
              ? `Ticket metrics for ${selectedUser.userEmail}`
              : 'Ticket metrics and workload across your team'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedUser && (
            <button
              type="button"
              onClick={() => {
                setSelectedUser(null)
                setSearchQuery('')
              }}
              className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to team</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => {
          const CardIcon = card.icon
          return (
            <div key={card.key} className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200">
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                <CardIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-bold leading-none text-slate-900">{card.value}</span>
                <span className="mt-1 block text-xs font-medium text-slate-600">{card.label}</span>
                <span className="block text-[11px] text-slate-400 truncate">{card.sub}</span>
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Status breakdown + team workload ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Status breakdown</h3>
            <span className="text-xs text-slate-400">{overallTotal} tickets</span>
          </div>

          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {overallTotal > 0 &&
              statusCardConfig.map((cfg) => {
                const val = getStatusValue(cfg.key)
                if (!val) return null
                return (
                  <div
                    key={cfg.key}
                    className={`${cfg.barClass} h-full`}
                    style={{ width: `${(val / overallTotal) * 100}%` }}
                    title={`${cfg.label}: ${val}`}
                  />
                )
              })}
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statusCardConfig.map((cfg) => {
              const val = getStatusValue(cfg.key)
              const pct = overallTotal > 0 ? (val / overallTotal) * 100 : 0
              return (
                <div key={cfg.key} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cfg.barClass}`} />
                    <span className="text-[11px] font-medium text-slate-500">{cfg.label}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-slate-900">{val}</span>
                    <span className="text-[11px] text-slate-400">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              {selectedUser ? 'Ticket breakdown' : 'Tickets by team member'}
            </h3>
            <span className="text-xs text-slate-400">{userList.length} members</span>
          </div>
          <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
            {userList.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No member data available</p>
            ) : (
              userList.slice(0, 8).map((u) => {
                const solvedShare = u.totalTickets > 0 ? ((u.resolved + u.closed) / u.totalTickets) * 100 : 0
                return (
                  <div key={u.userEmail}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                          {u.userName.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-800 truncate">{u.userName}</span>
                      </span>
                      <span className="flex-shrink-0 text-slate-500">
                        <span className="font-bold text-slate-900">{u.totalTickets}</span> · {solvedShare.toFixed(0)}% solved
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${Math.max((u.totalTickets / memberMax) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Team table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {selectedUser ? 'Member details' : 'Team member analytics'}
            </h3>
            {!selectedUser && (
              <p className="text-xs text-slate-500 mt-0.5">Click a member to see their individual metrics</p>
            )}
          </div>

          {!selectedUser && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email or department…"
                className="w-full h-10 pl-9 pr-3 text-xs border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-3 px-5 font-semibold whitespace-nowrap">Member</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-center">Total</th>
                {statusCardConfig.map((cfg) => (
                  <th key={cfg.key} className="py-3 px-3 font-semibold whitespace-nowrap text-center">
                    {cfg.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userList.length === 0 ? (
                <tr>
                  <td colSpan={2 + statusCardConfig.length} className="py-10 text-center text-slate-400">
                    No team members found
                  </td>
                </tr>
              ) : (
                userList.map((u) => (
                  <tr
                    key={u.userEmail}
                    onClick={() => {
                      if (!selectedUser) setSelectedUser(u)
                    }}
                    className={`transition-colors ${!selectedUser ? 'hover:bg-blue-50/40 cursor-pointer' : ''}`}
                  >
                    <td className="py-3 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {u.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{u.userName}</p>
                          <p className="text-[11px] text-slate-500">{u.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-sm font-bold text-slate-900 whitespace-nowrap">
                      {u.totalTickets}
                    </td>
                    {statusCardConfig.map((cfg) => {
                      const val = u[cfg.key as keyof HelpCenterDashboardUserAnalytics] as number
                      return (
                        <td key={cfg.key} className="py-3 px-3 text-center whitespace-nowrap">
                          {val > 0 ? (
                            <span className={`inline-flex min-w-[24px] justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.pillClass}`}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                      )
                    })}
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
