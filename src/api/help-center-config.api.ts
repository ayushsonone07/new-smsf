import { authedApiRequest } from './client'

export interface HelpCenterConfigItem {
  id: number
  name: string
  code: string
  category?: string | null
  color?: string | null
  sortOrder: number
  isActive: boolean
  isDefault: boolean
  isSystem: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

interface HelpCenterConfigResponse {
  status?: string
  message?: string
  success?: boolean
  data?: HelpCenterConfigItem[]
}

export interface CreateTicketStatusRequest {
  name: string
  isActive: boolean
  isDefault: boolean
}

async function fetchConfigItems(path: 'statuses' | 'priorities') {
  const response = await authedApiRequest<HelpCenterConfigResponse>(
    `/api/help-center/config/${path}`,
  )

  return Array.isArray(response?.data) ? response.data : []
}

export function fetchTicketStatuses() {
  return fetchConfigItems('statuses')
}

export function fetchTicketPriorities() {
  return fetchConfigItems('priorities')
}

export async function createTicketStatus(payload: CreateTicketStatusRequest) {
  const response = await authedApiRequest<
    Omit<HelpCenterConfigResponse, 'data'> & { data?: HelpCenterConfigItem }
  >('/api/help-center/config/statuses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response?.success || !response.data) {
    throw new Error(response?.message || 'Could not create ticket status')
  }

  return response.data
}
