import { authedApiRequest } from './client'

export interface LeadInfo {
  leadId: string
  ownerName: string
  businessName: string
  leadType: string
  leadStatus: string
  category: string
  city?: string
  createdAt?: string
  businessEmail?: string
  updatedAt?: string
  assginedUser?: string
  contact?: string
  meetingLinks?: Record<string, string>
  leadTag?: string
  isPaymentDone?: boolean | string
  packageDescription?: string
  description?: string
  telecallerAssigned?: string | null
  telecallerStatus?: string
  funnelType?: string
  paymentLink?: string | null
  paymentStatus?: string | null
  paymentLinkExpire?: string | null
  meetingScheduledAt?: string | null
  interest?: string
  latestFollowUpCall?: string | null
  nextFollowUpCalls?: string[]
}

export interface LeadsPageResponse<T> {
  status?: string | number
  message?: string
  success?: boolean
  data?: T[]
  elementSize?: number
  totalPages?: number
  currentPage?: number
  pageSize?: number
  isFirstPage?: boolean
  isLastPage?: boolean
}

export interface LeadStatsSummary {
  total: number
  pending: number
  inProgress: number
  converted: number
}

export interface FetchLeadsParams {
  page?: number
  size?: number
  search?: string
  action?: string | null
  leadStatus?: string | null
  telecallerStatus?: string | null
  leadType?: string | null
  funnelType?: string | null
  startDate?: string | null
  endDate?: string | null
}

export interface AssignableUser {
  id?: string | number
  username: string
  email: string
  departmentType?: string
  role?: string
}

export interface UpdateLeadStatusPayload {
  leadId: string
  newLeadStatus: string
  oldStatus?: string
  username?: string
  meetingLink?: string
  leadTag?: string
  isPaymentDone?: string | boolean
  packageDescription?: string
  plan?: string
  description?: string
  nextDate?: string
}

export interface UpdateTelecallerStatusPayload {
  leadId: string
  status: string
  assignedSalesPerson?: string
  meetingScheduledAt?: string
}

export interface FunnelItem {
  id?: string | number
  funnelName?: string
  funnelType?: string
}

function unwrapPayload<T>(res: any): T {
  if (!res) return res
  if (typeof res === 'object' && 'data' in res && res.data !== null && res.data !== undefined) {
    return res.data as T
  }
  return res as T
}

/**
 * Fetch paginated leads from SMSB: GET /api/leads
 */
export async function getLeads(params: FetchLeadsParams = {}): Promise<{
  leads: LeadInfo[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
  isFirstPage: boolean
  isLastPage: boolean
}> {
  const query = new URLSearchParams()
  query.set('pageNumber', String(params.page ?? 0))
  query.set('pageSize', String(params.size ?? 10))
  if (params.search?.trim()) query.set('searchParam', params.search.trim())
  if (params.action) query.set('action', params.action)
  if (params.leadStatus && params.leadStatus !== 'all') query.set('leadStatus', params.leadStatus)
  if (params.telecallerStatus && params.telecallerStatus !== 'all') query.set('telecallerStatus', params.telecallerStatus)
  if (params.leadType && params.leadType !== 'all') query.set('leadType', params.leadType)
  if (params.funnelType && params.funnelType !== 'all') query.set('funnelType', params.funnelType)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)

  const res = await authedApiRequest<any>(`/api/leads?${query.toString()}`)
  const rawList = res?.data || []
  return {
    leads: Array.isArray(rawList) ? rawList : [],
    totalElements: res?.elementSize ?? (Array.isArray(rawList) ? rawList.length : 0),
    totalPages: res?.totalPages ?? 1,
    currentPage: res?.currentPage ?? (params.page ?? 0),
    pageSize: res?.pageSize ?? (params.size ?? 10),
    isFirstPage: res?.isFirstPage ?? (params.page === 0),
    isLastPage: res?.isLastPage ?? true,
  }
}

export interface CreateLeadPayload {
  timeStamp?: string
  ownerName: string
  businessName: string
  email?: string
  platform: string
  leadStatus?: string
  category?: string
  city?: string
  contact: string
  assignedUser?: string
  telecallerUser?: string
  funnelType: string
}

/**
 * Add a single lead from the Add Lead form: POST /api/leads/create
 */
export async function createLead(payload: CreateLeadPayload): Promise<{ success: boolean; message: string }> {
  const res = await authedApiRequest<any>('/api/leads/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return {
    success: Boolean(res?.success ?? true),
    message: res?.message || 'Lead added successfully',
  }
}

/**
 * Upload leads Excel file: POST /api/leads/upload (multipart/form-data)
 */
export async function uploadLeadsExcel(file: File): Promise<{ success: boolean; message: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await authedApiRequest<any>('/api/leads/upload', {
    method: 'POST',
    body: formData,
  })
  return {
    success: Boolean(res?.success ?? true),
    message: res?.message || 'Leads uploaded successfully',
  }
}

/**
 * Delete selected leads or all: DELETE /api/leads/delete
 */
export async function deleteLeads(leadIds: string[], deleteAll: boolean = false): Promise<any> {
  return authedApiRequest<any>('/api/leads/delete', {
    method: 'DELETE',
    body: JSON.stringify({
      leadIds,
      isDeleteAll: deleteAll,
    }),
  })
}

/**
 * Assign single lead to user: PATCH /api/leads/assign/user
 */
export async function assignLeadToUser(
  leadId: string,
  assignedUser: string,
  assignmentType: string = 'sales',
): Promise<any> {
  return authedApiRequest<any>('/api/leads/assign/user', {
    method: 'PATCH',
    body: JSON.stringify({
      leadId,
      assignedUser,
      assignmentType,
    }),
  })
}

/**
 * Update lead sales status: PATCH /api/leads/update/status
 */

export interface BulkAssignLeadsPayload {
  leadIds: string[]
  salesMembers: string[]
  assignmentType?: string
  roundrobinStatus?: boolean
}

/**
 * Bulk assign / transfer multiple leads: PATCH /api/leads/assign
 */
export async function bulkAssignLeads(payload: BulkAssignLeadsPayload): Promise<any> {
  return authedApiRequest<any>('/api/leads/assign', {
    method: 'PATCH',
    body: JSON.stringify({
      leadIds: payload.leadIds,
      salesMembers: payload.salesMembers,
      assignmentType: payload.assignmentType || 'manual',
      roundrobinStatus: payload.roundrobinStatus || false,
    }),
  })
}

export async function updateLeadStatus(payload: UpdateLeadStatusPayload): Promise<any> {
  return authedApiRequest<any>('/api/leads/update/status', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Update telecaller status: PATCH /api/leads/telecaller/status/update
 */
export async function updateTelecallerStatus(payload: UpdateTelecallerStatusPayload): Promise<any> {
  return authedApiRequest<any>('/api/leads/telecaller/status/update', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Fetch funnels list: POST /api/leads/Funnel?action=fetch
 */
export async function fetchFunnels(): Promise<FunnelItem[]> {
  try {
    const res = await authedApiRequest<any>('/api/leads/Funnel?action=fetch', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const data = unwrapPayload<any>(res)
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('[leads.api] fetchFunnels error:', err)
    return []
  }
}

/**
 * Fetch assignable sales & department members
 */
export async function fetchAssignableUsers(departmentType?: string): Promise<AssignableUser[]> {
  try {
    const query = departmentType ? `?departmentType=${encodeURIComponent(departmentType)}` : ''
    const res = await authedApiRequest<any>(`/api/meetings/users/assigning-list${query}`)
    const data = unwrapPayload<any>(res)
    if (Array.isArray(data)) return data
  } catch {
    // fallback
  }

  try {
    const fallback = await authedApiRequest<any>('/api/help-center/users')
    const data = unwrapPayload<any>(fallback)
    if (Array.isArray(data)) return data
  } catch {
    // fallback
  }

  return []
}

export interface PaymentLinkGeneratePayload {
  amount: number // in INR rupees
  leadId: string
  customerName: string
  customerEmail?: string
  customerPhone: string
  description?: string
  expireInHours?: number
  plan?: string
}

/**
 * Generate payment link for lead: POST /api/payment/generatePaymentLink
 */
export async function generateLeadPaymentLink(
  payload: PaymentLinkGeneratePayload,
): Promise<{ shortUrl: string; id?: string }> {
  const cleanPhone = String(payload.customerPhone || '')
    .trim()
    .replace(/\D/g, '')
    .slice(-10)

  // Razorpay requires amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(payload.amount * 100)

  const body = {
    amount: amountInPaise,
    lead_id: payload.leadId,
    customer_name: payload.customerName || 'Customer',
    customer_email: payload.customerEmail || '',
    customer_phone: cleanPhone.length === 10 ? `+91${cleanPhone}` : payload.customerPhone,
    description: payload.description || `Payment for ${payload.plan || 'Service Plan'}`,
    reference_id: `LEAD_${payload.leadId.substring(0, 8)}_${Date.now()}`,
    expire_in_hours: payload.expireInHours || 24,
    payment_reference: 'sales@mbgcard.com',
    notes: {
      business_name: payload.customerName,
      customer_name: payload.customerName,
    },
  }

  const res = await authedApiRequest<any>('/api/payment/generatePaymentLink', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const data = res?.data || res
  const shortUrl = data?.short_url || data?.shortUrl || data?.paymentLink
  if (!shortUrl) {
    throw new Error(res?.message || 'Failed to generate payment link')
  }

  return {
    shortUrl,
    id: data?.id,
  }
}


