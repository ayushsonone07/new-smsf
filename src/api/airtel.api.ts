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
  callerCircleName?: string
  airtelCallerId?: string
  destinationNumber?: string
  destinationName?: string
  overallCallDuration?: string
  durationMs?: number
  conversationDurationMs?: number
  hasRecording?: boolean
  recordingUrl?: string
  participantCount?: number
  sessionId?: string
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
): Promise<AirtelClickToCallResponse> {
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

  return authedApiRequest<AirtelClickToCallResponse>(`${AIRTEL_API_BASE}/click-to-call`, {
    method: 'POST',
    body: JSON.stringify({ fromNumber, toNumber }),
  })
}
