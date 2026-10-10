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
  totalCustomers?: number
  totalCompletedCustomers?: number
  totalPendingCustomers?: number
  isSeniorUser?: boolean
  isAddUserDb?: boolean
  departmentType?: string
  updatedAt?: string
}

export interface DepartmentUsersPageResponse {
  data: DepartmentUserApiItem[]
  totalElements: number
  totalPage: number
  pageNumber: number
  elementSize: number
}

interface DepartmentUsersResponse {
  departmentId?: number | string
  username?: string
  email?: string
  contact?: string
  departmentType?: string
  role?: string
  createdAt?: string
  isHead?: boolean
  headUser?: string
  users?: DepartmentUserApiItem[]
  departmentSubUsers?: DepartmentUserApiItem[]
  sfpUsers?: DepartmentUserApiItem[]
}

export interface OnboardedCustomerItem {
  id?: number | string
  customerId?: number | string
  businessName?: string
  ownerName?: string
  phoneNumber?: string
  email?: string
  onboardingStatus?: string
  onboardingLink?: string
  createdAt?: string
  assignedUser?: string
  status?: string
}

export interface OnboardedCustomersPageResponse {
  customers: OnboardedCustomerItem[]
  totalElements: number
  totalPage: number
  pageNumber: number
  summary?: OnboardedCustomersSummary
}

export interface OnboardedCustomersSummary {
  total?: number
  pending?: number
  inProgress?: number
  completed?: number
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
  summary?: OnboardedCustomersSummary
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
 * 
 * Backend returns: CustomPageResponse<DepartmentUsersResponse>
 * where data is List<DepartmentUsersResponse> with ONE element (the head user's response)
 * and the actual users are in data[0].users (List<DepartmentUsersDetail>)
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

  const res = await authedApiRequest<CustomPageResponseRaw<DepartmentUsersResponse>>(
    `/api/auth/department/users?${search.toString()}`,
  )

  // Backend returns data as List<DepartmentUsersResponse> with one element
  // The actual users are in data[0].users
  const responseData = Array.isArray(res?.data) ? res.data : []
  const headUserResponse = responseData[0]
  const items = headUserResponse?.users ?? []

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
  if (params.startDate) {
    const s = params.startDate.includes('T') ? params.startDate : `${params.startDate}T00:00:00`
    search.set('startDate', s)
  }
  if (params.endDate) {
    const e = params.endDate.includes('T') ? params.endDate : `${params.endDate}T23:59:59`
    search.set('endDate', e)
  }
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
    summary: res?.summary,
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

export interface DepartmentCustomerRowItem {
  customerId?: number
  id?: number | string
  serviceType?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  customerDetails?: {
    email?: string
    ownerName?: string
    businessName?: string
    phoneNumber?: string
    gstNumber?: string
    address?: string
    zipCode?: string
  }
  assignedUserEmail?: string
  assignedUserName?: string
  remark?: string
  onboardingStatus?: string
  businessName?: string
  ownerName?: string
  email?: string
  phoneNumber?: string
  [key: string]: unknown
}

export interface DepartmentCustomerRowsPageResponse {
  customers: DepartmentCustomerRowItem[]
  totalElements: number
  totalPage: number
  pageNumber: number
}

/**
 * `GET /api/auth/department/customer/rows?page=0&size=10&compatible=true`
 */
export async function getDepartmentCustomerRows(params: {
  page?: number
  size?: number
  searchParam?: string
  statusFilter?: string
  userFilter?: string
  startDate?: string
  endDate?: string
  compatible?: boolean
} = {}): Promise<DepartmentCustomerRowsPageResponse> {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? 10))
  search.set('compatible', 'true')
  if (params.searchParam) search.set('searchParam', params.searchParam)
  if (params.statusFilter && params.statusFilter !== 'all') search.set('statusFilter', params.statusFilter)
  if (params.userFilter && params.userFilter !== 'all') search.set('userFilter', params.userFilter)
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)

  const res = await authedApiRequest<
    CustomPageResponseRaw<DepartmentCustomerRowItem> & CustomApiResponseRaw<DepartmentCustomerRowItem[]>
  >(`/api/auth/department/customer/rows?${search.toString()}`)

  const items = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.customers)
      ? res.customers
      : []

  return {
    customers: items,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
    pageNumber: res?.pageNumber ?? (params.page ?? 0),
  }
}
