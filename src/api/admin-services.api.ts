import { getSession } from '../app/auth/session'
import { apiClient } from './axios'
import { normalizeDepartmentTypeName } from './dynamic-permission.api'

export interface AdminServiceItem {
  id: number
  serviceType: string
  departmentType: string
  isServiceActive: boolean
  createdAt?: string
}

interface CustomApiResponse<T> {
  status?: string
  message?: string
  data?: T
  success?: boolean
}

function getAdminUsernameHeader(): Record<string, string> {
  const email = getSession()?.user.email
  return email ? { username: email } : {}
}

/**
 * Formats a service type string to UPPERCASE_WITH_UNDERSCORES
 * to satisfy @CapitalCase validation in SMSB ServiceTypeRequest.
 */
export function normalizeServiceTypeName(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
}

/**
 * GET /api/auth/admin/services
 * Fetches all services created in Superadmin -> ServiceList.
 */
export async function getAdminServices(): Promise<AdminServiceItem[]> {
  const response = await apiClient.get<
    CustomApiResponse<AdminServiceItem[]> | AdminServiceItem[]
  >('/api/auth/admin/services', {
    headers: getAdminUsernameHeader(),
  })

  const payload = response.data
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }
  return []
}

export interface AddAdminServicePayload {
  serviceType: string
  departmentType: string
  isServiceActive: boolean
}

/**
 * POST /api/auth/admin/add/service
 * Step 1: Create a new service with serviceType and departmentType.
 */
export async function addAdminService(
  payload: AddAdminServicePayload,
): Promise<AdminServiceItem> {
  const normalizedServiceType = normalizeServiceTypeName(payload.serviceType)
  const normalizedDepartmentType = normalizeDepartmentTypeName(
    payload.departmentType,
  )

  const response = await apiClient.post<CustomApiResponse<AdminServiceItem>>(
    '/api/auth/admin/add/service',
    {
      serviceType: normalizedServiceType,
      departmentType: normalizedDepartmentType,
      isServiceActive: payload.isServiceActive,
    },
    {
      headers: getAdminUsernameHeader(),
    },
  )

  return (
    response.data?.data ?? {
      id: Date.now(),
      serviceType: normalizedServiceType,
      departmentType: normalizedDepartmentType,
      isServiceActive: payload.isServiceActive,
      createdAt: new Date().toISOString(),
    }
  )
}

export interface ManageAdminServicePayload {
  serviceId?: number
  serviceType: string
  departmentType: string
  isServiceActive: boolean
  previousServiceType?: string
  action: 'edit' | 'delete'
}

/**
 * POST /api/auth/admin/manage/service?action=edit|delete
 * Edit or delete an existing service in Superadmin -> ServiceList.
 */
export async function manageAdminService(
  payload: ManageAdminServicePayload,
): Promise<AdminServiceItem | null> {
  const normalizedServiceType = normalizeServiceTypeName(payload.serviceType)
  const normalizedDepartmentType = normalizeDepartmentTypeName(
    payload.departmentType,
  )

  const body: Record<string, unknown> = {
    serviceId: payload.serviceId,
    serviceType: normalizedServiceType,
    departmentType: normalizedDepartmentType,
    isServiceActive: payload.isServiceActive,
  }

  if (payload.previousServiceType) {
    body.previousServiceType = normalizeServiceTypeName(
      payload.previousServiceType,
    )
  }

  const response = await apiClient.post<CustomApiResponse<AdminServiceItem>>(
    `/api/auth/admin/manage/service?action=${payload.action}`,
    body,
    {
      headers: getAdminUsernameHeader(),
    },
  )

  return response.data?.data ?? null
}

// ============================================================================
// Plans & Subservices & Pending Approvals APIs (from SMSF ServiceTable.tsx)
// ============================================================================

export interface PlanTypeItem {
  planTypeId: string
  planName: string
  departmentTypes: string[]
  amount?: number | null
  additionalAmount?: number | null
  durationMonths?: number | null
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PlanPageData {
  data: PlanTypeItem[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
  first: boolean
  last: boolean
}

export async function fetchAdminPlans(params: {
  searchParam?: string
  page?: number
  size?: number
}): Promise<PlanPageData> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 10),
  })
  if (params.searchParam?.trim()) {
    query.append('searchParam', params.searchParam.trim())
  }

  const response = await apiClient.get<{
    data?: PlanPageData
  }>(`/api/plan/fetch?${query.toString()}`, {
    headers: getAdminUsernameHeader(),
  })

  return (
    response.data?.data ?? {
      data: [],
      pageNumber: 0,
      elementSize: 10,
      totalElements: 0,
      totalPage: 0,
      first: true,
      last: true,
    }
  )
}

export interface ManagePlanPayload {
  action: 'add' | 'edit' | 'delete' | 'activate' | 'deactivate'
  planTypeId?: string
  plan?: {
    planName: string
    departmentTypes: string[]
    amount?: number | null
    additionalAmount?: number | null
    durationMonths?: number | null
  }
}

export async function manageAdminPlan(
  payload: ManagePlanPayload,
): Promise<unknown> {
  const query = new URLSearchParams({ action: payload.action })
  if (payload.planTypeId) {
    query.append('planTypeId', payload.planTypeId)
  }

  const response = await apiClient.post(
    `/api/plan/manage?${query.toString()}`,
    payload.plan ?? {},
    {
      headers: getAdminUsernameHeader(),
    },
  )
  return response.data
}

export interface PlanSubserviceItem {
  departmentServiceId: string
  departmentServiceName: string
  departmentType?: string
}

export async function fetchServicesForPlan(
  planId: string,
): Promise<PlanSubserviceItem[]> {
  const response = await apiClient.get<{
    data?: { data?: PlanSubserviceItem[] } | PlanSubserviceItem[]
  }>(`/api/plan/${planId}/services?page=0&size=100`, {
    headers: getAdminUsernameHeader(),
  })

  const raw = response.data?.data
  if (Array.isArray(raw)) return raw
  if (raw && Array.isArray(raw.data)) return raw.data
  return []
}

export async function addServicesToAdminPlan(params: {
  planId: string
  serviceIds: string[]
}): Promise<unknown> {
  const response = await apiClient.post(
    `/api/plan/${params.planId}/services`,
    params.serviceIds,
    {
      headers: getAdminUsernameHeader(),
    },
  )
  return response.data
}

export interface PendingTimelineRequestItem {
  departmentServiceId: string
  departmentServiceName?: string
  departmentType?: string
  serviceTimeline?: {
    timeline?: {
      updation?: {
        requestBy?: string
        timetobe?: number
      }
    }
  }
  serviceFlow?: Record<string, { order?: number }>
}

export async function fetchPendingTimelineRequests(): Promise<
  PendingTimelineRequestItem[]
> {
  const response = await apiClient.get<{
    data?: PendingTimelineRequestItem[]
  }>('/api/service/timeline/pending', {
    headers: getAdminUsernameHeader(),
  })
  return Array.isArray(response.data?.data) ? response.data.data : []
}

export async function decideTimelineRequest(params: {
  serviceId: string
  action: 'APPROVE' | 'REJECT'
}): Promise<unknown> {
  const response = await apiClient.put(
    `/api/service/${params.serviceId}/timeline/decision`,
    null,
    {
      headers: getAdminUsernameHeader(),
      params: { action: params.action },
    },
  )
  return response.data
}

export interface AdminServiceFlowItem {
  departmentServiceId: string
  departmentServiceName: string
  departmentType: string
  serviceTimeline?: {
    timeline?: {
      time?: number
      createdAt?: string
      updatedAt?: string
      updation?: {
        timetobe?: number
        approvedBy?: string | null
        requestBy?: string
        status?: string
      }
    }
  }
  serviceFlow?: Record<string, { order?: number }>
}

export async function fetchAdminServiceFlows(params?: {
  departmentType?: string
  serviceName?: string
  page?: number
  size?: number
}): Promise<AdminServiceFlowItem[]> {
  const query = new URLSearchParams({
    page: String(params?.page ?? 0),
    size: String(params?.size ?? 100),
  })
  if (params?.departmentType && params.departmentType !== 'ALL') {
    query.append('departmentType', params.departmentType)
  }
  if (params?.serviceName?.trim()) {
    query.append('serviceName', params.serviceName.trim())
  }
  const response = await apiClient.get<{
    data?: AdminServiceFlowItem[]
  }>(`/api/service/flows?${query.toString()}`, {
    headers: getAdminUsernameHeader(),
  })
  return Array.isArray(response.data?.data) ? response.data.data : []
}

/**
 * SuperAdmin directly sets/updates a timeline for ANY department service.
 * Applies immediately as APPROVED in database.
 */
export async function updateAdminServiceTimeline(params: {
  serviceId: string
  time: number
}): Promise<unknown> {
  const response = await apiClient.put(
    `/api/service/${encodeURIComponent(params.serviceId)}/timeline?time=${encodeURIComponent(String(params.time))}`,
    null,
    {
      headers: getAdminUsernameHeader(),
    },
  )
  return response.data
}

