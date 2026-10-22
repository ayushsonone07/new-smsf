export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_ON_CUSTOMER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'

export interface EmployeeTicketWithCreator {
  ticketId: number
  ticketNumber: string
  subject: string
  description?: string | null
  ticketStatus: TicketStatus
  priority: TicketPriority
  departmentName?: string | null
  ticketCreatedAt: string
  ticketUpdatedAt?: string | null
  ticketResolvedAt?: string | null
  hasHistory?: boolean
  creatorId?: number | null
  creatorName?: string | null
  creatorEmail?: string | null
  creatorPhone?: string | null
  creatorStatus?: 'ACTIVE' | 'INACTIVE' | string | null
  creatorRegisteredAt?: string | null
}

export interface EmployeeTicketPageResponse {
  content: EmployeeTicketWithCreator[]
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export interface HelpCenterStatusSummary {
  email?: string
  totalCount: number
  statusCounts: Record<string, number>
  monthlyLimit?: number
  monthlyUsed?: number
  monthlyRemaining?: number
}

export interface HelpCenterDashboardUserAnalytics {
  userId: number
  userName: string
  userEmail: string
  departmentId: number
  departmentName: string
  totalTickets: number
  open: number
  inProgress: number
  waitingOnCustomer: number
  resolved: number
  closed: number
  escalated: number
  solved?: number
  unsolved?: number
}

export interface HelpCenterDashboardAnalytics {
  users: HelpCenterDashboardUserAnalytics[]
  overallTotalTickets: number
  overallOpen: number
  overallInProgress: number
  overallWaitingOnCustomer: number
  overallResolved: number
  overallClosed: number
  overallEscalated: number
  overallSolved?: number
  overallUnsolved?: number
}

export interface AssignableUser {
  id: string | number
  username?: string
  email: string
  departmentType?: string
  role?: string
}

export interface HelpArticle {
  id: string
  departmentId: string
  title: string
  category: string
  excerpt: string
  updatedAt: string
}

export interface TicketHistoryEntry {
  ticketNumber?: string
  id?: number | string
  assignedTo?: string | null
  status: string
  previousStatus?: string | null
  priority?: string | null
  updatedAt: string
  resolvedAt?: string | null
  remark?: string | null
  updatedBy?: string | null
}

export interface TicketHistoryPageResponse {
  entries: TicketHistoryEntry[]
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}
