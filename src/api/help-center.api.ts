import { apiClient } from './axios'
import type {
  EmployeeTicketPageResponse,
  HelpCenterStatusSummary,
  HelpCenterDashboardAnalytics,
  AssignableUser,
  TicketStatus,
  HelpArticle,
  TicketHistoryPageResponse,
  TicketHistoryEntry,
} from '../features/departments/types/help-center.types'

interface CustomApiResponse<T> {
  status?: string | number
  statusCode?: number
  message?: string
  success?: boolean
  data: T
}

/**
 * Fetch paginated tickets assigned to an employee along with creator information.
 * Endpoint: GET /api/help-center/department_users/fetch_tickets_assigned_to_employee
 */
export async function fetchAssignedTickets(
  email: string,
  params?: {
    page?: number
    size?: number
    status?: string
    priority?: string
    startDate?: string
    endDate?: string
  }
): Promise<EmployeeTicketPageResponse> {
  const res = await apiClient.get<CustomApiResponse<EmployeeTicketPageResponse>>(
    '/api/help-center/department_users/fetch_tickets_assigned_to_employee',
    {
      params: {
        email,
        page: params?.page ?? 0,
        size: params?.size ?? 100,
        status: params?.status || undefined,
        priority: params?.priority || undefined,
        startDate: params?.startDate || undefined,
        endDate: params?.endDate || undefined,
      },
    }
  )

  const data = res.data?.data
  if (!data) {
    return {
      content: [],
      currentPage: 0,
      pageSize: params?.size ?? 100,
      totalRecords: 0,
      totalPages: 0,
    }
  }

  // Ensure content is an array
  if (!Array.isArray(data.content)) {
    data.content = []
  }

  return data
}

/**
 * Fetch status summary counts for tickets (e.g. OPEN, IN_PROGRESS, etc.).
 * Endpoint: GET /api/help-center/tickets/status_summary?email=...
 */
export async function fetchTicketStatusSummary(
  email: string
): Promise<HelpCenterStatusSummary | null> {
  try {
    const res = await apiClient.get<CustomApiResponse<HelpCenterStatusSummary>>(
      '/api/help-center/tickets/status_summary',
      {
        params: { email },
      }
    )
    return res.data?.data ?? null
  } catch (err) {
    console.warn('Failed to fetch status summary from API:', err)
    return null
  }
}

/**
 * Fetch Help Center dashboard analytics.
 * Endpoint: GET /api/help-center/dashboard/analytics
 */
export async function fetchHelpCenterAnalytics(
  email?: string,
  role?: string
): Promise<HelpCenterDashboardAnalytics | null> {
  try {
    const res = await apiClient.get<CustomApiResponse<HelpCenterDashboardAnalytics>>(
      '/api/help-center/dashboard/analytics',
      {
        params: {
          email: email || undefined,
          role: role || undefined,
        },
      }
    )
    return res.data?.data ?? null
  } catch (err) {
    console.warn('Failed to fetch help center analytics from API:', err)
    return null
  }
}

/**
 * Update the status of a ticket with remark.
 * Endpoint: PATCH /api/help-center/department_users/update_ticket_status?ticketNumber=...
 */
export async function updateTicketStatus(
  ticketNumber: string,
  status: TicketStatus,
  remark: string
): Promise<TicketStatus> {
  const res = await apiClient.patch<CustomApiResponse<TicketStatus>>(
    `/api/help-center/department_users/update_ticket_status`,
    {
      status,
      remark,
    },
    {
      params: { ticketNumber },
    }
  )
  return res.data?.data ?? status
}

/**
 * Reassign tickets to an employee.
 * Endpoint: POST /api/help-center/tickets/assign
 */
export async function assignTickets(
  assignments: { ticketNumber: string; email: string }[]
): Promise<boolean> {
  await apiClient.post<CustomApiResponse<unknown>>(
    '/api/help-center/tickets/assign',
    {
      assignments,
    }
  )
  return true
}

/**
 * Fetch assignable team members for this department.
 * Endpoint: GET /api/meetings/users/assigning-list?departmentType=...
 */
export async function fetchAssignableDepartmentUsers(
  departmentType?: string
): Promise<AssignableUser[]> {
  try {
    const res = await apiClient.get<CustomApiResponse<AssignableUser[]>>(
      '/api/meetings/users/assigning-list',
      {
        params: {
          departmentType: departmentType || undefined,
        },
      }
    )
    const list = res.data?.data
    if (Array.isArray(list)) {
      return list
    }
  } catch {
    // fallback
  }

  try {
    const fallback = await apiClient.get<CustomApiResponse<AssignableUser[]>>(
      '/api/help-center/users'
    )
    const list = fallback.data?.data
    if (Array.isArray(list)) {
      return list
    }
  } catch {
    // fallback
  }

  return []
}

/**
 * Fetch status change history for a specific ticket.
 * Endpoint: GET /api/help-center/department_users/ticket_history?ticketNumber=...&page=...&size=...
 * Fallback: GET /api/help-center/tickets/{ticketNumber}/status-history
 */
export async function fetchTicketHistory(
  ticketNumber: string,
  page = 0,
  size = 10
): Promise<TicketHistoryPageResponse> {
  try {
    const res = await apiClient.get<CustomApiResponse<TicketHistoryPageResponse>>(
      '/api/help-center/department_users/ticket_history',
      {
        params: {
          ticketNumber,
          page,
          size,
        },
      }
    )

    if (res.data?.data && Array.isArray(res.data.data.entries)) {
      return res.data.data
    }
  } catch (err) {
    console.warn('Proxy ticket_history failed, trying status-history fallback:', err)
  }

  // Fallback to /api/help-center/tickets/{ticketNumber}/status-history
  try {
    const fallbackRes = await apiClient.get<CustomApiResponse<Record<string, unknown>[]>>(
      `/api/help-center/tickets/${encodeURIComponent(ticketNumber)}/status-history`
    )

    const list = fallbackRes.data?.data || []
    const entries: TicketHistoryEntry[] = list.map((item) => ({
      ticketNumber,
      id: item.id as string | number,
      status: (item.newStatus || item.status || 'UPDATED') as string,
      previousStatus: (item.oldStatus || item.previousStatus) as string | undefined,
      remark: (item.newStatusDescription || item.remark || '') as string,
      updatedBy: (item.updatedBy || item.userId || '') as string,
      updatedAt: (item.updatedAt || item.createdAt || new Date().toISOString()) as string,
    }))

    return {
      entries,
      currentPage: 0,
      pageSize: size,
      totalRecords: entries.length,
      totalPages: Math.ceil(entries.length / size) || 1,
      hasNext: false,
      hasPrevious: false,
    }
  } catch (err) {
    console.error('Both ticket history endpoints failed:', err)
    return {
      entries: [],
      currentPage: 0,
      pageSize: size,
      totalRecords: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    }
  }
}

/**
 * Legacy mock articles function kept for backward compatibility.
 */
export async function getHelpArticles(
  _departmentId: string
): Promise<HelpArticle[]> {
  return []
}
