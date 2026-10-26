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
  // The head/admin row sits at data[0] itself, sub-users in data[0].users
  let rawUsers: DepartmentUserApiItem[] = []
  if (Array.isArray(res?.data) && res.data.length > 0) {
    const first: any = res.data[0]
    const headRow: DepartmentUserApiItem | null =
      first?.email || first?.username
        ? { ...first, isHead: first.isHead ?? true }
        : null
    if (Array.isArray(first?.users)) {
      rawUsers = headRow ? [headRow, ...first.users] : first.users
    } else if (Array.isArray(first?.departmentSubUsers)) {
      rawUsers = headRow
        ? [headRow, ...first.departmentSubUsers]
        : first.departmentSubUsers
    } else if (headRow) {
      rawUsers = res.data as any
    }
  } else if (Array.isArray((res as any)?.users)) {
    rawUsers = (res as any).users
  }

  const items = rawUsers.map((u: any) => ({
    ...u,
    isSeniorUser: u.seniorUser !== undefined ? u.seniorUser : u.isSeniorUser,
  }))

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
  completionStartDate?: string
  completionEndDate?: string
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
  if (params.completionStartDate) {
    const cs = params.completionStartDate.includes('T') ? params.completionStartDate : `${params.completionStartDate}T00:00:00`
    search.set('completionStartDate', cs)
  }
  if (params.completionEndDate) {
    const ce = params.completionEndDate.includes('T') ? params.completionEndDate : `${params.completionEndDate}T23:59:59`
    search.set('completionEndDate', ce)
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
    amountPaid?: number | string
    amountPending?: number | string
    paidAmount?: number | string
  }
  columnData?: Record<string, unknown> | null
  delivered?: boolean
  isDelivered?: boolean
  serviceDeliverySent?: boolean
  deliveryStatus?: {
    isDelivered?: boolean
    delivered?: boolean
    deliveryDate?: string
    hasServiceHistory?: boolean
    completionPercentage?: number | null
  } | null
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

export interface DeliveryConfirmationData {
  invoice: string
  positiveReviewQrUsername: string
  positiveReviewQrPassword: string
  positiveReviewQr: string
  googlePerformanceDashboard: string
  creativeBundle: string
  website: string
  automationDashboard: string
  automationLoginId: string
  monthlyBlogPromotion: string
  aiVideo: string
  profileLink: string
}

export interface DeliveryConfirmationResult {
  message: string
  emailSent: boolean
  whatsappSent: boolean
}

/** Loads the saved Support delivery links used to prefill the confirmation form. */
export async function getCustomerDeliveryLinks(
  customerId: number | string,
  customerUsername: string,
): Promise<Partial<DeliveryConfirmationData> | null> {
  const search = new URLSearchParams({ customerId: String(customerId) })
  const res = await authedApiRequest<any>(
    `/api/auth/customer/delivery-links?${search.toString()}`,
    { headers: { username: customerUsername } },
  )

  if (res?.success === false) {
    throw new Error(res.message || 'Failed to load delivery links')
  }

  const links = res?.data ?? res
  if (!links || typeof links !== 'object') return null

  return {
    ...links,
    profileLink: links.googleBusinessProfileLink ?? links.profileLink ?? '',
    positiveReviewQrUsername:
      links.reviewUsUsername ?? links.positiveReviewQrUsername ?? '',
  }
}

/** Sends the complete service-delivery confirmation for a customer. */
export async function updateDeliveryConfirmation(
  customerId: number | string,
  data: DeliveryConfirmationData,
): Promise<DeliveryConfirmationResult> {
  const res = await authedApiRequest<any>(
    '/api/auth/customer-service/service-delivery-confirmation',
    {
      method: 'POST',
      body: JSON.stringify({ customerId, ...data }),
    },
  )

  if (res?.success === false) {
    throw new Error(res.message || 'Failed to update delivery confirmation')
  }

  const message = String(res?.message || '')
  const result = {
    message,
    emailSent: /email:\s*sent/i.test(message),
    whatsappSent: /whatsapp:\s*sent/i.test(message),
  }

  // The backend deliberately returns HTTP 200 even when either delivery
  // channel was skipped or failed, so the message is the authoritative result.
  if (!result.emailSent || !result.whatsappSent) {
    throw new Error(
      `Delivery unsuccessful. ${message || 'Email or WhatsApp was not sent.'}`,
    )
  }

  return result
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

  const res = await authedApiRequest<any>(
    `/api/auth/department/customer/rows?${search.toString()}`,
  )

  const items: DepartmentCustomerRowItem[] | undefined = Array.isArray(res)
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
                    : undefined

  if (!items) {
    throw new Error(res?.message || 'Department customer rows returned no data')
  }

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

/**
 * `PATCH /api/auth/update-current-data?customerId=X&currentData=Y`
 *
 * Updates the admin-provisioned custom column current value (e.g. the
 * support "Delivery Status" dropdown). Mirrors SMSF's
 * updateCustomerColumnCurrentData thunk.
 */
export async function updateCustomerColumnCurrentData(params: {
  customerId: number | string
  currentData: string
}): Promise<Record<string, unknown> | null> {
  const session = getSession()
  const search = new URLSearchParams({
    customerId: String(params.customerId),
    currentData: params.currentData,
  })
  const res = await authedApiRequest<{
    success?: boolean
    message?: string
    data?: Record<string, unknown>
  }>(`/api/auth/update-current-data?${search.toString()}`, {
    method: 'PATCH',
    headers: {
      username: session?.user.email || session?.user.username || '',
    },
  })

  if (res && res.success === false) {
    throw new Error(res.message || 'Failed to update delivery status')
  }

  return res?.data ?? null
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
  id?: string | number
  username?: string
  email?: string
  password?: string
  phoneNumber?: string
  target?: number
  departmentType?: string
  role?: string
  isHead?: boolean
  isSeniorUser?: boolean
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
 * Updates department user under a head (or head's own phone number).
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

  const { id, ...rest } = data
  const numericId =
    id !== undefined && id !== null && String(id).trim() !== '' && Number.isFinite(Number(id))
      ? Number(id)
      : undefined

  const body: Record<string, unknown> = {
    ...rest,
    ...(numericId !== undefined ? { id: numericId } : {}),
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

/**
 * Fetches the current logged-in department head/user's contact number and numeric ID
 * from `GET /api/auth/department/users?page=0&size=50` when not already in sessionStorage.
 */
export async function fetchCurrentUserProfileMeta(): Promise<{
  id?: number
  phoneNumber?: string
}> {
  const session = getSession()
  const email = (session?.user?.email || session?.user?.username || '').toLowerCase()
  if (!email || session?.user?.role === 'ADMIN' || session?.user?.role === 'CUSTOMER') {
    return {}
  }

  try {
    const res = await authedApiRequest<CustomPageResponseRaw<DepartmentUsersResponse>>(
      '/api/auth/department/users?page=0&size=50',
    )
    if (Array.isArray(res?.data) && res.data.length > 0) {
      const first: any = res.data[0]
      if (first?.email && String(first.email).toLowerCase() === email) {
        const contact = first.contact || first.phoneNumber
        return {
          id: Number.isFinite(Number(first.departmentId ?? first.id))
            ? Number(first.departmentId ?? first.id)
            : undefined,
          phoneNumber:
            contact && contact !== 'XXXXXXXXXX' ? String(contact).trim() : undefined,
        }
      }
      const list: any[] = Array.isArray(first?.users)
        ? first.users
        : Array.isArray(first?.departmentSubUsers)
          ? first.departmentSubUsers
          : []
      const match = list.find(
        (u) => u?.email && String(u.email).toLowerCase() === email,
      )
      if (match) {
        const contact = match.contact || match.phoneNumber
        return {
          id: Number.isFinite(Number(match.id ?? match.departmentId))
            ? Number(match.id ?? match.departmentId)
            : undefined,
          phoneNumber:
            contact && contact !== 'XXXXXXXXXX' ? String(contact).trim() : undefined,
        }
      }
    }
  } catch {
    // Non-fatal fallback
  }
  return {}
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

export interface BulkTransferCustomersRequest {
  fromUserEmail: string
  toUserEmail: string
  phaseName?: string
}

export interface BulkTransferCustomersResult {
  message: string
  data?: unknown
}

/**
 * Transfers every customer-service assignment in the signed-in user's
 * department from one department user to another.
 *
 * SMSB resolves the department from the authenticated/requesting user. The UI
 * deliberately does not send a department override, so both dropdowns remain
 * scoped by `GET /api/auth/department/users`.
 */
export async function bulkTransferCustomers(
  params: BulkTransferCustomersRequest,
): Promise<BulkTransferCustomersResult> {
  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''
  const fromUserEmail = params.fromUserEmail.trim()
  const toUserEmail = params.toUserEmail.trim()

  if (!fromUserEmail || !toUserEmail) {
    throw new Error('Select both source and destination users.')
  }
  if (fromUserEmail.toLowerCase() === toUserEmail.toLowerCase()) {
    throw new Error('Source and destination users must be different.')
  }

  const res = await authedApiRequest<CustomApiResponseRaw<unknown>>(
    '/api/auth/customer-service/assign-user',
    {
      method: 'POST',
      headers: { username },
      body: JSON.stringify({
        assignedFrom: fromUserEmail,
        assignedUserEmail: toUserEmail,
        isSelectAll: true,
        isRoundRobin: false,
        phaseName: params.phaseName?.trim() || 'Default',
      }),
    },
  )

  if (res?.success === false) {
    throw new Error(res.message || 'Bulk transfer failed.')
  }

  return {
    message: res?.message || 'Customers transferred successfully.',
    data: res?.data,
  }
}

/**
 * `PUT /api/auth/onboarding/update/{customerId}?updatedStatus={updatedStatus}`
 * Updates customer onboarding status in backend DB.
 */
export async function updateOnboardingStatus(
  customerId: string | number,
  updatedStatus: string,
): Promise<any> {
  const newStatusStr = updatedStatus.toUpperCase().replace(/-/g, '_')
  const endpoint = `/api/auth/onboarding/update/${customerId}?updatedStatus=${encodeURIComponent(newStatusStr)}`
  try {
    return await authedApiRequest<any>(endpoint, {
      method: 'PUT',
    })
  } catch (err: any) {
    if (err?.status === 405) {
      return await authedApiRequest<any>(endpoint, {
        method: 'POST',
      })
    }
    throw err
  }
}

export interface SendOnboardingConfirmationParams {
  recipientUsername: string
  contact: string
  isDuplicate?: boolean
  domainConnect?: boolean
  themeSelection?: boolean
}

/**
 * `POST /api/smtp/onboarding/confirmation`
 * Sends an onboarding acknowledgement email to the customer with confirmation link.
 */
export async function sendOnboardingConfirmationMail(
  params: SendOnboardingConfirmationParams,
): Promise<any> {
  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''
  const search = new URLSearchParams({
    recipientUsername: params.recipientUsername,
    contact: params.contact,
    isDuplicate: String(Boolean(params.isDuplicate)),
    domainConnect: String(Boolean(params.domainConnect)),
    themeSelection: String(Boolean(params.themeSelection)),
  })

  return authedApiRequest<any>(`/api/smtp/onboarding/confirmation?${search.toString()}`, {
    method: 'POST',
    headers: {
      username,
    },
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


export interface UserActionPayload {
  action: 'ADD' | 'DELETE'
  userId?: number
  name?: string
  email: string
  password?: string
  phone?: string | null
  role?: string
  status?: string
  timezone?: string
  departmentName?: string
  departmentType?: string
}

/**
 * `PUT /api/auth/department/users/user-action`
 * Toggles a department user's account inside the Ticket / HelpCenter database.
 */
export async function performUserAction(
  payload: UserActionPayload,
): Promise<{ success?: boolean; message?: string }> {
  const session = getSession()
  const headEmail = session?.user?.email || session?.user?.username || ''

  return authedApiRequest<{ success?: boolean; message?: string }>(
    '/api/auth/department/users/user-action',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        username: headEmail,
      },
      body: JSON.stringify(payload),
    },
  )
}

/**
 * `POST /api/attendance/user/absent?userId=${userId}&updatingStatus=${updatingStatus}`
 * Marks a user present (updatingStatus = true) or absent (updatingStatus = false).
 */
export async function updateUserAttendance(
  userId: number,
  updatingStatus: boolean,
): Promise<{ success?: boolean; message?: string }> {
  return authedApiRequest<{ success?: boolean; message?: string }>(
    `/api/attendance/user/absent?userId=${userId}&updatingStatus=${updatingStatus}`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}
