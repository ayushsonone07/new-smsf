/**
 * Airtel Call Analytics API
 *
 * Mirrors the SMSF airtelService.ts but uses new-smsf's authedApiRequest
 * pattern instead of axios.
 */
import { authedApiRequest } from './client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface AirtelCallSummary {
  id: number
  sessionId: string
  overallCallStatus: string | null
  callType: string | null
  customerName: string | null
  customerRefId: string | null
  callerNumber: string | null
  callerCircleName: string | null
  airtelCallerId: string | null
  destinationNumber: string | null
  destinationName: string | null
  destinationCircleName: string | null
  durationMs: number | null
  conversationDurationMs: number | null
  overallCallDuration: string | null
  recordingUrl: string | null
  callTimestamp: string | null
  createdAt: string | null
  participantCount: number | null
  hasRecording: boolean
}

export interface AirtelParticipant {
  id: number
  participantAddress: string | null
  participantName: string | null
  participantType: string | null
  participantCallType: string | null
  status: string | null
  hangupCause: string | null
  retryCount: number | null
  durationMs: number | null
  participantIndex: number | null
}

export interface AirtelCallDetail extends AirtelCallSummary {
  clientCorrelationId: string | null
  hangupCause: string | null
  callerName: string | null
  callerOperatorName: string | null
  callerStatus: string | null
  destinationOperatorName: string | null
  missedDestinationNumber: string | null
  billableDuration: string | null
  participants: AirtelParticipant[]
}

export interface AirtelAnalytics {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  otherCalls: number
  totalDurationMs: number
  avgDurationMs: number
  totalConversationMs: number
  recordedCalls: number
  uniqueCallers: number
  answerRate: number
}

export interface AirtelPagination {
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface AirtelCallsPageResponse {
  data: AirtelCallSummary[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface AirtelAnalyticsResponse {
  success: boolean
  message: string
  data: AirtelAnalytics | null
}

export interface AirtelCallDetailResponse {
  success: boolean
  message: string
  data: AirtelCallDetail | null
}

export interface AirtelCallsQuery {
  status?: string
  callType?: string
  search?: string
  fromDate?: string // yyyy-MM-dd
  toDate?: string   // yyyy-MM-dd
  page?: number     // 0-based
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  departmentType?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const cleanParams = (q: AirtelCallsQuery): Record<string, string> => {
  const out: Record<string, string> = {}
  Object.entries(q).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      out[key] = String(value)
    }
  })
  return out
}

const toQueryString = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString()
  return qs ? `?${qs}` : ''
}

// ── My-calls endpoints ────────────────────────────────────────────────────────

export async function getMyAirtelCalls(
  query: AirtelCallsQuery,
): Promise<AirtelCallsPageResponse> {
  const qs = toQueryString(cleanParams(query))
  return authedApiRequest<AirtelCallsPageResponse>(`/api/v1/airtel/my-calls${qs}`)
}

export async function getMyAirtelAnalytics(
  query: AirtelCallsQuery,
): Promise<AirtelAnalytics | null> {
  const qs = toQueryString(cleanParams(query))
  const res = await authedApiRequest<AirtelAnalyticsResponse>(`/api/v1/airtel/my-calls/analytics${qs}`)
  return res?.data ?? null
}

// ── Department-calls endpoints ────────────────────────────────────────────────

export async function getDepartmentAirtelCalls(
  query: AirtelCallsQuery,
  departmentType: string,
): Promise<AirtelCallsPageResponse> {
  const qs = toQueryString(cleanParams({ ...query, departmentType }))
  return authedApiRequest<AirtelCallsPageResponse>(`/api/v1/airtel/department/calls${qs}`)
}

export async function getDepartmentAirtelAnalytics(
  query: AirtelCallsQuery,
  departmentType: string,
): Promise<AirtelAnalytics | null> {
  const qs = toQueryString(cleanParams({ ...query, departmentType }))
  const res = await authedApiRequest<AirtelAnalyticsResponse>(`/api/v1/airtel/department/calls/analytics${qs}`)
  return res?.data ?? null
}

// ── Detail endpoint ───────────────────────────────────────────────────────────

export async function getAirtelCallDetail(
  id: number,
): Promise<AirtelCallDetail | null> {
  const res = await authedApiRequest<AirtelCallDetailResponse>(`/api/v1/airtel/calls/${id}`)
  return res?.data ?? null
}

