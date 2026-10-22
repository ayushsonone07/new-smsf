import { authedApiRequest } from './client'

export interface TaskHistoryItem {
  id?: number | string
  customerName?: string
  customerPhone?: string
  assignedTo?: string
  serviceType?: string
  departmentServiceName?: string
  phaseName?: string
  status?: string
  serviceStatus?: string
  isActive?: boolean
  assignedAt?: string
  startedAt?: string | null
  endedAt?: string | null
  remarks?: string
  contact?: string
  username?: string
  departmentUserFilter?: string
  createdAt?: string
}

export interface TaskHistoryResponse {
  data: TaskHistoryItem[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface TaskHistoryParams {
  departmentUserFilter?: string
  taskState?: string
  phaseName?: string
  customerName?: string
  fromDate?: string
  toDate?: string
  pageNumber?: number
  pageSize?: number
}

export interface DepartmentUserAnalyticItem {
  id?: number | string
  userId?: string
  contact?: string
  updatedBy?: string
  username?: string
  name?: string
  email?: string
  role?: string
  firstStatusUpdate?: string
  lastStatusUpdate?: string
  totalUpdates?: number
  leadUpdates?: number
  customerUpdates?: number
  servicesDelivered?: number
  totalTasks?: number
  completedTasks?: number
  pendingTasks?: number
  activeTasks?: number
  averageCompletionTime?: string
  date?: string
  allTimeCustomers?: number
  assigned?: number
  completed?: number
  pendingCustomers?: number
  delayed?: number
  achievedPercentage?: number
  presentDays?: number
  absentDays?: number
}

export interface DepartmentUsersAnalyticResponse {
  data: DepartmentUserAnalyticItem[]
  teamMembers?: DepartmentUserAnalyticItem[]
  totalMembers?: number
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface DepartmentUsersAnalyticsParams {
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  size?: number
}

interface CustomApiResponseRaw<T> {
  success?: boolean
  message?: string
  status?: string
  data?: T
  pageNumber?: number
  elementSize?: number
  totalElements?: number
  totalPage?: number
  first?: boolean
  last?: boolean
}

export interface RecurringServiceSnapshot {
  serviceType?: string
  status?: string
  assignedUser?: string
  createdAt?: string
  updatedAt?: string
  expirationAt?: string
  active?: boolean
}

export interface RecurringTimelineEvent {
  id?: number | string
  type: string
  serviceType?: string
  phaseName?: string
  oldValue?: string
  newValue?: string
  fromUser?: string
  toUser?: string
  performedBy?: string
  remarks?: string
  occurredAt: string
}

export interface RecurringTimelineResponse {
  customerId: number
  customerName?: string
  departmentType: string
  createdAt?: string
  updatedAt?: string
  expirationAt?: string
  currentStatus?: string
  currentAssignedUser?: string
  services: RecurringServiceSnapshot[]
  events: RecurringTimelineEvent[]
}

export async function getRecurringTimeline(
  customerId: number,
  departmentType: string,
): Promise<RecurringTimelineResponse> {
  const search = new URLSearchParams({ departmentType })
  const res = await authedApiRequest<CustomApiResponseRaw<RecurringTimelineResponse>>(
    `/api/customer/${customerId}/recurring-timeline?${search.toString()}`,
  )

  if (!res?.data) throw new Error('Recurring timeline was not returned.')
  return res.data
}

export async function getTaskHistory(
  params: TaskHistoryParams = {},
): Promise<TaskHistoryResponse> {
  const search = new URLSearchParams()

  if (params.departmentUserFilter) {
    search.set('departmentUserFilter', params.departmentUserFilter)
  }
  const validTaskStatuses = ['ACTIVE', 'COMPLETED', 'REASSIGNED', 'CANCELLED']
  if (params.taskState && params.taskState !== 'all' && validTaskStatuses.includes(params.taskState.toUpperCase())) {
    search.set('taskStatus', params.taskState.toUpperCase())
  }
  if (params.phaseName) search.set('phaseName', params.phaseName)
  if (params.customerName) search.set('customerName', params.customerName)
  if (params.fromDate) search.set('fromDate', params.fromDate)
  if (params.toDate) search.set('toDate', params.toDate)
  if (params.pageNumber !== undefined) {
    search.set('pageNumber', String(params.pageNumber))
  }
  if (params.pageSize !== undefined) {
    search.set('pageSize', String(params.pageSize))
  }

  const res = await authedApiRequest<
    CustomApiResponseRaw<TaskHistoryItem[]>
  >(`/api/task-history/department?${search.toString()}`)

  const items = Array.isArray(res?.data) ? res.data : []
  return {
    data: items,
    pageNumber: res?.pageNumber ?? 0,
    elementSize: res?.elementSize ?? items.length,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
    first: res?.first ?? true,
    last: res?.last ?? true,
  }
}

export async function getDepartmentUsersAnalytics(
  params: DepartmentUsersAnalyticsParams = {},
): Promise<DepartmentUsersAnalyticResponse> {
  const search = new URLSearchParams()

  if (params.userId) search.set('userId', params.userId)
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.size !== undefined) search.set('size', String(params.size))

  const res = await authedApiRequest<
    CustomApiResponseRaw<DepartmentUserAnalyticItem[]> | DepartmentUserAnalyticItem[]
  >(`/api/analytics/departmentUsers?${search.toString()}`)

  const items = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
      ? res.data
      : Array.isArray((res as Record<string, unknown>)?.teamMembers)
        ? ((res as Record<string, unknown>).teamMembers as DepartmentUserAnalyticItem[])
        : []

  const totalElements = Array.isArray(res)
    ? res.length
    : (res?.totalElements ?? ((res as Record<string, unknown>)?.totalMembers as number | undefined) ?? items.length)

  return {
    data: items,
    teamMembers: items,
    totalMembers: totalElements,
    pageNumber: Array.isArray(res) ? 0 : (res?.pageNumber ?? 0),
    elementSize: Array.isArray(res) ? items.length : (res?.elementSize ?? items.length),
    totalElements,
    totalPage: Array.isArray(res) ? 1 : (res?.totalPage ?? 1),
    first: Array.isArray(res) ? true : (res?.first ?? true),
    last: Array.isArray(res) ? true : (res?.last ?? true),
  }
}

