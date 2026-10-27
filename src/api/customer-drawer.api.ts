import { authedApiRequest, authedFileRequest } from './client'
import { getSession } from '../app/auth/session'

export interface CustomerProfileDetails {
  planIds?: string[]
  plan?: string
  packageName?: string
  planNames?: string[]
  businessName?: string
  ownerName?: string
  email?: string
  phone?: string
  isWebinarClient?: string
  billingAddress?: string
  dateOfPayment?: string
  paymentLinkSS?: string
  generatedBillInfo?: string
  brandName?: string
  businessCategory?: string
  yearStarted?: string
  happyCustomers?: string
  address?: string
  area?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  gstNumber?: string
  leadType?: string
  businessType?: string
  customBusinessType?: string
  gmbProfileLink?: string
  websiteLink?: string
  workingHours?: string
  socialLinks?: string
  logoLink?: string
  imagesLink?: string
  domain?: string
  domainStatus?: string
  selectedWebsiteTheme?: string
  serviceExpiration?: string
  locationKeywords?: string
  tonePreference?: string
  targetAudience?: string
  tagline?: string
  month?: string
  year?: string
  campaignTheme?: string
  topProducts?: string
  monthlyOffer?: string
  festiveOffer?: string
  mainGoal?: string
  appointmentMethod?: string
  certifications?: string
  partnerBrands?: string
  testimonials?: string
  disclaimer?: string
  simpleDescription?: string
  topProblems?: string
  topBenefits?: string
  remarks?: string
  amountPaid?: string
  amountPending?: string
  websiteSeoKeywords?: string
  additionalNumber?: string
  bookingLink?: string
  paymentLink?: string
  appointmentLink?: string
  googleReviewLink?: string
  pricing?: string
  offers?: string
  faqs?: string
  additionalInstructions?: string
  aiChatbotEmail?: string
  aiChatbotLink?: string
  source?: string
  paymentId?: string
  lastUpdatedAt?: string
}

export interface CustomerServiceRow {
  customerId?: number | string
  serviceType?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  serviceExpiration?: string
  isServiceActive?: boolean
  isMailSent?: boolean
  serviceDeliverySent?: boolean
  hasDuplicateCustomer?: boolean
  duplicateCount?: number
  onboardingStatus?: string
  assignedUserEmail?: string
  assignedUserName?: string
  customerDetails?: {
    email?: string
    ownerName?: string
    businessName?: string
    phoneNumber?: string
    gstNumber?: string
    address?: string
    zipCode?: string
    amountPaid?: string
    amountPending?: string
    remark?: string
    dueDate?: string
    status?: string
  }
  departmentStatuses?: Record<
    string,
    {
      status?: string
      onboarded?: boolean
      updatedAt?: string
      completedAt?: string
      timestamp?: string
    }
  >
  deliveryStatus?: {
    delivered?: boolean
    deliveryDate?: string
    hasServiceHistory?: boolean
    completionPercentage?: number
  }
  callStatus?: {
    status?: string
    connected?: boolean
    lastCallDate?: string
    callNotes?: string
    departmentType?: string
    updatedAt?: string
  }
  internalRemark?: string
}

export interface CustomerRemark {
  remark?: string
  timestamp?: string
  staffName?: string
  type?: string
}

export interface CustomerRemarks {
  departmentRemark?: CustomerRemark[]
  internalRemark?: CustomerRemark[]
  clientRemark?: CustomerRemark[]
  fifteenDayMeetingRemark?: CustomerRemark[]
}

export interface SuperAdminDepartmentRemarks {
  departmentType: string
  serviceType: string
  clientRemarks: CustomerRemark[]
}

export interface SuperAdminRemarks {
  departments: SuperAdminDepartmentRemarks[]
  customerRemarks: CustomerRemark[]
}

export interface CustomerReviewReply {
  reply: string
  timestamp: string
  staffName: string
}

export interface CustomerDrawerApiDetails {
  profile?: CustomerProfileDetails
  serviceRows: CustomerServiceRow[]
  serviceRowsLoading: boolean
  remarks?: CustomerRemarks
  internalRemarks: CustomerRemark[]
  superAdminRemarks?: SuperAdminRemarks
  reviewReplies: CustomerReviewReply[]
  isLoading: boolean
  errors: string[]
}

export async function getSuperAdminCustomerRemarks(
  customerId: number,
): Promise<SuperAdminRemarks | undefined> {
  try {
    const response = await authedApiRequest<ApiEnvelope<SuperAdminRemarks>>(
      `/api/auth/customer-service/${customerId}/superadmin-remarks`,
    )
    return response?.data
  } catch {
    return undefined
  }
}

export type CustomerExportFormat = 'pdf' | 'xlsx' | 'json'

export async function downloadCustomerExport(
  customerId: number,
  format: CustomerExportFormat,
): Promise<void> {
  const search = new URLSearchParams({ format })
  const { blob, fileName } = await authedFileRequest(
    `/api/customer/${customerId}/export?${search.toString()}`,
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || `customer-${customerId}-export.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

interface ApiEnvelope<T> {
  data?: T
  success?: boolean
  message?: string
}

interface CustomerRowsResponse {
  data?: CustomerServiceRow[] | CustomerRowsPage
  message?: string
}

interface CustomerRowsPage {
  data?: CustomerServiceRow[]
  message?: string
}

function requireData<T>(response: ApiEnvelope<T>, resource: string): T {
  if (response.data === undefined || response.data === null) {
    throw new Error(response.message || `${resource} returned no data`)
  }
  return response.data
}

export async function getCustomerProfileDetails(
  contact: string,
): Promise<CustomerProfileDetails> {
  const search = new URLSearchParams({ contact })
  const response = await authedApiRequest<
    ApiEnvelope<CustomerProfileDetails> & {
      customerDetails?: CustomerProfileDetails
      customer?: CustomerProfileDetails
    }
  >(
    `/api/common/customerDetails?${search.toString()}`,
  )
  const profile = response.data ?? response.customerDetails ?? response.customer
  if (profile) return profile

  // Some deployments return the customer object without an envelope.
  if (response && typeof response === 'object' && ('email' in response || 'phone' in response)) {
    return response as CustomerProfileDetails
  }
  throw new Error(response.message || 'Customer details returned no data')
}

export async function getCustomerReviewReplies(
  customerId: number,
  departmentType: string,
): Promise<CustomerReviewReply[]> {
  const response = await authedApiRequest<any>(
    `/api/auth/customer-service/review-reply/${customerId}/${encodeURIComponent(departmentType)}`,
  )
  
  let rawList: any[] = []
  if (Array.isArray(response)) {
    rawList = response
  } else if (Array.isArray(response?.data?.replies)) {
    rawList = response.data.replies
  } else if (Array.isArray(response?.replies)) {
    rawList = response.replies
  } else if (Array.isArray(response?.data)) {
    rawList = response.data
  } else if (Array.isArray(response?.data?.data)) {
    rawList = response.data.data
  }

  return rawList
    .map((item) => {
      const payload = item?.data ?? item
      return {
        reply: payload?.reply ?? payload?.remark ?? payload?.clientRemark ?? '',
        timestamp: payload?.timestamp ?? payload?.dateTime ?? payload?.date ?? '',
        staffName: payload?.staffName ?? payload?.name ?? payload?.username ?? '',
      }
    })
    .filter((r) => Boolean(r.reply))





}

export async function getCustomerRemarks(
  customerId: number,
  departmentType: string,
  username?: string,
): Promise<CustomerRemarks> {
  const search = new URLSearchParams({
    customerId: String(customerId),
    departmentType,
  })
  const response = await authedApiRequest<ApiEnvelope<CustomerRemarks>>(
    `/api/auth/customer-service/remarks?${search.toString()}`,
    username ? { headers: { username } } : undefined,
  )
  return requireData(response, 'Customer remarks')
}

export async function getCustomerInternalRemarks(
  customerId: number,
  departmentType: string,
  username?: string,
): Promise<CustomerRemark[]> {
  const search = new URLSearchParams({
    customerId: String(customerId),
    departmentType,
  })
  const response = await authedApiRequest<ApiEnvelope<CustomerRemark[]> | { data?: CustomerRemark[] }>(
    `/api/auth/customer-service/internal-remarks?${search.toString()}`,
    username ? { headers: { username } } : undefined,
  )
  const data = (response as ApiEnvelope<CustomerRemark[]>).data ?? (response as any)
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
}

export async function getCustomerServiceRows(
  contact: string,
  username?: string,
): Promise<CustomerServiceRow[]> {
  const search = new URLSearchParams({
    page: '0',
    size: '10',
    searchParam: contact,
  })
  const response = await authedApiRequest<CustomerRowsResponse>(
    `/api/auth/department/customer/rows?${search.toString()}`,
    username ? { headers: { username } } : undefined,
  )
  const rows = Array.isArray(response.data)
    ? response.data
    : response.data?.data
  if (!Array.isArray(rows)) {
    throw new Error(response.message || 'Customer service rows returned no data')
  }
  return rows
}

/**
 * `GET /api/auth/department/customer/{customerId}/services` — new-smsf drawer only.
 * Loads this one customer's service row by id (scoped to the logged-in user by the
 * backend) instead of searching the department rows by phone number.
 */
export async function getCustomerServiceRowById(
  customerId: number,
): Promise<CustomerServiceRow[]> {
  const response = await authedApiRequest<ApiEnvelope<CustomerServiceRow>>(
    `/api/auth/department/customer/${customerId}/services`,
  )
  return response.data ? [response.data] : []
}

export async function addClientRemark(
  customerId: number | string,
  remark: string,
  departmentType?: string,
): Promise<any> {
  const session = getSession()
  const dept = departmentType || session?.user?.departmentType || 'ONBOARDING_DEPARTMENT'
  const username = session?.user?.email || session?.user?.username || ''

  return await authedApiRequest<any>('/api/auth/customer-service/review-reply', {
    method: 'POST',
    body: JSON.stringify({
      customerId: Number(customerId),
      departmentype: dept,
      departmentType: dept,
      reply: remark.trim(),
    }),
    headers: username ? { username } : undefined,
  })
}
