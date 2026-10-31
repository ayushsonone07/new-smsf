import { useState, useEffect, useMemo, useCallback } from 'react'
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
  const activeTab = selectedTab === 'department-members' && !isHead ? 'assigned-tickets' : selectedTab

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
