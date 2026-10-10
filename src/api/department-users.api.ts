import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'

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
  customerName?: string
  ownerName?: string
  phoneNumber?: string
  contact?: string
  email?: string
  onboardingStatus?: string
  onboardingLink?: string
  createdAt?: string
  assignedUser?: string
  assignedUserEmail?: string
  assignedUserName?: string
  assignedTo?: string
  status?: string
  hasDuplicate?: boolean
  hasDuplicateCustomer?: boolean
  hasDuplicateCustomers?: boolean
  duplicateCount?: number
  duplicateCustomers?: any[]
  customerDetails?: any
  remark?: string
  internalRemark?: string
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
  content?: T[]
  totalElements?: number
  total?: number
  totalPage?: number
  totalPages?: number
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

  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''

  const res = await authedApiRequest<
    CustomPageResponseRaw<OnboardedCustomerItem>
  >(`/api/auth/onboarding/customers?${search.toString()}`, {
    headers: {
      username,
    },
  })

  const raw: any = res
  const items = Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.customers)
      ? raw.customers
      : Array.isArray(raw?.content)
        ? raw.content
        : []

  const total =
    raw?.totalElements ??
    raw?.total ??
    raw?.data?.totalElements ??
    raw?.data?.total ??
    items.length

  const totalPage =
    raw?.totalPage ??
    raw?.totalPages ??
    raw?.data?.totalPage ??
    raw?.data?.totalPages ??
    Math.max(1, Math.ceil(total / (params.size ?? 10)))

  return {
    customers: items,
    totalElements: total,
    totalPage,
    pageNumber: raw?.pageNumber ?? (params.page ?? 0),
    summary: raw?.summary,
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
    duplicateCount?: number
    hasDuplicate?: boolean
    hasDuplicateCustomer?: boolean
  }
  assignedUserEmail?: string
  assignedUserName?: string
  assignedTo?: string
  remark?: string
  onboardingStatus?: string
  businessName?: string
  ownerName?: string
  email?: string
  phoneNumber?: string
  hasDuplicate?: boolean
  hasDuplicateCustomer?: boolean
  hasDuplicateCustomers?: boolean
  duplicateCount?: number
  duplicateCustomers?: any[]
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

  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''

  const res = await authedApiRequest<any>(
    `/api/auth/department/customer/rows?${search.toString()}`,
    {
      headers: {
        username,
      },
    },
  )

  const items: DepartmentCustomerRowItem[] = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data?.content)
          ? res.data.content
          : Array.isArray(res?.content)
            ? res.content
            : Array.isArray(res?.customers)
              ? res.customers
              : Array.isArray(res?.data?.customers)
                ? res.data.customers
                : Array.isArray(res?.rows)
                  ? res.rows
                  : Array.isArray(res?.data?.rows)
                    ? res.data.rows
                    : []

  const total =
    res?.totalElements ??
    res?.total ??
    res?.data?.totalElements ??
    res?.data?.total ??
    items.length

  const totalPage =
    res?.totalPage ??
    res?.totalPages ??
    res?.data?.totalPage ??
    res?.data?.totalPages ??
    Math.max(1, Math.ceil(total / (params.size ?? 10)))

  return {
    customers: items,
    totalElements: total,
    totalPage,
    pageNumber: res?.pageNumber ?? res?.data?.pageNumber ?? (params.page ?? 0),
  }
}

export interface CreateDepartmentUserRequest {
  username: string
  email: string
  password: string
  phoneNumber?: string
  contact?: string
  departmentType?: string
  role?: string
  isHead?: boolean
  headUser?: string
  calendlyLink?: string | null
}

/**
 * `POST /api/auth/department/register`
 * Registers a new department user under the current department head.
 * Follows SMSF reference structure.
 */
export async function createDepartmentUser(
  data: CreateDepartmentUserRequest,
): Promise<any> {
  const session = getSession()
  const headEmail = session?.user?.email || session?.user?.username || ''
  const rawDepartment = session?.user?.departmentType || ''
  const isGoogle =
    rawDepartment.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/google'))
  const departmentType =
    data.departmentType || (isGoogle ? 'GOOGLE_DEPARTMENT' : (rawDepartment || 'ONBOARDING_DEPARTMENT'))

  const body = {
    username: data.username.trim(),
    email: data.email.trim(),
    password: data.password,
    contact: data.phoneNumber || data.contact || null,
    departmentType,
    role: data.role || 'DEPARTMENT_USER',
    isHead: false,
    headUser: headEmail,
    calendlyLink: data.calendlyLink || null,
  }

  return authedApiRequest<any>('/api/auth/department/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      username: headEmail,
    },
    body: JSON.stringify(body),
  })
}

export interface UpdateDepartmentUserRequest {
  id: string | number
  username?: string
  email?: string
  password?: string
  phoneNumber?: string
  target?: number
  departmentType?: string
  role?: string
  isHead?: boolean
}

export interface UpdateDepartmentUserResponse {
  id: string
  username: string
  email: string
  role: string
  departmentType: string
  createdAt: string
  updatedAt: string
  isHead: boolean
  headUser: string
}

/**
 * `PUT /api/auth/department/update?action=edit`
 * Updates department user under a head.
 */
export async function updateDepartmentUser(
  data: UpdateDepartmentUserRequest,
): Promise<UpdateDepartmentUserResponse> {
  const session = getSession()
  const headEmail = session?.user?.email || session?.user?.username || ''
  const rawDepartment = session?.user?.departmentType || ''
  const isGoogle =
    rawDepartment.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/google'))
  const departmentType =
    data.departmentType || (isGoogle ? 'GOOGLE_DEPARTMENT' : (rawDepartment || 'ONBOARDING_DEPARTMENT'))

  const body = {
    ...data,
    departmentType,
    headUser: headEmail,
  }

  return authedApiRequest<any>('/api/auth/department/update?action=edit', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      username: headEmail,
    },
    body: JSON.stringify(body),
  }).then((res) => {
    if (res && res.success === false) {
      throw new Error(res.message || 'Failed to update user')
    }
    return res.data || res
  })
}

export interface DeleteDepartmentUserRequest {
  id: string | number
}

/**
 * `PUT /api/auth/department/update?action=delete`
 * Deletes department user.
 */
export async function deleteDepartmentUser(
  data: DeleteDepartmentUserRequest,
): Promise<any> {
  const session = getSession()
  const headEmail = session?.user?.email || session?.user?.username || ''

  return authedApiRequest<any>('/api/auth/department/update?action=delete', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      username: headEmail,
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (res && res.success === false) {
      throw new Error(res.message || 'Failed to delete user')
    }
    return res.data || res
  })
}

export interface AssignCustomerRequest {
  customerId: number | string
  assignedUserEmail: string
  departmentType?: string
}

/**
 * `POST /api/auth/customer-service/assign-user`
 * Assigns customer to a department user. Follows SMSF reference structure.
 */
export async function assignCustomerUser(params: AssignCustomerRequest): Promise<any> {
  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''
  const departmentType =
    params.departmentType || session?.user?.departmentType || 'ONBOARDING_DEPARTMENT'
  const idNum = Number(params.customerId)
  const cid = !isNaN(idNum) ? idNum : params.customerId

  const body = {
    customerIds: [cid],
    departmentType,
    assignedUserEmail: params.assignedUserEmail,
    assignedFrom: username,
    isSelectAll: false,
    isRoundRobin: false,
  }

  return authedApiRequest<any>('/api/auth/customer-service/assign-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      username,
    },
    body: JSON.stringify(body),
  })
}

export interface DuplicateCustomerSummaryItem {
  customerId?: number | string
  id?: number | string
  businessName?: string
  customerName?: string
  ownerName?: string
  email?: string
  phone?: string
  phoneNumber?: string
  contact?: string
  status?: string
  onboardingStatus?: string
  completeServiceStatus?: string
  createdAt?: string
  isMainBusiness?: boolean
  customerDetails?: {
    ownerName?: string
    businessName?: string
    phoneNumber?: string
    email?: string
    status?: string
    address?: string
    gstNumber?: string
    city?: string
    state?: string
    zipCode?: string
    duplicateCount?: number
  }
  services?: Array<{ serviceType?: string; status?: string }>
}

/**
 * `GET /api/auth/duplicate-customers/customer/{customerId}/summaries`
 * Fetches other businesses associated with the same customer / phone.
 */
export async function getDuplicateCustomerSummaries(
  customerId: number | string,
  departmentType: string = 'ONBOARDING_DEPARTMENT',
): Promise<DuplicateCustomerSummaryItem[]> {
  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''
  const search = new URLSearchParams()
  search.set('page', '0')
  search.set('size', '20')
  search.set('departmentType', departmentType)

  try {
    const res = await authedApiRequest<any>(
      `/api/auth/duplicate-customers/customer/${encodeURIComponent(String(customerId))}/summaries?${search.toString()}`,
      {
        headers: {
          username,
        },
      },
    )

    const raw = res?.data ?? res
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.data)) return raw.data
    if (Array.isArray(raw?.duplicateCustomers)) return raw.duplicateCustomers
    if (Array.isArray(raw?.content)) return raw.content
    if (Array.isArray(raw?.customers)) return raw.customers
    return []
  } catch (err) {
    console.warn('Could not fetch duplicate summaries:', err)
    return []
  }
}

