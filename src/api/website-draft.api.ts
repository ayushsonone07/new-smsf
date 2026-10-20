import { authedApiRequest } from './client'

export interface WebsiteDraftMailRequest {
  clientEmail: string
  clientName: string
  draftLink: string
  remark?: string
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

/**
 * Send website draft mail:
 * POST /api/smtp/website-draft/mail?clientEmail=...&clientName=...&draftLink=...&remark=...
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

  return authedApiRequest<{ success: boolean; message: string }>(
    `/api/smtp/website-draft/mail?${search.toString()}`,
    {
      method: 'POST',
    },
  )
}

/**
 * Fetch website draft history:
 * GET /api/smtp/website-draft/history?clientEmail=...
 */
export async function fetchWebsiteDraftHistory(
  clientEmail: string,
): Promise<WebsiteDraftHistoryEntry[]> {
  const search = new URLSearchParams({ clientEmail })
  const response = await authedApiRequest<
    WebsiteDraftHistoryResponse | WebsiteDraftHistoryEntry[]
  >(`/api/smtp/website-draft/history?${search.toString()}`)

  if (Array.isArray(response)) {
    return response
  }
  return response?.data || []
}
