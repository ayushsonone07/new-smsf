import { authedApiRequest } from './client'

export interface HelpCenterConfigItem {
  id: number
  name: string
  code: string
  category?: string | null
  color?: string | null
  followupHours?: number | null
  resolveHours?: number | null
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

export interface CreateTicketPriorityRequest {
  name: string
  followupHours: number
  resolveHours: number
  color: string
  sortOrder: number
  isActive: boolean
  isDefault: boolean
}

export interface UpdateTicketStatusRequest {
  name: string
  sortOrder: number
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

  const data = response?.data ?? (response as unknown as HelpCenterConfigItem)
  if (!data || response?.success === false) {
    throw new Error(response?.message || 'Could not create ticket status')
  }

  return data
}

export async function createTicketPriority(payload: CreateTicketPriorityRequest) {
  const response = await authedApiRequest<
    Omit<HelpCenterConfigResponse, 'data'> & { data?: HelpCenterConfigItem }
  >('/api/help-center/config/priorities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = response?.data ?? (response as unknown as HelpCenterConfigItem)
  if (!data || response?.success === false) {
    throw new Error(response?.message || 'Could not create ticket priority')
  }

  return data
}

export async function updateTicketPriority(id: number, payload: CreateTicketPriorityRequest) {
  const response = await authedApiRequest<
    Omit<HelpCenterConfigResponse, 'data'> & { data?: HelpCenterConfigItem }
  >(`/api/help-center/config/priorities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = response?.data ?? (response as unknown as HelpCenterConfigItem)
  if (!data || response?.success === false) {
    throw new Error(response?.message || 'Could not update ticket priority')
  }

  return data
}

export async function deleteTicketPriority(id: number) {
  const response = await authedApiRequest<Omit<HelpCenterConfigResponse, 'data'>>(
    `/api/help-center/config/priorities/${id}`,
    {
      method: 'DELETE',
      headers: { 'X-User-Role': 'SUPER_ADMIN' },
    },
  )

  if (response?.success === false) {
    throw new Error(response?.message || 'Could not delete ticket priority')
  }
}

export async function updateTicketStatusConfig(id: number, payload: UpdateTicketStatusRequest) {
  const response = await authedApiRequest<
    Omit<HelpCenterConfigResponse, 'data'> & { data?: HelpCenterConfigItem }
  >(`/api/help-center/config/statuses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'SUPER_ADMIN' },
    body: JSON.stringify(payload),
  })
  const data = response?.data ?? (response as unknown as HelpCenterConfigItem)
  if (!data || response?.success === false) throw new Error(response?.message || 'Could not update ticket status')
  return data
}

export async function deleteTicketStatusConfig(id: number) {
  const response = await authedApiRequest<Omit<HelpCenterConfigResponse, 'data'>>(
    `/api/help-center/config/statuses/${id}`,
    { method: 'DELETE', headers: { 'X-User-Role': 'SUPER_ADMIN' } },
  )
  if (response?.success === false) throw new Error(response?.message || 'Could not delete ticket status')
}

export async function setTicketConfigActive(
  type: 'status' | 'priority',
  id: number,
  active: boolean,
) {
  const path = type === 'status' ? 'statuses' : 'priorities'
  const response = await authedApiRequest<Omit<HelpCenterConfigResponse, 'data'> & { data?: HelpCenterConfigItem }>(
    `/api/help-center/config/${path}/${id}/toggle-active?active=${active}`,
    { method: 'PATCH' },
  )

  if (response?.success === false) {
    throw new Error(response?.message || `Could not ${active ? 'activate' : 'deactivate'} ticket ${type}`)
  }

  return response?.data ?? (response as unknown as HelpCenterConfigItem)
}
