import { authedApiRequest } from './client'

export interface WebsiteDraftMailRequest {
  clientEmail: string
  clientName: string
  draftLink: string
  remark?: string
  customerId?: number | string
  duplicateCustomerId?: string
}

export interface WebsiteDraftHistoryEntry {
  draftLink: string
  sentAt: string
  sentBy: string
  remark: string
}

export interface WebsiteDraftHistoryResponse {
  success: boolean
  message?: string
  data: WebsiteDraftHistoryEntry[]
}

export interface FetchWebsiteDraftHistoryParams {
  clientEmail?: string
  customerId?: number | string
  duplicateCustomerId?: string
}

/**
 * Send website draft mail:
 * POST /api/smtp/website-draft/mail?clientEmail=...&clientName=...&draftLink=...&remark=...&customerId=...
 */
export async function sendWebsiteDraftMail(
  payload: WebsiteDraftMailRequest,
): Promise<{ success: boolean; message: string }> {
  const search = new URLSearchParams({
    clientEmail: payload.clientEmail,
    clientName: payload.clientName,
    draftLink: payload.draftLink,
    remark: payload.remark || '',
  })

  if (payload.customerId !== undefined && payload.customerId !== null) {
    search.append('customerId', String(payload.customerId))
  }
  if (payload.duplicateCustomerId) {
    search.append('duplicateCustomerId', payload.duplicateCustomerId)
  }

  return authedApiRequest<{ success: boolean; message: string }>(
    `/api/smtp/website-draft/mail?${search.toString()}`,
    {
      method: 'POST',
    },
  )
}

/**
 * Fetch website draft history:
 * GET /api/smtp/website-draft/history?clientEmail=...&customerId=...
 */
export async function fetchWebsiteDraftHistory(
  params: string | FetchWebsiteDraftHistoryParams,
): Promise<WebsiteDraftHistoryEntry[]> {
  const search = new URLSearchParams()
  if (typeof params === 'string') {
    if (params) search.append('clientEmail', params)
  } else if (params) {
    if (params.clientEmail) search.append('clientEmail', params.clientEmail)
    if (params.customerId !== undefined && params.customerId !== null) {
      search.append('customerId', String(params.customerId))
    }
    if (params.duplicateCustomerId) {
      search.append('duplicateCustomerId', params.duplicateCustomerId)
    }
  }

  const response = await authedApiRequest<
    WebsiteDraftHistoryResponse | WebsiteDraftHistoryEntry[]
  >(`/api/smtp/website-draft/history?${search.toString()}`)

  if (Array.isArray(response)) {
    return response
  }
  return response?.data || []
}
