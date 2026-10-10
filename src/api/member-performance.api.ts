import { authedApiRequest } from './client'

export interface MemberPerformanceItem {
  userId?: number | string
  userName?: string
  name?: string
  email?: string
  totalCustomers?: number
  completedCustomers?: number
  inProgressCustomers?: number
  pendingCustomers?: number
  presentDays?: number
  absentDays?: number
  attendance?: string
  performancePercentage?: number
  achievedPercentage?: number
  conversionRate?: number
  [key: string]: unknown
}

export interface MemberPerformancePageResponse {
  data: MemberPerformanceItem[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  summary?: Record<string, unknown>
}

export async function getDepartmentMembersPerformance(params: {
  page?: number
  size?: number
  departmentType?: string
  startDate?: string
  endDate?: string
  searchTerm?: string
} = {}): Promise<MemberPerformancePageResponse> {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? 10))
  search.set('departmentType', params.departmentType ?? 'GOOGLE_DEPARTMENT')
  if (params.startDate) search.set('startDate', params.startDate)
  if (params.endDate) search.set('endDate', params.endDate)
  if (params.searchTerm) search.set('searchTerm', params.searchTerm)

  const res = await authedApiRequest<{
    data?:
      | {
          data?: {
            data?: MemberPerformanceItem[]
            pageNumber?: number
            elementSize?: number
            totalElements?: number
            totalPage?: number
          }
          summary?: Record<string, unknown>
        }
      | MemberPerformanceItem[]
    totalElements?: number
    totalPage?: number
    pageNumber?: number
  }>(`/api/auth/department/members/performance?${search.toString()}`)

  // Backend wrapper: res.data.data.data or res.data
  const rawData = res?.data as {
    data?: {
      data?: MemberPerformanceItem[]
      pageNumber?: number
      elementSize?: number
      totalElements?: number
      totalPage?: number
    }
    summary?: Record<string, unknown>
  } | undefined

  if (rawData && rawData.data) {
    const pageObj = rawData.data
    const items = pageObj.data ?? []
    return {
      data: items,
      pageNumber: pageObj.pageNumber ?? 0,
      elementSize: pageObj.elementSize ?? 10,
      totalElements: pageObj.totalElements ?? items.length,
      totalPage: pageObj.totalPage ?? 1,
      summary: rawData.summary,
    }
  }

  const items = Array.isArray(res?.data) ? res.data : []
  return {
    data: items,
    pageNumber: res?.pageNumber ?? 0,
    elementSize: 10,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
  }
}

