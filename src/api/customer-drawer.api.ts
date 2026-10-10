import { authedApiRequest } from './client'

export interface CustomerProfileDetails {
  planIds?: string[]
  plan?: string
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
    { status?: string; onboarded?: boolean }
  >
  deliveryStatus?: {
    delivered?: boolean
    deliveryDate?: string
    hasServiceHistory?: boolean
    completionPercentage?: number
  }
  callStatus?: {
    lastCallDate?: string
    callNotes?: string
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

export interface CustomerReviewReply {
  data?: Record<string, unknown>
}

export interface CustomerDrawerApiDetails {
  profile?: CustomerProfileDetails
  serviceRows: CustomerServiceRow[]
  serviceRowsLoading: boolean
  remarks?: CustomerRemarks
  reviewReplies: CustomerReviewReply[]
  isLoading: boolean
  errors: string[]
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
  const response = await authedApiRequest<ApiEnvelope<CustomerProfileDetails>>(
    `/api/common/customerDetails?${search.toString()}`,
  )
  return requireData(response, 'Customer details')
}

export async function getCustomerReviewReplies(
  customerId: number,
  departmentType: string,
): Promise<CustomerReviewReply[]> {
  const response = await authedApiRequest<
    ApiEnvelope<{ replies?: CustomerReviewReply[] }>
  >(
    `/api/auth/customer-service/review-reply/${customerId}/${encodeURIComponent(departmentType)}`,
  )
  return requireData(response, 'Review replies').replies ?? []
}

export async function getCustomerRemarks(
  customerId: number,
  departmentType: string,
): Promise<CustomerRemarks> {
  const search = new URLSearchParams({
    customerId: String(customerId),
    departmentType,
  })
  const response = await authedApiRequest<ApiEnvelope<CustomerRemarks>>(
    `/api/auth/customer-service/remarks?${search.toString()}`,
  )
  return requireData(response, 'Customer remarks')
}

export async function getCustomerServiceRows(
  contact: string,
): Promise<CustomerServiceRow[]> {
  const search = new URLSearchParams({
    page: '0',
    size: '10',
    searchParam: contact,
  })
  const response = await authedApiRequest<CustomerRowsResponse>(
    `/api/auth/department/customer/rows?${search.toString()}`,
  )
  const rows = Array.isArray(response.data)
    ? response.data
    : response.data?.data
  if (!Array.isArray(rows)) {
    throw new Error(response.message || 'Customer service rows returned no data')
  }
  return rows
}
