import { authedApiRequest } from './client'

/**
 * Recurring department (payments follow-up) — `/api/recurring/*`.
 * Backend: RecurringController / RecurringService. Data is kept per Support service row
 * under special_service_data.RECURRING_DEPARTMENT, so every call needs customerId + serviceType.
 */

export type RecurringStage =
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'UPCOMING'
  | 'NO_DUE_DATE'
  | 'PAID'
  | 'WRITTEN_OFF'

export const RECURRING_STAGES: RecurringStage[] = [
  'OVERDUE',
  'DUE_TODAY',
  'UPCOMING',
  'NO_DUE_DATE',
  'PAID',
  'WRITTEN_OFF',
]

export const BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME'] as const
export const PAYMENT_MODES = ['UPI', 'CARD', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'] as const

export interface RecurringDue {
  customerId: number
  businessName: string | null
  ownerName: string | null
  phoneNumber: string | null
  email: string | null
  serviceType: string
  serviceStatus: string | null
  isServiceActive: boolean | null
  assignedUserName: string | null
  assignedUserEmail: string | null
  totalAmount: number | null
  amountPaid: number
  amountPending: number | null
  /** false = amounts still come from the customer record (nothing saved in Recurring yet) */
  amountsFromRecurring: boolean
  dueDate: string | null
  renewalDate: string | null
  stage: RecurringStage
  overdueDays: number
  partiallyPaid: boolean
  billingCycle: string | null
  nextFollowUpDate: string | null
  promiseToPayDate: string | null
  promiseAmount: number | null
  nonPaymentReason: string | null
  lastPaymentAt: string | null
  lastPaymentAmount: number | null
}

export interface RecurringSummary {
  totalAccounts: number
  totalPending: number
  overdueAmount: number
  overdueCount: number
  dueTodayCount: number
  dueNext7DaysAmount: number
  collectedThisMonth: number
  renewalsNext7Days: number
  followUpsDue: number
  overdueAging: Record<'0-30' | '31-60' | '60+', number>
  stageCounts: Record<RecurringStage, number>
  byAssignee: { name: string; accounts: number; pending: number; overdue: number }[]
}

export interface RecurringPayment {
  id: string
  amount: number
  paidAt: string
  mode: string
  reference?: string
  note?: string
  recordedBy?: string
  recordedAt?: string
}

export interface RecurringActivity {
  at: string
  by: string
  type: 'UPDATE' | 'NOTE' | 'PAYMENT'
  changes?: Record<string, unknown>
  note?: string
}

export interface RecurringDetail {
  due: RecurringDue
  payments: RecurringPayment[]
  activity: RecurringActivity[]
}

/** null = leave unchanged, '' = clear. Dates yyyy-MM-dd, amounts plain numbers. */
export interface RecurringUpdatePayload {
  totalAmount?: string | null
  dueDate?: string | null
  billingCycle?: string | null
  nextFollowUpDate?: string | null
  promiseToPayDate?: string | null
  promiseAmount?: string | null
  nonPaymentReason?: string | null
  writtenOff?: boolean | null
  note?: string | null
}

export interface RecurringPaymentPayload {
  amount: string
  paidAt?: string
  mode: string
  reference?: string
  note?: string
}

interface ApiEnvelope<T> {
  data?: T
  message?: string
  success?: boolean
}

interface PageEnvelope<T> {
  data?: T[]
  totalElements?: number
  totalPages?: number
  pageNumber?: number
}

export interface RecurringDuesParams {
  page: number
  size: number
  stage?: RecurringStage | ''
  searchParam?: string
  followUpDue?: boolean
}

function accountPath(customerId: number, serviceType: string) {
  return `/api/recurring/customers/${customerId}/services/${encodeURIComponent(serviceType)}`
}

function requireData<T>(response: ApiEnvelope<T>, what: string): T {
  if (response?.data === undefined || response.data === null) {
    throw new Error(response?.message || `${what} returned no data`)
  }
  return response.data
}

export async function getRecurringDues(
  params: RecurringDuesParams,
): Promise<{ items: RecurringDue[]; total: number }> {
  const search = new URLSearchParams({ page: String(params.page), size: String(params.size) })
  if (params.stage) search.set('stage', params.stage)
  if (params.searchParam?.trim()) search.set('searchParam', params.searchParam.trim())
  if (params.followUpDue) search.set('followUpDue', 'true')
  const response = await authedApiRequest<PageEnvelope<RecurringDue>>(`/api/recurring/dues?${search.toString()}`)
  return { items: response?.data ?? [], total: response?.totalElements ?? 0 }
}

export async function getRecurringSummary(): Promise<RecurringSummary> {
  const response = await authedApiRequest<ApiEnvelope<RecurringSummary>>('/api/recurring/summary')
  return requireData(response, 'Recurring summary')
}

export async function getRecurringDetail(customerId: number, serviceType: string): Promise<RecurringDetail> {
  const response = await authedApiRequest<ApiEnvelope<RecurringDetail>>(accountPath(customerId, serviceType))
  return requireData(response, 'Recurring account')
}

export async function updateRecurringDue(
  customerId: number,
  serviceType: string,
  payload: RecurringUpdatePayload,
): Promise<RecurringDue> {
  const response = await authedApiRequest<ApiEnvelope<RecurringDue>>(accountPath(customerId, serviceType), {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return requireData(response, 'Recurring update')
}

export async function recordRecurringPayment(
  customerId: number,
  serviceType: string,
  payload: RecurringPaymentPayload,
): Promise<RecurringDue> {
  const response = await authedApiRequest<ApiEnvelope<RecurringDue>>(`${accountPath(customerId, serviceType)}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return requireData(response, 'Recurring payment')
}
