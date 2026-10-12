/**
 * Department Services (Manage Services) API
 *
 * Calls /api/service/fetch and related endpoints.
 */
import { authedApiRequest } from './client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface DepartmentServiceEntity {
  departmentServiceId: number
  departmentServiceName: string
  departmentType: string
  remarks: string | null
  isServiceActive: boolean
  createdAt: string
}

export interface ServicePlan {
  planTypeId?: string | number
  planName?: string
  departmentTypes?: string[]
}

export interface ServicePagination {
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface ServiceFetchResponse {
  data: DepartmentServiceEntity[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export interface ManageServiceResponse {
  success: boolean
  message: string
  data?: DepartmentServiceEntity | null
}

export interface ServicePlansResponse {
  success: boolean
  message: string
  data: ServicePlan[]
}

export interface ServiceFetchParams {
  username: string
  searchParam?: string
  serviceName?: string
  page?: number
  size?: number
}

export interface ServiceManageRequest {
  departmentServiceName: string
  remarks?: string | null
  isServiceActive: boolean
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchDepartmentServices(
  params: ServiceFetchParams,
): Promise<ServiceFetchResponse> {
  const { username, searchParam, serviceName, page = 0, size = 10 } = params
  const qs = new URLSearchParams({ page: String(page), size: String(size) })
  if (searchParam) qs.set('searchParam', searchParam)
  if (serviceName) qs.set('serviceName', serviceName)

  return authedApiRequest<ServiceFetchResponse>(`/api/service/fetch?${qs.toString()}`, {
    headers: { username },
  })
}

export async function addDepartmentService(
  username: string,
  departmentType: string,
  service: ServiceManageRequest,
): Promise<ManageServiceResponse> {
  return authedApiRequest<ManageServiceResponse>(
    `/api/service/manage?action=add&departmentType=${encodeURIComponent(departmentType)}`,
    {
      method: 'POST',
      body: JSON.stringify(service),
      headers: { username },
    },
  )
}

export async function editDepartmentService(
  username: string,
  serviceId: number,
  departmentType: string,
  service: ServiceManageRequest,
): Promise<ManageServiceResponse> {
  return authedApiRequest<ManageServiceResponse>(
    `/api/service/manage?action=edit&serviceId=${serviceId}&departmentType=${encodeURIComponent(departmentType)}`,
    {
      method: 'POST',
      body: JSON.stringify(service),
      headers: { username },
    },
  )
}

export async function deleteDepartmentService(
  username: string,
  serviceId: number,
  departmentType: string,
): Promise<ManageServiceResponse> {
  return authedApiRequest<ManageServiceResponse>(
    `/api/service/manage?action=delete&serviceId=${serviceId}&departmentType=${encodeURIComponent(departmentType)}`,
    {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { username },
    },
  )
}

export async function getPlansForService(
  serviceId: number,
  page = 0,
  size = 100,
): Promise<ServicePlan[]> {
  const res = await authedApiRequest<
    ServicePlansResponse & { data?: ServicePlan[] | { data?: ServicePlan[] } }
  >(`/api/service/${serviceId}/plans?page=${page}&size=${size}`)
  const payload = res?.data as unknown
  if (Array.isArray(payload)) {
    return payload
  }
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: ServicePlan[] }).data)
  ) {
    return (payload as { data: ServicePlan[] }).data
  }
  return []
}

