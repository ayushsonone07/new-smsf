import { apiClient } from './axios'

export interface HelpCartTicket {
  id?: number | string
  ticket_number?: string
  ticketNumber?: string
  subject?: string
  status?: string
  priority?: string
  department_id?: number | string
  department?: string
  department_name?: string
  user_id?: number | string
  user_name?: string
  customer_name?: string
  email?: string
  user_email?: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  messages_count?: number
  [key: string]: unknown
}

export interface HelpCartTicketsResponse {
  data?: HelpCartTicket[] | Record<string, unknown>
  tickets?: HelpCartTicket[]
  currentPage?: number
  current_page?: number
  pageSize?: number
  per_page?: number
  totalRecords?: number
  total?: number
  totalPages?: number
  last_page?: number
  [key: string]: unknown
}

export interface FetchHelpCartParams {
  page?: number
  size?: number
  status?: string
  priority?: string
  departmentId?: number | string
  search?: string
}

interface CustomApiResponse<T> {
  status?: string | number
  statusCode?: number
  message?: string
  success?: boolean
  data: T
}

// [ help.mbgcard.com ]
/**
 * Fetch all tickets from live help.mbgcart.com via SMSB (/api/help-cart/tickets/all).
 * SUPERADMIN view.
 */
export async function fetchHelpCartTickets(
  params?: FetchHelpCartParams
): Promise<any> {
  const res = await apiClient.get<CustomApiResponse<any>>('/api/help-cart/tickets/all', {
    params: {
      page: params?.page ?? 1,
      size: params?.size ?? 20,
      status: params?.status || undefined,
      priority: params?.priority || undefined,
      departmentId: params?.departmentId || undefined,
      search: params?.search?.trim() || undefined,
    },
    headers: {
      'X-User-Role': 'SUPERADMIN',
    },
  })

  return res.data?.data
}


// [ help.mbgcard.com ]
/**
 * Fetch and cache Help Cart admin token via SMSB (/api/help-cart/auth/fetch-token).
 */
export async function fetchHelpCartToken(credentials?: {
  username?: string
  password?: string
}): Promise<any> {
  const res = await apiClient.post<CustomApiResponse<any>>(
    '/api/help-cart/auth/fetch-token',
    credentials || {}
  )
  return res.data?.data
}

// [ help.mbgcard.com ]
/**
 * Get current Help Cart token status from SMSB.
 */
export async function getHelpCartTokenStatus(): Promise<any> {
  const res = await apiClient.get<CustomApiResponse<any>>(
    '/api/help-cart/auth/current-token'
  )
  return res.data?.data
}
