import { authedApiRequest } from './client'
import {
  getCurrentPhoneNumber,
  updateSessionPhoneNumber,
} from '../app/auth/session'
import { fetchCurrentUserProfileMeta } from './department-users.api'

const AIRTEL_API_BASE = '/api/v1/airtel'

export interface AirtelClickToCallResponse {
  status?: string
  message?: string
  data?: unknown
  success?: boolean
}

export interface AirtelCallsQuery {
  search?: string
  status?: string
  callType?: string
  fromDate?: string
  toDate?: string
  page?: number
  size?: number
  sortBy?: string
  sortDir?: string
  /** DEPARTMENT or TICKET — where the call was started */
  contextType?: CallContextType
  ticketNumber?: string
  customerId?: number | string
}

export type CallContextType = 'DEPARTMENT' | 'TICKET'

/** Where the agent is calling from — decides which tab the recording shows up in. */
export interface CallContext {
  contextType: CallContextType
  /** Required for TICKET calls */
  ticketNumber?: string
  customerId?: number | string | null
  customerName?: string
  departmentType?: string
  subServiceName?: string
}

export interface AirtelParticipant {
  id: number
  participantIndex?: number
  participantAddress?: string
  participantName?: string
  participantType?: string
  status?: string
  durationMs?: number
}

export interface AirtelCallSummary {
  id: number
  callTimestamp?: string
  overallCallStatus?: string
  callType?: string
  customerName?: string
  callerNumber?: string
  callerName?: string
  callerCircleName?: string
  airtelCallerId?: string
  destinationNumber?: string
  destinationName?: string
  destinationCircleName?: string
  overallCallDuration?: string
  durationMs?: number
  conversationDurationMs?: number
  hasRecording?: boolean
  recordingUrl?: string
  participantCount?: number
  sessionId?: string
  customerId?: number
  departmentType?: string
  subServiceName?: string
  contextType?: CallContextType
  ticketNumber?: string
  createdAt?: string
}

export interface AirtelCallDetail extends AirtelCallSummary {
  callerOperatorName?: string
  hangupCause?: string
  participants?: AirtelParticipant[]
}

export interface AirtelAnalytics {
  totalCalls?: number
  uniqueCallers?: number
  answeredCalls?: number
  answerRate?: number
  missedCalls?: number
  otherCalls?: number
  avgDurationMs?: number
  totalConversationMs?: number
  recordedCalls?: number
}

export interface AirtelPagination {
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface AirtelCallsPage extends AirtelPagination {
  data: AirtelCallSummary[]
}

function queryString(query: AirtelCallsQuery): string {
  const search = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  return search.toString()
}

export async function getMyAirtelCalls(query: AirtelCallsQuery): Promise<AirtelCallsPage> {
  const response = await authedApiRequest<AirtelCallsPage | { data: AirtelCallsPage }>(
    `${AIRTEL_API_BASE}/my-calls?${queryString(query)}`,
  )
  return 'pageNumber' in response ? response : response.data
}

export async function getMyAirtelAnalytics(query: AirtelCallsQuery): Promise<AirtelAnalytics> {
  const response = await authedApiRequest<AirtelAnalytics | { data: AirtelAnalytics }>(
    `${AIRTEL_API_BASE}/my-calls/analytics?${queryString(query)}`,
  )
  return 'data' in response ? response.data : response
}

export async function getDepartmentAirtelCalls(
  query: AirtelCallsQuery,
  departmentType: string,
): Promise<AirtelCallsPage> {
  const search = queryString({ ...query, departmentType } as AirtelCallsQuery)
  const response = await authedApiRequest<AirtelCallsPage | { data: AirtelCallsPage }>(
    `${AIRTEL_API_BASE}/department/calls?${search}`,
  )
  return 'pageNumber' in response ? response : response.data
}

export async function getDepartmentAirtelAnalytics(
  query: AirtelCallsQuery,
  departmentType: string,
): Promise<AirtelAnalytics> {
  const search = queryString({ ...query, departmentType } as AirtelCallsQuery)
  const response = await authedApiRequest<AirtelAnalytics | { data: AirtelAnalytics }>(
    `${AIRTEL_API_BASE}/department/calls/analytics?${search}`,
  )
  return 'data' in response ? response.data : response
}

export async function getAirtelCalls(query: AirtelCallsQuery): Promise<AirtelCallsPage> {
  const response = await authedApiRequest<AirtelCallsPage | { data: AirtelCallsPage }>(
    `${AIRTEL_API_BASE}/calls?${queryString(query)}`,
  )
  return 'pageNumber' in response ? response : response.data
}

export async function getAirtelAnalytics(query: AirtelCallsQuery): Promise<AirtelAnalytics> {
  const response = await authedApiRequest<AirtelAnalytics | { data: AirtelAnalytics }>(
    `${AIRTEL_API_BASE}/calls/analytics?${queryString(query)}`,
  )
  return 'data' in response ? response.data : response
}

export async function getAirtelCallDetail(id: number): Promise<AirtelCallDetail> {
  const response = await authedApiRequest<AirtelCallDetail | { data: AirtelCallDetail }>(
    `${AIRTEL_API_BASE}/calls/${id}`,
  )
  return 'id' in response ? response : response.data
}

function sanitizePhone(raw?: string | null): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1)
  return /^\d{10}$/.test(digits) ? digits : null
}

export async function initiateAirtelClickToCall(
  customerPhone: string,
  context?: CallContext,
): Promise<AirtelClickToCallResponse> {
  if (context?.contextType === 'TICKET' && !context.ticketNumber) {
    throw new Error('Ticket number is required for a ticket call')
  }
  const toNumber = sanitizePhone(customerPhone)
  if (!toNumber) throw new Error('Invalid customer phone number')

  let fromNumber = sanitizePhone(getCurrentPhoneNumber())

  // Some older login responses do not include the agent's phone number. In
  // that case resolve it from the same department profile endpoint used by
  // the profile menu, then cache it for subsequent calls.
  if (!fromNumber) {
    const profile = await fetchCurrentUserProfileMeta()
    fromNumber = sanitizePhone(profile.phoneNumber)
    if (fromNumber) updateSessionPhoneNumber(fromNumber)
  }

  if (!fromNumber) {
    throw new Error('Your agent phone number is not on file. Please contact your admin.')
  }

  const body: Record<string, unknown> = {
    fromNumber,
    toNumber,
    contextType: context?.contextType ?? 'DEPARTMENT',
  }
  if (context?.ticketNumber) body.ticketNumber = context.ticketNumber
  const customerId = context?.customerId != null && context.customerId !== '' ? Number(context.customerId) : NaN
  if (Number.isFinite(customerId)) body.customerId = customerId
  if (context?.customerName) body.customerName = context.customerName
  if (context?.departmentType) body.departmentType = context.departmentType
  if (context?.subServiceName) body.subServiceName = context.subServiceName

  return authedApiRequest<AirtelClickToCallResponse>(`${AIRTEL_API_BASE}/click-to-call`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Calls made from one Help Center ticket (scoped like department calls: user = own, head = dept, admin = all). */
export async function getTicketCalls(ticketNumber: string, page = 0, size = 20): Promise<AirtelCallsPage> {
  const search = queryString({ ticketNumber, contextType: 'TICKET', page, size, sortDir: 'desc' })
  const response = await authedApiRequest<AirtelCallsPage | { data: AirtelCallsPage }>(
    `${AIRTEL_API_BASE}/department/calls?${search}`,
  )
  return 'pageNumber' in response ? response : response.data
}

/**
 * Calls History: every call the viewer may see (user = own, head = department, SuperAdmin = all),
 * optionally only ticket calls or only department calls, with recordings.
 */
export async function getCallsHistory(query: AirtelCallsQuery): Promise<AirtelCallsPage> {
  const response = await authedApiRequest<AirtelCallsPage | { data: AirtelCallsPage }>(
    `${AIRTEL_API_BASE}/department/calls?${queryString({ sortDir: 'desc', ...query })}`,
  )
  return 'pageNumber' in response ? response : response.data
}

/** Department-context calls with one customer (customer drawer → Calls). */
export async function getCustomerDepartmentCalls(
  customerId: number | string,
  departmentType?: string,
  page = 0,
  size = 20,
): Promise<AirtelCallsPage> {
  const search = queryString({
    customerId,
    contextType: 'DEPARTMENT',
    page,
    size,
    sortDir: 'desc',
    ...(departmentType ? { departmentType } : {}),
  } as AirtelCallsQuery)
  const response = await authedApiRequest<AirtelCallsPage | { data: AirtelCallsPage }>(
    `${AIRTEL_API_BASE}/department/calls?${search}`,
  )
  return 'pageNumber' in response ? response : response.data
}

/** Move a call to a ticket, or back to the department. */
export async function moveCallContext(
  callId: string | number,
  target: { contextType: 'TICKET'; ticketNumber: string } | { contextType: 'DEPARTMENT' },
): Promise<AirtelCallDetail> {
  const response = await authedApiRequest<AirtelCallDetail | { data: AirtelCallDetail }>(
    `${AIRTEL_API_BASE}/calls/${encodeURIComponent(String(callId))}/context`,
    { method: 'PATCH', body: JSON.stringify(target) },
  )
  return 'id' in response ? response : response.data
}
