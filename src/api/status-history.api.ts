import { authedApiRequest } from './client'

export interface StatusHistoryItem {
  id: string | number
  leadId?: string | null
  leadName?: string | null
  customerId?: string | null
  customerName?: string | null
  userId?: string | null
  updatedBy: string
  oldStatus: string
  newStatus: string
  newStatusDescription?: string | null
  createdAt: string
}

export interface StatusHistoryResponse {
  data: StatusHistoryItem[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first?: boolean
  last?: boolean
}

export async function getStatusHistory(params: {
  page?: number
  size?: number
  leadName?: string
  customerName?: string
  userName?: string
} = {}): Promise<StatusHistoryResponse> {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? 10))
  if (params.leadName) search.set('leadName', params.leadName)
  if (params.customerName) search.set('customerName', params.customerName)
  if (params.userName) search.set('userName', params.userName)

  const res = await authedApiRequest<{
    data?: StatusHistoryItem[]
    pageNumber?: number
    elementSize?: number
    totalElements?: number
    totalPage?: number
    first?: boolean
    last?: boolean
  }>(`/api/status-history/get-all?${search.toString()}`)

  return {
    data: res.data ?? [],
    pageNumber: res.pageNumber ?? (params.page ?? 0),
    elementSize: res.elementSize ?? 10,
    totalElements: res.totalElements ?? (res.data?.length ?? 0),
    totalPage: res.totalPage ?? 1,
    first: res.first,
    last: res.last,
  }
}

