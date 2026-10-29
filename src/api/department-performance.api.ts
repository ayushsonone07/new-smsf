import { authedApiRequest } from './client'

export interface ServiceTypePerformanceItem {
  departmentType: string
  serviceType: string
  pendingCustomers: number
  inProgressCustomers: number
  completedCustomers: number
  cancelledCustomers: number
  churnedCustomers?: number
  totalCustomers: number
}

export interface DepartmentPerformancePageResponse {
  data: ServiceTypePerformanceItem[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
}

export interface FetchDepartmentPerformanceParams {
  startDate?: string
  endDate?: string
  page?: number
  size?: number
}

/**
 * Fetches department performance metrics from GET /api/auth/superadmin/department/performance.
 */
export async function fetchDepartmentPerformance(
  params: FetchDepartmentPerformanceParams = {},
): Promise<DepartmentPerformancePageResponse> {
  const query = new URLSearchParams()
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 10))

  const res = await authedApiRequest<{
    data?: {
      data?: ServiceTypePerformanceItem[]
      pageNumber?: number
      elementSize?: number
      totalElements?: number
      totalPage?: number
    }
    status?: string
    message?: string
    success?: boolean
  }>(`/api/auth/superadmin/department/performance?${query.toString()}`)

  const payload = res?.data ?? (res as any)

  return {
    data: payload?.data ?? [],
    pageNumber: payload?.pageNumber ?? 0,
    elementSize: payload?.elementSize ?? 10,
    totalElements: payload?.totalElements ?? (payload?.data?.length ?? 0),
    totalPage: payload?.totalPage ?? 1,
  }
}

