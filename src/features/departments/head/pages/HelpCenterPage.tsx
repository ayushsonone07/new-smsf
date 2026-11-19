import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { AllDepartmentTicketsView } from '../../../../components/head/helpCenter/AllDepartmentTicketsView'
import { HelpCenterCallsView } from '../../../../components/head/helpCenter/HelpCenterCallsView'
import { TimeRangeFilter, TimeRangeFilterValue } from '../../../../components/head/helpCenter/TimeRangeFilter'
import { useHelpCenterTab } from '../utils/helpCenterTab'

export function HelpCenterPage() {
  const session = getSession()
  const user = session?.user

  const employeeEmail = useMemo(() => {
    return user?.email || user?.username || 'googledepartment@mbgcard.com'
  }, [user])

  const userRole = user?.role || 'HEAD'
  const isHead = userRole === 'HEAD' || userRole === 'ADMIN'
  const normalizedUserRole = String(userRole).toUpperCase()
  const isDepartmentHead =
    normalizedUserRole === 'HEAD' ||
    normalizedUserRole === 'DEPARTMENT_HEAD' ||
    (user as { isHead?: boolean } | undefined)?.isHead === true
  const canReassignTickets = isDepartmentHead || normalizedUserRole === 'ADMIN'
  const canViewHistory = true
  const departmentType = user?.departmentType || 'GOOGLE_DEPARTMENT'

  // The sub-tab is chosen from the Help & Support entries in the sidebar.
  const selectedTab = useHelpCenterTab()
  const isHeadOnlyTab = selectedTab === 'department-members' || selectedTab === 'all-tickets'
  const activeTab = isHeadOnlyTab && !isHead ? 'assigned-tickets' : selectedTab

  // Time range filter state
  const [timeFilter, setTimeFilter] = useState<TimeRangeFilterValue>({ preset: 'all' })

  // Data states
  const [tickets, setTickets] = useState<EmployeeTicketWithCreator[]>([])
  const [statusSummary, setStatusSummary] = useState<HelpCenterStatusSummary | null>(null)
  const [analytics, setAnalytics] = useState<HelpCenterDashboardAnalytics | null>(null)

  const [isLoadingTickets, setIsLoadingTickets] = useState(true)
  const [isRefreshingTickets, setIsRefreshingTickets] = useState(false)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  // Abort controllers for deduplicating in-flight calls
  const ticketsAbortRef = useRef<AbortController | null>(null)
  const analyticsAbortRef = useRef<AbortController | null>(null)

  // Fetch assigned tickets & status summary
  const loadTickets = useCallback(
    async (isManualRefresh = false, currentFilter: TimeRangeFilterValue = timeFilter) => {
      if (ticketsAbortRef.current) {
        ticketsAbortRef.current.abort()
      }
      const controller = new AbortController()
      ticketsAbortRef.current = controller

      if (isManualRefresh) {
        setIsRefreshingTickets(true)
      } else {
        setIsLoadingTickets(true)
      }

      try {
        const filterParams = {
          days: currentFilter.days,
          months: currentFilter.months,
          period: currentFilter.period,
          startDate: currentFilter.startDate,
          endDate: currentFilter.endDate,
          signal: controller.signal,
        }

        const [ticketsRes, summaryRes] = await Promise.allSettled([
          fetchAssignedTickets(employeeEmail, { ...filterParams, size: 100 }),
          fetchTicketStatusSummary(employeeEmail, controller.signal),
        ])

        if (controller.signal.aborted) return

        if (ticketsRes.status === 'fulfilled') {
          setTickets(ticketsRes.value.content || [])
        }

        if (summaryRes.status === 'fulfilled' && summaryRes.value) {
          setStatusSummary(summaryRes.value)
        }
      } catch (err: any) {
        if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') {
          console.error('Error fetching tickets for employee:', err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTickets(false)
          setIsRefreshingTickets(false)
        }
      }
    },
    [employeeEmail, timeFilter]
  )

  // Fetch dashboard analytics
  const loadAnalytics = useCallback(
    async (currentFilter: TimeRangeFilterValue = timeFilter) => {
      if (analyticsAbortRef.current) {
        analyticsAbortRef.current.abort()
      }
      const controller = new AbortController()
      analyticsAbortRef.current = controller

      setIsLoadingAnalytics(true)
      setAnalyticsError(null)
      try {
        const filterParams = {
          days: currentFilter.days,
          months: currentFilter.months,
          period: currentFilter.period,
          startDate: currentFilter.startDate,
          endDate: currentFilter.endDate,
          signal: controller.signal,
        }
        const data = await fetchHelpCenterAnalytics(employeeEmail, userRole, filterParams)
        if (!controller.signal.aborted) {
          setAnalytics(data)
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setAnalyticsError(
            err instanceof Error ? err.message : 'Failed to load Help Center analytics'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAnalytics(false)
        }
      }
    },
    [employeeEmail, userRole, timeFilter]
  )

  // Update filter only — the effect handles the single fetch
  function handleTimeFilterChange(newFilter: TimeRangeFilterValue) {
    setTimeFilter(newFilter)
  }

  // Load tickets only when assigned-tickets tab is active
  useEffect(() => {
    if (activeTab === 'assigned-tickets') {
      loadTickets(false, timeFilter)
    }
    return () => {
      if (ticketsAbortRef.current) {
        ticketsAbortRef.current.abort()
      }
    }
  }, [activeTab, employeeEmail, timeFilter])

  // Load analytics only when analytics tab is active and filter changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics(timeFilter)
    }
    return () => {
      if (analyticsAbortRef.current) {
        analyticsAbortRef.current.abort()
      }
    }
  }, [activeTab, employeeEmail, userRole, timeFilter])

  return (
    <div className="space-y-4">
      {/* ── Time Range Filter Bar (Days, Months, Presets) ── */}
      <TimeRangeFilter
        value={timeFilter}
        onChange={handleTimeFilterChange}
        disabled={isLoadingTickets || isLoadingAnalytics}
      />

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
            canViewHistory={canViewHistory}
            canUpdateStatus={!isDepartmentHead}
            canReassignTickets={canReassignTickets}
            canCall={!isDepartmentHead}
            introText={
              isDepartmentHead
                ? 'Not assigned tickets — these are still with you and have not been given to a department user yet. Re-assign them or use Round robin; a ticket leaves this list once it is assigned.'
                : undefined
            }
            emptyText={
              isDepartmentHead
                ? 'All tickets are assigned to department users. Nothing is waiting for assignment.'
                : 'No tickets are assigned to you yet.'
            }
          />
        )}

        {activeTab === 'all-tickets' && isHead && (
          <AllDepartmentTicketsView
            headEmail={employeeEmail}
            departmentType={departmentType}
            timeFilter={timeFilter}
          />
        )}

        {activeTab === 'analytics' && (
          <HelpCenterAnalyticsView
            analytics={analytics}
            tickets={tickets}
            isLoading={isLoadingAnalytics}
            isRefreshing={isLoadingAnalytics}
            error={analyticsError}
            onRefresh={() => loadAnalytics(timeFilter)}
            isDepartmentHead={isDepartmentHead}
            currentUserEmail={employeeEmail}
          />
        )}

        {activeTab === 'department-members' && isHead && (
          <DepartmentUsersTicketsView departmentType={departmentType} />
        )}

        {activeTab === 'calls' && (
          <HelpCenterCallsView
            departmentType={departmentType}
            timeFilter={timeFilter}
            isDepartmentHead={isDepartmentHead}
          />
        )}
      </div>
    </div>
  )
}

export default HelpCenterPage
