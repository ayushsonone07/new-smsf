import { apiRequest } from '../../../api/client'
import { getCustomerSession } from '../../../features/customers/hooks/useCustomerSession'
import type {
  CreateTicketInput,
  CustomerDashboardData,
  CustomerServiceItem,
  SupportTicket,
} from '../types/customer-dashboard.types'

interface ApiEnvelope<T> {
  success?: boolean
  status?: string
  message?: string
  data: T
}

interface AssignedUser {
  username?: string | null
  phoneNumber?: string | null
}

interface ApiService {
  serviceType?: string
  status?: string
  expirationDate?: string | null
  department?: string
  isServiceActive?: boolean
  assignedTo?: AssignedUser[]
}

interface ApiCustomer {
  plan?: string | { name?: string; planName?: string; title?: string } | null
  packageName?: string | null
  planNames?: string[] | null
  planIds?: string[]
  businessName?: string | null
  ownerName?: string | null
  email?: string | null
  phone?: string | null
  serviceExpiration?: string | null
  amountPaid?: string | number | null
  amountPending?: string | number | null
  generatedBillInfo?: string | Record<string, unknown> | null
}

interface ApiNotification {
  id?: string | number
  type?: string
  message?: string
  title?: string
  category?: string
  timestamp?: string | number[]
}

function unwrap<T>(response: ApiEnvelope<T>, fallbackMessage: string): T {
  if (response.success === false || response.status === 'ERROR') {
    throw new Error(response.message || fallbackMessage)
  }
  if (response.data === undefined || response.data === null) {
    throw new Error(response.message || fallbackMessage)
  }
  return response.data
}

function toDisplayStatus(status?: string): CustomerServiceItem['status'] {
  const normalized = status?.trim().toUpperCase()
  if (normalized === 'COMPLETED' || normalized === 'COMPLETE' || normalized === 'DONE') {
    return 'Completed'
  }
  if (normalized === 'IN_PROGRESS' || normalized === 'IN PROGRESS' || normalized === 'ACTIVE') {
    return 'In progress'
  }
  return 'Pending'
}

function toPlanName(plan: ApiCustomer['plan']): string {
  if (typeof plan === 'string' && plan.trim()) return plan
  if (plan && typeof plan === 'object') {
    return plan.planName || plan.name || plan.title || 'Service plan'
  }
  return 'Service plan'
}

function toExpirationText(date?: string | null): string {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return `Expires ${parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`
}

function getBillUrl(value: ApiCustomer['generatedBillInfo']): string | undefined {
  if (!value) return undefined
  if (typeof value === 'object') {
    const url = value.generatedBillInfo || value.billingLink || value.billUrl
    return typeof url === 'string' && url.trim() ? url.trim() : undefined
  }

  const raw = value.trim()
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const url = parsed.generatedBillInfo || parsed.billingLink || parsed.billUrl
    return typeof url === 'string' && url.trim() ? url.trim() : undefined
  } catch {
    return raw
  }
}

function getBillDetails(value: ApiCustomer['generatedBillInfo']) {
  let info: Record<string, unknown> = {}
  if (value && typeof value === 'object') info = value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object') info = parsed as Record<string, unknown>
    } catch {
      // A plain URL has no additional invoice metadata.
    }
  }
  const text = (...keys: string[]) => {
    for (const key of keys) {
      const candidate = info[key]
      if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
        return String(candidate)
      }
    }
    return undefined
  }
  return {
    invoiceNo: text('invoiceNo', 'invoiceNumber', 'billId') || 'Your invoice',
    date: text('invoiceDate', 'date', 'generatedAt'),
    amount: text('invoiceAmount', 'amount'),
    status: text('status', 'billStatus') || 'GENERATED',
  }
}

function toNotificationTimestamp(timestamp?: string | number[]): string | undefined {
  if (!timestamp) return undefined
  const date = Array.isArray(timestamp)
    ? new Date(
        timestamp[0],
        (timestamp[1] ?? 1) - 1,
        timestamp[2] ?? 1,
        timestamp[3] ?? 0,
        timestamp[4] ?? 0,
        timestamp[5] ?? 0,
      )
    : new Date(timestamp)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function mapService(service: ApiService, index: number): CustomerServiceItem {
  const status = toDisplayStatus(service.status)
  const categoryName = service.serviceType || service.department || 'Service'
  const department = `${service.department || ''} ${categoryName}`.toUpperCase()
  const dotColor = department.includes('GOOGLE') ? 'green' : 'blue'

  return {
    id: `${service.department || categoryName}-${index}`,
    categoryName,
    dotColor,
    status,
    tasks: [],
  }
}

function mapNotification(
  notification: ApiNotification,
  index: number,
): CustomerDashboardData['updates'][number] {
  const title = notification.title || notification.message || 'Account update'
  const type = notification.type || notification.category || 'Notification'
  const normalizedType = type.toUpperCase()
  const iconType = normalizedType.includes('APPROV') || normalizedType.includes('COMPLET')
    ? 'check'
    : normalizedType.includes('PROGRESS')
      ? 'pulse'
      : 'help'

  return {
    id: String(notification.id ?? `notification-${index}`),
    title,
    category: [type, toNotificationTimestamp(notification.timestamp)]
      .filter(Boolean)
      .join(' · '),
    timestamp: toNotificationTimestamp(notification.timestamp),
    iconType,
  }
}

export async function fetchCustomerDashboardData(): Promise<CustomerDashboardData> {
  const session = getCustomerSession()
  if (!session) {
    throw new Error('Your customer session has expired. Please sign in again.')
  }
  if (!session.customerId || !session.email || !session.username) {
    throw new Error('Customer ID, email, and login username are required to load dashboard data.')
  }

  const customerId = encodeURIComponent(session.customerId)
  const contact = encodeURIComponent(session.email)
  const requestOptions: RequestInit = {
    headers: {
      username: session.username,
      ...(session.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    },
  }
  const [serviceResponse, customerResponse, notificationResponse] = await Promise.all([
    apiRequest<ApiEnvelope<ApiService[]>>(
      `/api/auth/customer-services/details?customerId=${customerId}`,
      requestOptions,
    ),
    apiRequest<ApiEnvelope<ApiCustomer>>(
      `/api/common/customerDetails?contact=${contact}`,
      requestOptions,
    ),
    apiRequest<ApiEnvelope<ApiNotification[]>>(
      `/api/notifications/customer?customerId=${customerId}`,
      requestOptions,
    ),
  ])

  const services = unwrap(serviceResponse, 'Could not load your services.')
  const customer = unwrap(customerResponse, 'Could not load your customer profile.')
  const notifications = unwrap(notificationResponse, 'Could not load your notifications.')
  const onboardingService = services.find((service) =>
    `${service.department || ''} ${service.serviceType || ''}`
      .toUpperCase()
      .includes('ONBOARDING'),
  )
  const assignedExecutive = onboardingService?.assignedTo?.[0]
  const clientName = customer.ownerName || session.name || customer.businessName || 'Customer'
  const companyName = customer.businessName || session.company || clientName
  const profileStatus = toDisplayStatus(onboardingService?.status)
  const executiveName = assignedExecutive?.username || 'Not assigned'

  return {
    billUrl: getBillUrl(customer.generatedBillInfo),
    bill: getBillDetails(customer.generatedBillInfo),
    profile: {
      id: session.customerId,
      clientName,
      companyName,
      status: profileStatus === 'Completed'
        ? 'Completed'
        : profileStatus === 'In progress'
          ? 'Active'
          : 'Pending',
      packageName: toPlanName(
        customer.packageName ||
          customer.plan ||
          (customer.planNames && customer.planNames.length > 0 ? customer.planNames.join(', ') : undefined)
      ),
      packageDuration: toExpirationText(customer.serviceExpiration),
      amountPaid: customer.amountPaid ?? undefined,
      amountPending: customer.amountPending ?? undefined,
      executive: {
        name: executiveName,
        roleTitle: 'Your onboarding executive',
        initial: executiveName.charAt(0).toUpperCase() || '—',
        phone: assignedExecutive?.phoneNumber || undefined,
        whatsapp: assignedExecutive?.phoneNumber || undefined,
      },
    },
    meeting: undefined,
    services: services.map(mapService),
    updates: notifications.map(mapNotification),
    tickets: [],
  }
}

export async function submitCustomerTicket(
  input: CreateTicketInput,
): Promise<SupportTicket> {
  void input
  throw new Error('Support ticket submission is not available yet.')
}
