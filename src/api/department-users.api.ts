import { authedApiRequest } from './client'

export interface DepartmentUserApiItem {
  id?: number | string
  departmentId?: number | string
  username: string
  email: string
  contact?: string
  role?: string
  createdAt?: string
  isHead?: boolean
  headUser?: string
  target?: number
  completed?: number
  achievedPercent?: number
  presentDays?: number
  absentDays?: number
  isPresentToday?: boolean
  users?: DepartmentUserApiItem[]
}

export interface DepartmentUsersPageResponse {
  data: DepartmentUserApiItem[]
  totalElements: number
  totalPage: number
  pageNumber: number
  elementSize: number
}

export interface OnboardedCustomerItem {
  id?: number | string
  customerId?: number | string
  businessName?: string
  ownerName?: string
  phoneNumber?: string
  email?: string
  onboardingStatus?: string
  createdAt?: string
  assignedUser?: string
  status?: string
}

export interface OnboardedCustomersPageResponse {
  customers: OnboardedCustomerItem[]
  totalElements: number
  totalPage: number
  pageNumber: number
}

export interface AuthOnboardingSummary {
  totalCustomers?: number
  onboardedCustomers?: number
  inProgressCustomers?: number
  pendingCustomers?: number
  delayedCustomers?: number
  statusCounts?: Record<string, number>
}

interface CustomPageResponseRaw<T> {
  data?: T[]
  customers?: T[]
  totalElements?: number
  totalPage?: number
  pageNumber?: number
  elementSize?: number
  success?: boolean
  message?: string
}

interface CustomApiResponseRaw<T> {
  data?: T
  status?: number
  success?: boolean
  message?: string
}

/**
 * `GET /api/auth/department/users`
 */
export async function getDepartmentUsers(params: {
  page?: number
  size?: number
  search?: string
} = {}): Promise<DepartmentUsersPageResponse> {
  const search = new URLSearchParams()
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.size !== undefined) search.set('size', String(params.size))
  if (params.search) search.set('search', params.search)

  const res = await authedApiRequest<CustomPageResponseRaw<DepartmentUserApiItem>>(
    `/api/auth/department/users?${search.toString()}`,
  )

  const items = Array.isArray(res?.data) ? res.data : []
  return {
    data: items,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
    pageNumber: res?.pageNumber ?? 0,
    elementSize: res?.elementSize ?? 10,
  }
}

/**
 * `GET /api/auth/onboarding/customers`
 */
export async function getOnboardingCustomers(params: {
  page?: number
  size?: number
  searchParam?: string
  startDate?: string
  endDate?: string
  status?: string
  filteredUser?: string
} = {}): Promise<OnboardedCustomersPageResponse> {
  const search = new URLSearchParams()
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.size !== undefined) search.set('size', String(params.size))
  if (params.searchParam) search.set('searchParam', params.searchParam)
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  if (params.status) search.set('status', params.status)
  if (params.filteredUser) search.set('filteredUser', params.filteredUser)

  const res = await authedApiRequest<
    CustomPageResponseRaw<OnboardedCustomerItem>
  >(`/api/auth/onboarding/customers?${search.toString()}`)

  const items = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.customers)
      ? res.customers
      : []

  return {
    customers: items,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
    pageNumber: res?.pageNumber ?? 0,
  }
}

/**
 * `GET /api/auth/onboarding/summary`
 */
export async function getAuthOnboardingSummary(params: {
  startDate?: string
  endDate?: string
  department?: string
  allTime?: boolean
} = {}): Promise<AuthOnboardingSummary> {
  const search = new URLSearchParams()
  if (params.department) search.set('department', params.department)
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  if (params.allTime) search.set('allTime', 'true')

  const res = await authedApiRequest<
    CustomApiResponseRaw<AuthOnboardingSummary> & AuthOnboardingSummary
  >(`/api/auth/onboarding/summary?${search.toString()}`)

  return (res?.data ?? res) as AuthOnboardingSummary
}

