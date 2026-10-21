import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Headphones,
  BarChart3,
  Users,
} from 'lucide-react'
import { getSession } from '../../../../app/auth/session'
import {
  fetchAssignedTickets,
  fetchTicketStatusSummary,
  fetchHelpCenterAnalytics,
} from '../../../../api/help-center.api'
import type {
  EmployeeTicketWithCreator,
  HelpCenterStatusSummary,
  HelpCenterDashboardAnalytics,
} from '../../../../features/departments/types/help-center.types'
import { AssignedTicketsView } from '../../../../components/head/helpCenter/AssignedTicketsView'
import { HelpCenterAnalyticsView } from '../../../../components/head/helpCenter/HelpCenterAnalyticsView'
import { DepartmentUsersTicketsView } from '../../../../components/head/helpCenter/DepartmentUsersTicketsView'

type HelpCenterTab = 'assigned-tickets' | 'analytics' | 'department-members'

export function HelpCenterPage() {
  const session = getSession()
  const user = session?.user

  const employeeEmail = useMemo(() => {
    return user?.email || user?.username || 'googledepartment@mbgcard.com'
  }, [user])

  const userRole = user?.role || 'HEAD'
  const isHead = userRole === 'HEAD' || userRole === 'ADMIN'
  const departmentType = user?.departmentType || 'GOOGLE_DEPARTMENT'

  // Read initial tab from URL search params if present
  const [activeTab, setActiveTab] = useState<HelpCenterTab>('assigned-tickets')

  // Data states
  const [tickets, setTickets] = useState<EmployeeTicketWithCreator[]>([])
  const [statusSummary, setStatusSummary] = useState<HelpCenterStatusSummary | null>(null)
  const [analytics, setAnalytics] = useState<HelpCenterDashboardAnalytics | null>(null)

  const [isLoadingTickets, setIsLoadingTickets] = useState(true)
  const [isRefreshingTickets, setIsRefreshingTickets] = useState(false)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  // Fetch assigned tickets & status summary
  const loadTickets = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshingTickets(true)
      } else {
        setIsLoadingTickets(true)
      }

      try {
        const [ticketsRes, summaryRes] = await Promise.allSettled([
          fetchAssignedTickets(employeeEmail),
          fetchTicketStatusSummary(employeeEmail),
        ])

        if (ticketsRes.status === 'fulfilled') {
          setTickets(ticketsRes.value.content || [])
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          setStatusSummary(summaryRes.value)
        }
      } catch (err) {
        console.error('Error fetching tickets for employee:', err)
      } finally {
        setIsLoadingTickets(false)
        setIsRefreshingTickets(false)
      }
    },
    [employeeEmail]
  )

  // Fetch dashboard analytics
  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true)
    setAnalyticsError(null)
    try {
      const data = await fetchHelpCenterAnalytics(employeeEmail, userRole)
      setAnalytics(data)
    } catch (err) {
      setAnalyticsError(
        err instanceof Error ? err.message : 'Failed to load Help Center analytics'
      )
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [employeeEmail, userRole])

  // Initial load
  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics()
    }
  }, [activeTab, loadAnalytics])

  return (
    <div className="space-y-4">
      {/* ── Top Level Navigation Tabs (Assigned Tickets | Analytics | Department User) ── */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-fit">
        {/* Tab 1: Assigned tickets */}
        <button
          type="button"
          onClick={() => setActiveTab('assigned-tickets')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'assigned-tickets'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Headphones className="h-4 w-4" />
          <span>Assigned Tickets</span>
          {tickets.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                activeTab === 'assigned-tickets'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tickets.length}
            </span>
          )}
        </button>

        {/* Tab 2: Analytics */}
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'analytics'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analytics</span>
        </button>

        {/* Tab 3: Department User (Visible to Department Head & Admin) */}
        {isHead && (
          <button
            type="button"
            onClick={() => setActiveTab('department-members')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'department-members'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Department User</span>
          </button>
        )}
      </div>

      {/* ── Tab Content ── */}
      <div>
        {activeTab === 'assigned-tickets' && (
          <AssignedTicketsView
            tickets={tickets}
            email={employeeEmail}
            departmentType={departmentType}
            isLoading={isLoadingTickets}
            isRefreshing={isRefreshingTickets}
            onRefresh={() => loadTickets(true)}
            onTicketUpdated={() => loadTickets(true)}
            statusCounts={statusSummary?.statusCounts}
          />
        )}

        {activeTab === 'analytics' && (
          <HelpCenterAnalyticsView
            analytics={analytics}
            tickets={tickets}
            isLoading={isLoadingAnalytics}
            isRefreshing={isLoadingAnalytics}
            error={analyticsError}
            onRefresh={loadAnalytics}
          />
        )}

        {activeTab === 'department-members' && isHead && (
          <DepartmentUsersTicketsView departmentType={departmentType} />
        )}
      </div>
    </div>
  )
}

export default HelpCenterPage
