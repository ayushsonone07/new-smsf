import { authedApiRequest } from './client'

export interface AssigningUser {
  username: string
  email: string
}

export interface CustomerFollowUpDepartmentDetail {
  serviceType?: string
  departmentType?: string
  assignedTo?: string
  status?: string
}

export interface CustomerFollowUpItem {
  customerId: number | string
  ownerName: string
  businessName: string
  phoneNumber: string
  email: string
  createdAt: string
  lastMeetingAt?: string
  daysSinceLastActivity?: number
  usedCreatedAtFallback?: boolean
  departments?: CustomerFollowUpDepartmentDetail[]
}

export interface FollowUpQueryParams {
  page?: number
  size?: number
  days?: number
  departmentType?: string
  searchParam?: string
  filteredUser?: string
  createdAtFrom?: string
  createdAtTo?: string
}

interface ApiResponseWrapper<T> {
  data?: T
  status?: number
  message?: string
  totalElements?: number
  totalPage?: number
  elementSize?: number
  pageNumber?: number
}

/**
 * `GET /api/meetings/users/assigning-list?departmentType=ONBOARDING_DEPARTMENT`
 */
export async function getAssigningUsers(
  departmentType = 'ONBOARDING_DEPARTMENT',
): Promise<AssigningUser[]> {
  const search = new URLSearchParams({ departmentType })
  const response = await authedApiRequest<
    ApiResponseWrapper<AssigningUser[]> | AssigningUser[]
  >(`/api/meetings/users/assigning-list?${search.toString()}`)

  if (Array.isArray(response)) {
    return response
  }
  return response?.data ?? []
}

/**
 * `GET /api/customer/follow-up/meeting/recent`
 */
export async function getFollowUpRecentMeetings(
  params: FollowUpQueryParams = {},
): Promise<{
  data: CustomerFollowUpItem[]
  totalElements: number
  totalPage: number
}> {
  const search = new URLSearchParams()
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.size !== undefined) search.set('size', String(params.size))
  if (params.days !== undefined) search.set('days', String(params.days))
  if (params.departmentType) search.set('departmentType', params.departmentType)
  if (params.searchParam) search.set('searchParam', params.searchParam)
  if (params.filteredUser) search.set('filteredUser', params.filteredUser)
  if (params.createdAtFrom) search.set('createdAtFrom', params.createdAtFrom)
  if (params.createdAtTo) search.set('createdAtTo', params.createdAtTo)

  const res = await authedApiRequest<ApiResponseWrapper<CustomerFollowUpItem[]>>(
    `/api/customer/follow-up/meeting/recent?${search.toString()}`,
  )

  const items = Array.isArray(res?.data) ? res.data : []
  return {
    data: items,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
  }
}

/**
 * `GET /api/customer/follow-up/meeting/due`
 */
export async function getFollowUpDueMeetings(
  params: FollowUpQueryParams = {},
): Promise<{
  data: CustomerFollowUpItem[]
  totalElements: number
  totalPage: number
}> {
  const search = new URLSearchParams()
  if (params.page !== undefined) search.set('page', String(params.page))
  if (params.size !== undefined) search.set('size', String(params.size))
  if (params.days !== undefined) search.set('days', String(params.days))
  if (params.departmentType) search.set('departmentType', params.departmentType)
  if (params.searchParam) search.set('searchParam', params.searchParam)
  if (params.filteredUser) search.set('filteredUser', params.filteredUser)
  if (params.createdAtFrom) search.set('createdAtFrom', params.createdAtFrom)
  if (params.createdAtTo) search.set('createdAtTo', params.createdAtTo)

  const res = await authedApiRequest<ApiResponseWrapper<CustomerFollowUpItem[]>>(
    `/api/customer/follow-up/meeting/due?${search.toString()}`,
  )

  const items = Array.isArray(res?.data) ? res.data : []
  return {
    data: items,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
  }
}

/**
 * `POST /api/customer/meeting/mark-done`
 */
export async function markMeetingDone(
  customerId: number | string,
): Promise<void> {
  const search = new URLSearchParams({ customerId: String(customerId) })
  await authedApiRequest<void>(
    `/api/customer/meeting/mark-done?${search.toString()}`,
    { method: 'POST' },
  )
}

