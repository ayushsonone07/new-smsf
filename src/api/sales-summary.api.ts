import { authedApiRequest } from './client'

export interface TelecallerItem {
  id?: number | string
  username?: string
  name?: string
  totalLeads?: number
  pendingLeads?: number
  completedLeads?: number
  followUpLeads?: number
  notInterestedLeads?: number
  notConnectedLeads?: number
  revenue?: number
  conversionRate?: number
}

export interface SalesHeadSummaryResponse {
  totalLeads: number
  pendingLeads: number
  onProcessLeads: number
  followUpLeads: number
  notInterestedLeads: number
  completedLeads: number
  notConnectedLeads: number
  doneLeads: number
  assignedUser?: string
  totalRevenue?: number
  lastMonthRevenue?: number
  currentMonthRevenue?: number
  overallRevenue?: number
  departmentUsers?: string[]
  telecallers?: TelecallerItem[]
  telecaller?: TelecallerItem[]
}

export interface FetchSalesHeadSummaryParams {
  totalSummary?: boolean
  departmentUser?: string
  startDate?: string
  endDate?: string
}

/**
 * Fetches sales summary for department head / superadmin from GET /api/leads/sales/summary/head.
 */
export async function fetchSalesHeadSummary(
  params: FetchSalesHeadSummaryParams = {},
): Promise<SalesHeadSummaryResponse> {
  const query = new URLSearchParams()
  if (params.totalSummary !== undefined) {
    query.set('totalSummary', String(params.totalSummary))
  }
  if (params.departmentUser) {
    query.set('departmentUser', params.departmentUser)
  }
  if (params.startDate) {
    query.set('startDate', params.startDate)
  }
  if (params.endDate) {
    query.set('endDate', params.endDate)
  }

  const qs = query.toString()
  const endpoint = `/api/leads/sales/summary/head${qs ? `?${qs}` : ''}`

  const res = await authedApiRequest<{
    data?: SalesHeadSummaryResponse
    status?: string
    message?: string
    success?: boolean
  }>(endpoint)

  if (res?.data) {
    return res.data
  }

  return (res as unknown as SalesHeadSummaryResponse) ?? {
    totalLeads: 0,
    pendingLeads: 0,
    onProcessLeads: 0,
    followUpLeads: 0,
    notInterestedLeads: 0,
    completedLeads: 0,
    notConnectedLeads: 0,
    doneLeads: 0,
  }
}

