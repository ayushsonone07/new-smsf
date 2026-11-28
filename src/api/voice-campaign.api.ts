import { authedApiRequest } from './client'

const VOICE_API_BASE = '/api/v1/voice'

export interface VoiceCampaignItem {
  id: string
  sessionId: string
  provider: string
  campaignName?: string
  recipientNumber: string
  customerName?: string
  callingNumber?: string
  voiceFileId?: string
  ticketNumber?: string
  callPurpose?: string
  departmentType?: string
  status: string
  overallCallStatus: string
  providerResponse?: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface VoiceCampaignPagination {
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first?: boolean
  last?: boolean
}

export interface VoiceCampaignPage extends VoiceCampaignPagination {
  data: VoiceCampaignItem[]
  content?: VoiceCampaignItem[]
  total?: number
  totalPages?: number
}

export interface VoiceCampaignAnalytics {
  totalCampaigns: number
  totalInitiated: number
  totalSuccess: number
  totalFailed: number
  totalToday: number
}

export interface VoiceCampaignQuery {
  status?: string
  search?: string
  fromDate?: string
  toDate?: string
  page?: number
  size?: number
  sortBy?: string
  sortDir?: string
}

function queryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      q.append(k, String(v))
    }
  })
  return q.toString()
}

export async function getVoiceCampaigns(query: VoiceCampaignQuery = {}): Promise<VoiceCampaignPage> {
  const qs = queryString(query as Record<string, unknown>)
  const endpoint = `${VOICE_API_BASE}/campaigns${qs ? `?${qs}` : ''}`
  const response = await authedApiRequest<any>(endpoint)

  if (response && typeof response === 'object') {
    // If response is nested like { data: { data: [...], totalElements: ... } }
    if (response.data && !Array.isArray(response.data) && ('data' in response.data || 'content' in response.data)) {
      return response.data
    }
    return response
  }
  return { data: [], totalElements: 0, totalPage: 0, pageNumber: 0, elementSize: 15 } as any
}

export async function getVoiceCampaignAnalytics(): Promise<VoiceCampaignAnalytics> {
  const endpoint = `${VOICE_API_BASE}/campaigns/analytics`
  const response = await authedApiRequest<any>(endpoint)
  if (response && response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data
  }
  return response || {}
}

export interface VoiceEventRule {
  eventKey: string
  label: string
  source?: string
  enabled: boolean
  campaignPrefix: string
  voiceFileId?: string
  callingNumber?: string
  builtIn?: boolean
  cooldownMinutes?: number | null
}

export interface VoiceConfig {
  enabled: boolean
  apiUrl: string
  maskedToken?: string
  tokenConfigured: boolean
  callingNumber: string
  defaultVoiceFileId: string
  callbackUrl?: string
  updatedBy?: string
  updatedAt?: string
  eventRules?: VoiceEventRule[]
}

export interface UpdateVoiceConfigInput {
  enabled?: boolean
  apiUrl?: string
  token?: string
  callingNumber?: string
  defaultVoiceFileId?: string
  callbackUrl?: string
  eventRules?: VoiceEventRule[]
}

export interface TestVoiceCallInput {
  phoneNumber: string
  voiceFileId?: string
  callingNumber?: string
}

export async function getVoiceConfig(): Promise<VoiceConfig> {
  const endpoint = `${VOICE_API_BASE}/config`
  const response = await authedApiRequest<any>(endpoint)
  if (response && response.data && typeof response.data === 'object') {
    return response.data
  }
  return response || {}
}

export async function updateVoiceConfig(input: UpdateVoiceConfigInput): Promise<VoiceConfig> {
  const endpoint = `${VOICE_API_BASE}/config`
  const response = await authedApiRequest<any>(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (response && response.data && typeof response.data === 'object') {
    return response.data
  }
  return response || {}
}

export async function sendTestVoiceCall(input: TestVoiceCallInput): Promise<any> {
  const endpoint = `${VOICE_API_BASE}/test-call`
  const response = await authedApiRequest<any>(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (response && response.data && typeof response.data === 'object') {
    return response.data
  }
  return response || {}
}
