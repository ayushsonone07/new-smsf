import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'

export interface AutowebsionCustomerLightDTO {
  customerId: number
  ownerName?: string
  businessName?: string
  email?: string
  phoneNumber?: string
  gstNumber?: string | null
  isWebsiteExists?: boolean
  hasDuplicateCustomer?: boolean
  serviceTypes?: string[]
  mainStatus?: string
  assignedUserId?: number | null
  assignedUserName?: string
  assignedUserEmail?: string
  websiteAssignedUserName?: string
  websiteAssignedUserEmail?: string
  automationAssignedUserName?: string
  automationAssignedUserEmail?: string
  createdAt?: string
  updatedAt?: string
  serviceExpiration?: string
  internalRemark?: string
  clientRemark?: string
  isMailSent?: boolean
  draftStatus?: string
  subServiceInfo?: any[]
  services?: any[]
}

export interface AutowebsionPageResponse {
  success: boolean
  message?: string
  status?: string
  data: AutowebsionCustomerLightDTO[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface FetchAutowebsionParams {
  page?: number
  size?: number
  search?: string
  status?: string
  departmentType?: string
  phaseName?: string
  assignedUserEmail?: string
  startDate?: string
  endDate?: string
}

/**
 * Fetch lightweight customers list for Autowebsion (supports WEBSITE, AUTOMATION, or ALL filters).
 */
export async function fetchLightAutowebisionCustomers(
  params: FetchAutowebsionParams,
): Promise<AutowebsionPageResponse> {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? 10))
  if (params.search) search.set('search', params.search)
  if (params.status && params.status !== 'ALL') search.set('status', params.status)
  if (params.departmentType) search.set('departmentType', params.departmentType)
  if (params.phaseName) search.set('phaseName', params.phaseName)
  if (params.assignedUserEmail) search.set('assignedUserEmail', params.assignedUserEmail)
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)

  return authedApiRequest<AutowebsionPageResponse>(
    `/api/autowebision/customers/light?${search.toString()}`,
  )
}

/**
 * Dual / Single department assignment for Autowebsion user.
 */
export async function assignAutowebisionUser(payload: {
  customerIds: number[]
  assignedUserEmail: string
  phaseName?: string
  departmentType?: string
}): Promise<any> {
  return authedApiRequest('/api/auth/customer-service/assign-autowebision-user', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Updates isWebsiteExists boolean flag for a customer.
 */
export async function updateWebsiteExistsStatus(
  customerId: number | string,
  isWebsiteExists: boolean,
): Promise<any> {
  return authedApiRequest(`/api/autowebision/customers/${customerId}/website-exists`, {
    method: 'POST',
    body: JSON.stringify({ isWebsiteExists }),
  })
}

/**
 * Fetch merged department head summary metrics (Website + Automation combined).
 */
export async function fetchAutowebsionMergedSummary(
  startDate?: string,
  endDate?: string,
): Promise<any> {
  const search = new URLSearchParams()
  if (startDate) search.set('startDate', startDate)
  if (endDate) search.set('endDate', endDate)
  return authedApiRequest(`/api/autowebision/departmentHead/merged/summary?${search.toString()}`)
}

/**
 * Fetch combined statistics for Website & Automation in a single call.
 */
export async function fetchAutowebsionCombinedStatistics(): Promise<any> {
  return authedApiRequest('/api/autowebision/statistics/combined')
}

/**
 * Updates customer service status specifically for AUTOWEBSION / WEBSITE / AUTOMATION.
 */
export async function updateAutowebisionStatus(params: {
  customerId: string | number
  updatedStatus: string
  departmentType?: string
  serviceType?: string
}): Promise<any> {
  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''
  const search = new URLSearchParams()
  search.set('updatedStatus', params.updatedStatus.toUpperCase().replace(/-/g, '_'))
  if (params.departmentType) search.set('departmentType', params.departmentType)
  if (params.serviceType) search.set('serviceType', params.serviceType)

  return authedApiRequest(`/api/autowebision/update/${encodeURIComponent(String(params.customerId))}?${search.toString()}`, {
    method: 'PUT',
    headers: {
      username,
    },
  })
}

export interface AutomationCountEntry {
  serviceCategory: 'AUTOMATION' | 'WEBSITE' | 'AUTOWEBSION' | string
  total: number
  pending: number
  inProgress: number
  completed: number
}

/**
 * Fetch automation and website counts for tabs: Total, Pending, In Progress, Completed.
 */
export async function fetchAutomationCount(email?: string): Promise<AutomationCountEntry[]> {
  const session = getSession()
  const resolvedEmail = (email || session?.user?.email || session?.user?.username || '').trim()
  if (!resolvedEmail) return []
  try {
    const res = await authedApiRequest<AutomationCountEntry[]>(
      `/api/auth/automation-count/${encodeURIComponent(resolvedEmail)}`,
    )
    return Array.isArray(res) ? res : []
  } catch (err) {
    console.error('Failed to fetch automation count:', err)
    return []
  }
}

