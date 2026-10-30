/**
 * Plan Management API
 *
 * Calls /api/plan/fetch, /api/plan/manage, and /api/plan/{planId}/services endpoints.
 */
import { authedApiRequest } from './client'

export interface PlanTypeEntity {
  planTypeId: string
  planName: string
  departmentTypes: string[]
  featureList?: string[]
  createdAt: string
  updatedAt: string
  enabled: boolean
  amount?: number | null
  additionalAmount?: number | null
  durationMonths?: number | null
}

export interface PlanTypeRequest {
  planName: string
  departmentTypes: string[]
  featureList?: string[]
  amount?: number | null
  additionalAmount?: number | null
  durationMonths?: number | null
}

export interface PlanAmount {
  planTypeId: string
  planName: string
  amount: number | null
  additionalAmount: number | null
  durationMonths: number | null
  enabled: boolean
  featureList?: string[]
}

export interface PlanPageResponse {
  data: PlanTypeEntity[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface PlanFetchParams {
  username: string
  searchParam?: string
  planName?: string
  page?: number
  size?: number
}

export interface PlanManageParams {
  username: string
  action: 'add' | 'edit' | 'delete' | 'activate' | 'deactivate'
  planTypeId?: string
  plan?: PlanTypeRequest
}

export interface PlanManageResponse {
  status?: string
  message?: string
  success?: boolean
  data?: PlanTypeEntity
}

/**
 * Fetch paginated plans with optional search and planName filters.
 */
export async function fetchPlans(params: PlanFetchParams): Promise<PlanPageResponse> {
  const { username, searchParam, planName, page = 0, size = 10 } = params
  const qs = new URLSearchParams({ page: String(page), size: String(size) })
  if (searchParam) qs.set('searchParam', searchParam)
  if (planName) qs.set('planName', planName)

  const res = await authedApiRequest<any>(`/api/plan/fetch?${qs.toString()}`, {
    headers: { username },
  })

  // Normalize CustomApiResponse<CustomPageResponse<PlanTypeEntity>> structure
  const pageData = res?.data?.data ? res.data : (res?.data || res)

  const dataList: PlanTypeEntity[] = Array.isArray(pageData?.data)
    ? pageData.data
    : Array.isArray(res?.data)
      ? res.data
      : []

  return {
    data: dataList,
    pageNumber: Number(pageData?.pageNumber ?? pageData?.page ?? page),
    elementSize: Number(pageData?.elementSize ?? pageData?.size ?? size),
    totalElements: Number(pageData?.totalElements ?? dataList.length),
    totalPage: Number(
      pageData?.totalPage ?? pageData?.totalPages ?? (Math.ceil(dataList.length / size) || 1),
    ),
    first: Boolean(pageData?.first ?? page === 0),
    last: Boolean(pageData?.last ?? true),
  }
}

/**
 * Manage (add, edit, delete, activate, deactivate) a plan type.
 */
export async function managePlan(params: PlanManageParams): Promise<PlanManageResponse> {
  const { username, action, planTypeId, plan } = params
  const qs = new URLSearchParams({ action })
  if (planTypeId) qs.set('planTypeId', planTypeId)

  return authedApiRequest<PlanManageResponse>(`/api/plan/manage?${qs.toString()}`, {
    method: 'POST',
    headers: { username },
    body: plan ? JSON.stringify(plan) : undefined,
  })
}

/**
 * Fetch public plan amounts.
 */
export async function fetchPlanAmounts(): Promise<PlanAmount[]> {
  const res = await authedApiRequest<any>('/api/plan/amounts')
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res)) return res
  return []
}

/**
 * Get all services associated with a specific plan (or all if planId = '0').
 */
export async function getServicesForPlan(
  planId: string,
  page = 0,
  size = 100,
): Promise<{ data: any[]; totalElements: number }> {
  const res = await authedApiRequest<any>(`/api/plan/${planId}/services?page=${page}&size=${size}`)
  const pageData = res?.data?.data ? res.data : (res?.data || res)
  const items = Array.isArray(pageData?.data) ? pageData.data : (Array.isArray(res?.data) ? res.data : [])
  return {
    data: items,
    totalElements: Number(pageData?.totalElements ?? items.length),
  }
}

/**
 * Add / associate services to a plan.
 */
export async function addServicesToPlan(
  planId: string,
  serviceIds: (string | number)[],
): Promise<any> {
  return authedApiRequest<any>(`/api/plan/${planId}/services`, {
    method: 'POST',
    body: JSON.stringify(serviceIds),
  })
}
