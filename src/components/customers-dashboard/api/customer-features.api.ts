import { apiRequest } from '../../../api/client'
import { getSession } from '../../../app/auth/session'
import { getCustomerSession } from '../../../features/customers/hooks/useCustomerSession'

export interface ServiceDetailsDTO {
  serviceType: string
  status: string
  expirationDate: string
  department: string
  isServiceActive: boolean
  meetingCount: number
  assignedTo?: {
    username: string
    departmentType: string
    phoneNumber?: string
  }[]
  remarks?: any[]
  taginfo?: any[]
}

export interface CustomerMeetingDetailsDTO {
  customerId: number
  serviceType: string
  departmentType: string
  updatedAt: string
  totalMeetings: number
  meetingLinks: Record<string, string>
}

export interface ServiceDataField {
  value: string
  updatedAt: string
}

export interface CustomerServiceData {
  plan?: {
    planType: string | null
  }
  commonInfo: Record<string, ServiceDataField>
  departmentSpecificInfo: Record<string, Record<string, ServiceDataField>>
  customerDataFile?: string
}

export interface CustomerBillingDetails {
  id?: string | number
  billingAddress?: string
  gstNumber?: string
  paymentLinkSS?: string
  phone?: string
  email?: string
  businessName?: string
  ownerName?: string
  serviceExpiration?: string
  amountPaid?: number
  amountPending?: number
  totalPaid?: number
  outstandingAmount?: number
  outstandingNote?: string
  activeSubscriptions?: number
  subscriptionsNote?: string
  paymentDue?: number
  paymentDueNote?: string
  generatedBillInfo?: string | Record<string, any>
  invoices?: Array<{
    id: string
    date: string
    description: string
    amount: number
    status: string
    billUrl?: string
    billingLink?: string
  }>
  isWebinarClient?: boolean
  [key: string]: any
}

function getAuthHeaders(userEmail?: string): Record<string, string> {
  const session = getCustomerSession()
  const username = userEmail || session?.username || session?.email || ''
  const token = session?.accessToken || ''
  const headers: Record<string, string> = {}
  if (username) headers.username = username
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SERVICES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCustomerServicesList(customerId?: string, email?: string): Promise<ServiceDetailsDTO[]> {
  const session = getCustomerSession()
  const custId = customerId || session?.customerId
  const user = email || session?.username || session?.email
  const headers = getAuthHeaders(user)
  const qs = custId ? `?customerId=${encodeURIComponent(custId)}` : ''

  const res = await apiRequest<{ success?: boolean; data?: ServiceDetailsDTO[] }>(
    `/api/auth/customer-services/details${qs}`,
    { headers }
  )
  return Array.isArray(res?.data) ? res.data : []
}

export async function fetchCustomerMeetingDetails(params: {
  customerId: string | number
  serviceType: string
  departmentType: string
  username: string
}): Promise<CustomerMeetingDetailsDTO> {
  const headers = getAuthHeaders(params.username)
  const qs = new URLSearchParams({
    customerId: String(params.customerId),
    serviceType: params.serviceType,
    departmentType: params.departmentType,
  }).toString()

  const res = await apiRequest<{ success?: boolean; data?: CustomerMeetingDetailsDTO }>(
    `/api/auth/customer/meeting-details?${qs}`,
    { headers }
  )
  if (!res?.data) throw new Error('Meeting details not found')
  return res.data
}

export async function fetchCustomerServiceData(customerId: string | number): Promise<CustomerServiceData> {
  const headers = getAuthHeaders()
  const res = await apiRequest<{ success?: boolean; data?: CustomerServiceData }>(
    `/api/auth/${encodeURIComponent(String(customerId))}/service-data`,
    { headers }
  )
  if (!res?.data) throw new Error('Service data not found')
  return res.data
}

export async function saveCustomerServiceData(
  customerId: string | number,
  serviceData: any,
  originalData: any
): Promise<CustomerServiceData> {
  const headers = getAuthHeaders()

  const modifiedCommonInfo: Record<string, { value: string; updatedAt: string }> = {}
  if (serviceData.commonInfo) {
    Object.entries(serviceData.commonInfo).forEach(([key, value]) => {
      if (originalData?.commonInfo?.[key] !== value) {
        modifiedCommonInfo[key] = {
          value: String(value),
          updatedAt: new Date().toISOString(),
        }
      }
    })
  }

  const modifiedDepartmentSpecificInfo: Record<string, Record<string, { value: string; updatedAt: string }>> = {}
  if (serviceData.departmentSpecificInfo) {
    Object.entries(serviceData.departmentSpecificInfo).forEach(([dept, info]: [string, any]) => {
      const modifiedDeptInfo: Record<string, { value: string; updatedAt: string }> = {}
      if (info && typeof info === 'object') {
        Object.entries(info).forEach(([key, value]) => {
          if (originalData?.departmentSpecificInfo?.[dept]?.[key] !== value) {
            modifiedDeptInfo[key] = {
              value: String(value),
              updatedAt: new Date().toISOString(),
            }
          }
        })
      }
      if (Object.keys(modifiedDeptInfo).length > 0) {
        modifiedDepartmentSpecificInfo[dept] = modifiedDeptInfo
      }
    })
  }

  const requestBody = {
    commonInfo: modifiedCommonInfo,
    departmentSpecificInfo: modifiedDepartmentSpecificInfo,
  }

  const res = await apiRequest<{ success?: boolean; data?: CustomerServiceData }>(
    `/api/auth/${encodeURIComponent(String(customerId))}/manage/service-data`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(requestBody),
    }
  )
  return res.data as CustomerServiceData
}

export async function uploadCustomerServiceFile(
  customerId: string | number,
  file: File,
  dataName: string
): Promise<{ fileUrl: string }> {
  const session = getCustomerSession()
  const username = session?.username || session?.email || ''
  const token = session?.accessToken

  const formData = new FormData()
  formData.append('customerId', String(customerId))
  formData.append('file', file)
  formData.append('dataName', dataName)
  formData.append('username', username)

  const headers: Record<string, string> = {}
  if (username) headers.username = username
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await apiRequest<{ success?: boolean; data?: { fileUrl: string } }>(
    `/api/auth/upload-service-file`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  )
  return res.data || { fileUrl: '' }
}

export async function updateCustomerServiceStatus(
  customerId: string | number,
  updatedStatus: string,
  departmentType: string
): Promise<boolean> {
  const headers = getAuthHeaders()
  await apiRequest(`/api/auth/customer/update/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      customerId,
      updatedStatus,
      departmentType,
    }),
  })
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BILLING & INVOICES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCustomerBillingDetails(contact: string): Promise<CustomerBillingDetails> {
  const headers = getAuthHeaders()
  const res = await apiRequest<{ success?: boolean; data?: CustomerBillingDetails }>(
    `/api/common/customerDetails?contact=${encodeURIComponent(contact)}`,
    { headers }
  )
  return res?.data || {}
}

export async function saveCustomerBillingDetails(payload: Record<string, any>): Promise<boolean> {
  const headers = getAuthHeaders()
  await apiRequest(`/api/common/customerDetails/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  })
  return true
}

export async function uploadBillingScreenshot(file: File): Promise<{ url: string; fileUrl?: string }> {
  const session = getCustomerSession()
  const formData = new FormData()
  formData.append('file', file)

  const headers: Record<string, string> = {}
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`

  const res = await apiRequest<{ success?: boolean; data?: { url?: string; fileUrl?: string } }>(
    `/api/files/upload?folder=payment_ss`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  )
  const data = res?.data
  return {
    url: data?.url || data?.fileUrl || '',
    fileUrl: data?.fileUrl || data?.url || '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AI SERVICES
// ─────────────────────────────────────────────────────────────────────────────

export async function generateOffersAi(payload: {
  businessName: string
  category: string
  month: string
  campaignTheme?: string
}): Promise<string[]> {
  const headers = getAuthHeaders()
  try {
    const res = await apiRequest<{ success?: boolean; data?: string[] | { offers: string[] } }>(
      `/api/ai/generate-offer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
      }
    )
    if (Array.isArray(res?.data)) return res.data
    if (res?.data && typeof res.data === 'object' && 'offers' in res.data && Array.isArray(res.data.offers)) {
      return res.data.offers
    }
  } catch (err) {
    console.warn('AI Offer generate request fallback:', err)
  }

  // Graceful fallback offers
  const { businessName, category, month } = payload
  return [
    `🔥 This ${month} only! Get an exclusive 25% discount on all ${category} services with ${businessName}. DM us 'SPECIAL25' to claim now!`,
    `✨ Thinking of upgrading your ${category} this ${month}? Book with ${businessName} before Sunday and receive a free consultation worth ₹2,999!`,
    `🎁 Festival & seasonal celebration offer: Get 1 extra month free when you enroll in our signature ${businessName} ${category} package today!`,
    `🚀 Grow faster with ${businessName}! The first 10 businesses to DM 'GROWTH' get guaranteed priority onboarding & ₹1,500 off.`,
    `💡 Struggling with your ${category}? Let ${businessName} handle it for you. Reply 'READY' to get a customized roadmap today!`,
    `⭐ VIP Customer appreciation week: Grab our premium ${category} package with zero setup fees. Valid only in ${month}!`,
    `💥 Flash Sale: 20% cashback on your renewal or upgrade with ${businessName}. Limited slots available.`,
    `🏆 Don't wait for your competitors to get ahead. Partner with ${businessName} this ${month} and unlock 3 bonus marketing creatives!`,
    `🎯 Double the value: Book any 2 services this month and get complimentary SEO audit + WhatsApp marketing setup for free.`,
    `📩 Special invitation: Reply 'OFFER' right now to unlock your personalized ${businessName} secret coupon code!`
  ]
}

export async function generateMetaAdsScriptAi(payload: {
  businessName: string
  businessCategory: string
  language: string
  mainProblem: string
  keyOffer: string
}): Promise<{
  hook: string
  problem: string
  solution: string
  cta: string
  fullScript: string
}> {
  const headers = getAuthHeaders()
  try {
    const res = await apiRequest<{
      success?: boolean
      data?: {
        hook?: string
        problem?: string
        solution?: string
        cta?: string
        fullScript?: string
      }
    }>(`/api/ai/meta-ads-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    })
    if (res?.data?.fullScript || res?.data?.hook) {
      return {
        hook: res.data.hook || '',
        problem: res.data.problem || '',
        solution: res.data.solution || '',
        cta: res.data.cta || '',
        fullScript: res.data.fullScript || '',
      }
    }
  } catch (err) {
    console.warn('AI Meta ads script fallback:', err)
  }

  const { businessName, businessCategory, language, mainProblem, keyOffer } = payload
  const isHindi = language.toLowerCase().includes('hindi')
  const isHinglish = language.toLowerCase().includes('hinglish')

  if (isHindi) {
    const hook = `क्या आप भी ${mainProblem} से परेशान हैं और अपने ${businessCategory} को आगे नहीं बढ़ा पा रहे?`
    const problem = `ज़्यादातर लोग गलत स्ट्रेटेजी और पुराने तरीकों में अपना वक्त और पैसा गंवा देते हैं।`
    const solution = `यहीं काम आता है ${businessName}। हमारी प्रूवन तकनीक से आपके बिज़नेस को मिलता है असली रिज़ल्ट।`
    const cta = `आज ही ${keyOffer} का लाभ उठाएं। नीचे दिए गए लिंक पर क्लिक करें और तुरंत शुरू करें!`
    return {
      hook,
      problem,
      solution,
      cta,
      fullScript: `${hook}\n\n${problem}\n\n${solution}\n\n${cta}`,
    }
  }

  if (isHinglish) {
    const hook = `Agar aap bhi ${mainProblem} se frustrated ho, toh next 30 seconds dhyan se suniye!`
    const problem = `Market me competition badh raha hai aur traditional methods ab pehle jaise work nahi karte.`
    const solution = `${businessName} ke saath aapko milta hai smart, proven aur high-converting system.`
    const cta = `Abhi click kijiye aur grab kijiye humara limited time offer: ${keyOffer}! Link bio aur neeche description me hai.`
    return {
      hook,
      problem,
      solution,
      cta,
      fullScript: `${hook}\n\n${problem}\n\n${solution}\n\n${cta}`,
    }
  }

  const hook = `Stop losing customers to ${mainProblem}! Watch this if you want to scale your ${businessCategory}.`
  const problem = `Running a business is tough, and relying on outdated marketing burns cash without delivering qualified leads.`
  const solution = `That's exactly why ${businessName} exists. We give you a done-for-you growth engine that converts visitors into paying customers.`
  const cta = `Claim your exclusive offer today: ${keyOffer}. Click the button below to secure your spot now!`

  return {
    hook,
    problem,
    solution,
    cta,
    fullScript: `${hook}\n\n${problem}\n\n${solution}\n\n${cta}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. HELP CENTER (CUSTOMER SUPPORT & NGROK INTEGRATION)
// ─────────────────────────────────────────────────────────────────────────────

const HELP_CENTER_ACCESS_KEY = 'help_center_access_token'
const HELP_CENTER_REFRESH_KEY = 'help_center_refresh_token'

export function getHelpCenterToken(email?: string): string | null {
  const k = email ? `${HELP_CENTER_ACCESS_KEY}_${btoa(email)}` : HELP_CENTER_ACCESS_KEY
  return localStorage.getItem(k) || localStorage.getItem(HELP_CENTER_ACCESS_KEY)
}

export function getHelpCenterRefreshToken(email?: string): string | null {
  const k = email ? `${HELP_CENTER_REFRESH_KEY}_${btoa(email)}` : HELP_CENTER_REFRESH_KEY
  return localStorage.getItem(k) || localStorage.getItem(HELP_CENTER_REFRESH_KEY)
}

export function setHelpCenterTokens(accessToken: string, refreshToken?: string, email?: string) {
  const ak = email ? `${HELP_CENTER_ACCESS_KEY}_${btoa(email)}` : HELP_CENTER_ACCESS_KEY
  const rk = email ? `${HELP_CENTER_REFRESH_KEY}_${btoa(email)}` : HELP_CENTER_REFRESH_KEY
  localStorage.setItem(ak, accessToken)
  localStorage.setItem(HELP_CENTER_ACCESS_KEY, accessToken)
  if (refreshToken) {
    localStorage.setItem(rk, refreshToken)
    localStorage.setItem(HELP_CENTER_REFRESH_KEY, refreshToken)
  }
}

export function clearHelpCenterTokens(email?: string) {
  if (email) {
    localStorage.removeItem(`${HELP_CENTER_ACCESS_KEY}_${btoa(email)}`)
    localStorage.removeItem(`${HELP_CENTER_REFRESH_KEY}_${btoa(email)}`)
  }
  localStorage.removeItem(HELP_CENTER_ACCESS_KEY)
  localStorage.removeItem(HELP_CENTER_REFRESH_KEY)
}

export const HELP_CENTER_OAUTH_KEY = 'mbgcard-helpcenter-oauth-secret-key-2026'

async function requestHelpCenter<T>(
  path: string,
  options: RequestInit = {},
  email?: string
): Promise<T> {
  let token = getHelpCenterToken(email)
  let refreshToken = getHelpCenterRefreshToken(email)

  // Auto-connect if token is missing and an email is present (skip for auth calls to prevent recursion)
  if (!token && email && !path.includes('/auth/')) {
    try {
      token = await connectCustomerHelpCenter({ email })
      refreshToken = getHelpCenterRefreshToken(email)
    } catch {
      // proceed with OAuth key fallback
    }
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const envUrl = (
    import.meta.env.VITE_HELP_CENTER_URL ||
    import.meta.env.HELP_CENTER_URL ||
    ''
  ).trim().replace(/\/$/, '')

  // Candidate 1: Local Vite dev proxy (/help-center)
  // Calling same-origin (/help-center/...) prevents browser CORS preflight (OPTIONS)
  // and Vite forwards it directly to the ngrok tunnel.
  if (typeof window !== 'undefined') {
    try {
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
      const localHeaders: Record<string, string> = {
        'ngrok-skip-browser-warning': '1',
        'X-OAuth-Key': HELP_CENTER_OAUTH_KEY,
        Accept: 'application/json',
        ...(options.headers as Record<string, string> || {}),
      }
      if (token) localHeaders['Authorization'] = `Bearer ${token}`
      if (refreshToken) localHeaders['X-Refresh-Token'] = refreshToken
      if (email) localHeaders['username'] = email

      const localRes = await fetch(`/help-center${cleanPath}`, {
        ...options,
        headers: {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...localHeaders,
        },
      })
      if (localRes.ok) {
        const text = await localRes.text()
        try {
          return JSON.parse(text) as T
        } catch {
          return text as unknown as T
        }
      }
    } catch {
      // Local proxy failed or not in dev server mode, proceed to fallback candidates
    }
  }

  // Candidate 2: CRM backend proxy (/api/help-center/...)
  // SMSB HelpCenterController routes requests directly through HelpCenterProxyService.
  // IMPORTANT: For SMSB, the Help Center token MUST be sent as `X-Help-Center-Token`!
  // `Authorization` is reserved ONLY for the CRM user's login session token.
  try {
    const session = getSession()
    const crmHeaders: Record<string, string> = {
      'ngrok-skip-browser-warning': '1',
      'X-OAuth-Key': HELP_CENTER_OAUTH_KEY,
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    if (token) {
      crmHeaders['X-Help-Center-Token'] = `Bearer ${token}`
    }
    if (refreshToken) {
      crmHeaders['X-Help-Center-Refresh-Token'] = `Bearer ${refreshToken}`
    }
    if (session?.token) {
      crmHeaders['Authorization'] = `Bearer ${session.token}`
      crmHeaders['username'] = session.user?.email || session.user?.username || email || ''
    } else {
      delete crmHeaders['Authorization']
      delete crmHeaders['username']
    }

    const crmRes = await apiRequest<T>(`/api/help-center${cleanPath}`, {
      ...options,
      headers: crmHeaders,
    })
    if (crmRes !== undefined && crmRes !== null) return crmRes
  } catch (err: any) {
    if (err?.status && err?.status !== 404 && err?.status !== 502 && err?.status !== 503) {
      throw err
    }
  }

  // Candidate 3: Direct external / ngrok URL if configured
  if (envUrl) {
    const directHeaders: Record<string, string> = {
      'ngrok-skip-browser-warning': '1',
      'X-OAuth-Key': HELP_CENTER_OAUTH_KEY,
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    if (token) directHeaders['Authorization'] = `Bearer ${token}`
    if (refreshToken) directHeaders['X-Refresh-Token'] = refreshToken
    if (email) directHeaders['username'] = email

    const directTargets = [`${envUrl}/api/v1${cleanPath}`, `${envUrl}/api${cleanPath}`, `${envUrl}${cleanPath}`]
    for (const target of directTargets) {
      try {
        const res = await apiRequest<T>(target, {
          ...options,
          headers: directHeaders,
        })
        if (res !== undefined && res !== null) return res
      } catch (err: any) {
        if (err?.status && err?.status !== 404 && err?.status !== 502 && err?.status !== 503) {
          throw err
        }
      }
    }
  }

  throw new Error(`Failed to reach Help Center at ${path}`)
}

export interface CustomerTicketItem {
  id?: string | number
  ticketNumber: string
  subject: string
  description?: string
  status: string
  priority: string
  departmentName?: string
  department?: { id?: string | number; name?: string }
  userDto?: { name?: string; email?: string }
  assignedTo?: string
  createdAt?: string
  updatedAt?: string
  resolvedAt?: string
  latestRemark?: string
  messages?: Array<{
    id?: string | number
    sender: string
    senderRole?: string
    message: string
    timestamp: string
  }>
}

export interface CustomerTicketPage {
  tickets?: Record<string, string> | Array<{ ticketNumber: string; subject: string }>
  departments?: Record<string, string>
  content?: CustomerTicketItem[]
  currentPage: number
  pageSize: number
  totalRecords: number
  totalPages: number
}

export interface HelpCenterStatusSummary {
  totalCount: number
  statusCounts: {
    OPEN?: number
    IN_PROGRESS?: number
    WAITING_ON_CUSTOMER?: number
    RESOLVED?: number
    CLOSED?: number
    ESCALATED?: number
    [key: string]: number | undefined
  }
  monthlyLimit?: number
  monthlyUsed?: number
  monthlyRemaining?: number
}

export interface TicketHistoryEntry {
  id: number | string
  ticketNumber: string
  status: string
  previousStatus?: string
  remark?: string
  updatedBy?: string
  assignedTo?: string
  updatedAt: string
  resolvedAt?: string
}

export interface HelpCenterDepartment {
  id: string | number
  name: string
}

export const HELP_CENTER_STATIC_PASSWORD = 'MBG@12345'

export async function connectCustomerHelpCenter(customer: {
  email: string
  name?: string
  phone?: string
}): Promise<string> {
  const email = customer.email
  const existing = getHelpCenterToken(email)
  if (existing) return existing

  const password = HELP_CENTER_STATIC_PASSWORD

  // Step 1: Try login with email and static password
  try {
    const loginRes = await requestHelpCenter<{ success?: boolean; data?: { accessToken?: string; refreshToken?: string } }>(
      `/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      email
    )
    const token = loginRes?.data?.accessToken || (loginRes as any)?.accessToken
    const refresh = loginRes?.data?.refreshToken || (loginRes as any)?.refreshToken
    if (token) {
      setHelpCenterTokens(token, refresh, email)
      return token
    }
  } catch {
    // If login fails, attempt register
  }

  // Step 2: Try register if login failed (new user)
  try {
    const cleanPhone = (customer.phone || '9999999999').replace(/[^0-9]/g, '').slice(-10).padStart(10, '9')
    await requestHelpCenter(
      `/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customer.name || email.split('@')[0],
          email,
          password,
          phone: cleanPhone,
        }),
      },
      email
    )
  } catch {
    // Register might fail if already exists (400) - that's okay, proceed to retry login
  }

  // Step 3: Retry login after register attempt
  try {
    const retryRes = await requestHelpCenter<{ success?: boolean; data?: { accessToken?: string; refreshToken?: string } }>(
      `/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      email
    )
    const token = retryRes?.data?.accessToken || (retryRes as any)?.accessToken
    const refresh = retryRes?.data?.refreshToken || (retryRes as any)?.refreshToken
    if (token) {
      setHelpCenterTokens(token, refresh, email)
      return token
    }
  } catch (e) {
    console.warn('Final login attempt to help center caught error:', e)
  }

  return ''
}

export async function fetchCustomerStatusSummary(email: string): Promise<HelpCenterStatusSummary | null> {
  // Try underscore endpoint first (/tickets/status_summary) which matches Help Center's TicketController @GetMapping
  try {
    const res = await requestHelpCenter<{ success?: boolean; data?: HelpCenterStatusSummary }>(
      `/tickets/status_summary?email=${encodeURIComponent(email)}`,
      {},
      email
    )
    const data = res?.data || (res as any)
    if (data && typeof data === 'object' && ('totalCount' in data || 'statusCounts' in data)) {
      return data as HelpCenterStatusSummary
    }
  } catch (err) {
    // Fallback: hyphenated variant (/tickets/status-summary) in case routed via SMSB proxy
    try {
      const res = await requestHelpCenter<{ success?: boolean; data?: HelpCenterStatusSummary }>(
        `/tickets/status-summary?email=${encodeURIComponent(email)}`,
        {},
        email
      )
      const data = res?.data || (res as any)
      if (data && typeof data === 'object' && ('totalCount' in data || 'statusCounts' in data)) {
        return data as HelpCenterStatusSummary
      }
    } catch {
      console.warn('Failed to fetch status summary:', err)
    }
  }
  return null
}

export async function fetchCustomerTicketsPage(params: {
  email: string
  page: number
  size: number
  status?: string
  priority?: string
  search?: string
}): Promise<CustomerTicketPage> {
  const qs = new URLSearchParams({
    email: params.email,
    page: String(params.page),
    size: String(params.size),
  })
  if (params.status) qs.append('status', params.status)
  if (params.priority) qs.append('priority', params.priority)
  if (params.search) qs.append('search', params.search)

  try {
    const res = await requestHelpCenter<{ success?: boolean; data?: CustomerTicketPage }>(
      `/tickets/fetch_tnas?${qs.toString()}`,
      {},
      params.email
    )
    const data = res?.data || (res as any)
    if (data && typeof data === 'object') {
      return data as CustomerTicketPage
    }
  } catch (err) {
    console.warn('fetch_tnas failed, trying alternative:', err)
  }

  // Fallback to fetch-tnas or department_users/fetch_tickets_assigned_to_employee
  try {
    const res = await requestHelpCenter<{ success?: boolean; data?: any }>(
      `/tickets/fetch-tnas?${qs.toString()}`,
      {},
      params.email
    )
    const data = res?.data || (res as any)
    if (data && typeof data === 'object') {
      return data as CustomerTicketPage
    }
  } catch {
    // fallback
  }

  return {
    tickets: {},
    departments: {},
    currentPage: 0,
    pageSize: params.size,
    totalRecords: 0,
    totalPages: 0,
  }
}

export async function fetchCustomerTicketDetails(
  ticketNumber: string,
  email?: string
): Promise<CustomerTicketItem | null> {
  try {
    const res = await requestHelpCenter<{ success?: boolean; data?: CustomerTicketItem }>(
      `/tickets/fetchTicket?ticketNumber=${encodeURIComponent(ticketNumber)}`,
      {},
      email
    )
    return res?.data || (res as any) || null
  } catch {
    return null
  }
}

export async function createCustomerTicket(payload: {
  email?: string
  subject: string
  description?: string
  message?: string
  departmentId?: string | number
  departmentName?: string
  priority?: string
  phone?: string
  phoneNumber?: string
}): Promise<{ ticketNumber: string; success: boolean }> {
  const phoneVal = (payload.phoneNumber || payload.phone || '').trim()
  const emailVal = (payload.email || '').trim()

  const body: Record<string, any> = {
    subject: payload.subject,
    description: payload.description || payload.message || '',
    message: payload.message || payload.description || '',
    departmentId: String(payload.departmentId || '1'),
    departmentName: payload.departmentName || '',
    priority: (payload.priority || 'MEDIUM').toUpperCase(),
    category: 1,
  }
  if (emailVal) body.email = emailVal
  if (phoneVal) {
    body.phoneNumber = phoneVal
    body.phone = phoneVal
  }

  const res = await requestHelpCenter<{ success?: boolean; data?: { ticketNumber: string } | string; message?: string }>(
    `/tickets/create_ticket`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    emailVal
  )

  const data = res?.data || (res as any)
  const ticketNumber = typeof data === 'string'
    ? data
    : (data?.ticketNumber || 'TICKET' + Date.now())
  return {
    ticketNumber,
    success: true,
  }
}

export async function fetchHelpCenterDepartmentsList(): Promise<HelpCenterDepartment[]> {
  try {
    const res = await requestHelpCenter<{ success?: boolean; data?: any[] }>(
      `/departments`
    )
    const list = res?.data || (res as any)
    if (Array.isArray(list)) {
      return list.map((d) => ({
        id: d.id ?? d.departmentId ?? d.name,
        name: d.name ?? d.departmentName ?? String(d),
      }))
    }
  } catch {
    // fallback
  }

  try {
    const res = await requestHelpCenter<{ success?: boolean; data?: any[] }>(
      `/departments/fetch_departments`
    )
    const list = res?.data || (res as any)
    if (Array.isArray(list)) {
      return list.map((d) => ({
        id: d.id ?? d.departmentId ?? d.name,
        name: d.name ?? d.departmentName ?? String(d),
      }))
    }
  } catch {
    // fallback
  }

  return [
    { id: '1', name: 'Google Department' },
    { id: '2', name: 'Advertisement & Social' },
    { id: '3', name: 'Automation Department' },
    { id: '4', name: 'Website Development' },
    { id: '5', name: 'Billing & Invoices' },
    { id: '6', name: 'General Support' },
  ]
}

export async function fetchCustomerTicketHistory(
  ticketNumber: string,
  page = 0,
  size = 20
): Promise<TicketHistoryEntry[]> {
  try {
    const res = await requestHelpCenter<{
      success?: boolean
      data?: { entries: TicketHistoryEntry[] } | TicketHistoryEntry[]
    }>(
      `/department_users/ticket_history?ticketNumber=${encodeURIComponent(ticketNumber)}&page=${page}&size=${size}`
    )
    const data = res?.data || (res as any)
    if (Array.isArray(data?.entries)) return data.entries
    if (Array.isArray(data)) return data
  } catch {
    // fallback
  }

  try {
    const res = await requestHelpCenter<{ success?: boolean; data?: any[] }>(
      `/tickets/${encodeURIComponent(ticketNumber)}/status-history`
    )
    const list = res?.data || (res as any)
    if (Array.isArray(list)) {
      return list.map((item) => ({
        id: item.id || Math.random(),
        ticketNumber,
        status: item.newStatus || item.status || 'UPDATED',
        previousStatus: item.oldStatus || item.previousStatus,
        remark: item.newStatusDescription || item.remark || '',
        updatedBy: item.updatedBy || item.userId || 'System',
        assignedTo: item.assignedTo || item.employeeEmail || '',
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      }))
    }
  } catch {
    // fallback
  }

  return []
}


