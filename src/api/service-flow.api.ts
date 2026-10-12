import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'

export interface ServiceFlowStepData {
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface ServiceFlowItem {
  departmentServiceId: string | number
  departmentServiceName: string
  departmentType: string
  serviceFlow: Record<string, ServiceFlowStepData>
  serviceTimeline?: Record<string, unknown>
}

export interface ServiceFlowPageResponse {
  data: ServiceFlowItem[]
  pageNumber: number
  elementSize: number
  totalElements: number
  totalPage: number
}

export async function getServiceFlows(params: {
  page?: number
  size?: number
  serviceName?: string
} = {}): Promise<ServiceFlowPageResponse> {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? 10))
  if (params.serviceName) search.set('serviceName', params.serviceName)

  const res = await authedApiRequest<{
    data?: ServiceFlowItem[]
    pageNumber?: number
    elementSize?: number
    totalElements?: number
    totalPage?: number
  }>(`/api/service/flows?${search.toString()}`)

  return {
    data: res.data ?? [],
    pageNumber: res.pageNumber ?? 0,
    elementSize: res.elementSize ?? 10,
    totalElements: res.totalElements ?? (res.data?.length ?? 0),
    totalPage: res.totalPage ?? 1,
  }
}

export interface DepartmentConfigData {
  departmentType: string
  configs?: Record<string, unknown>
  [key: string]: unknown
}

export async function getDepartmentConfig(
  departmentType = 'GOOGLE_DEPARTMENT',
): Promise<DepartmentConfigData> {
  const res = await authedApiRequest<
    { data?: DepartmentConfigData } & DepartmentConfigData
  >(`/api/dept-config/${departmentType}`)

  return (res?.data ?? res) as DepartmentConfigData
}

export async function getCustomerServiceFlow(
  customerId: string | number,
): Promise<any> {
  const res = await authedApiRequest<any>(
    `/api/auth/department/customer/${customerId}/service-flow`,
  )
  return res?.data ?? res
}

export interface DepartmentSpecialServiceDataDTO {
  customerId: number
  departmentType: string
  serviceType?: string
  specialServiceData: Record<string, any>
  updatedAt?: string
}

export async function getDepartmentSpecialData(
  customerId: string | number,
  departmentType = 'GOOGLE_DEPARTMENT',
): Promise<DepartmentSpecialServiceDataDTO | null> {
  const search = new URLSearchParams({
    customerId: String(customerId),
    departmentType,
  })
  const res = await authedApiRequest<any>(
    `/api/service/special-data/department?${search.toString()}`,
  )
  return (res?.data ?? res) as DepartmentSpecialServiceDataDTO
}

export async function updateDepartmentSpecialData(
  customerId: string | number,
  data: Record<string, unknown>,
  departmentType = 'GOOGLE_DEPARTMENT',
): Promise<any> {
  const search = new URLSearchParams({
    customerId: String(customerId),
    departmentType,
  })
  return authedApiRequest<any>(
    `/api/service/special-data/department?${search.toString()}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  )
}

export async function updateServiceFlow(
  serviceId: string | number,
  flowDto: { flow: Record<string, { order: number; createdAt?: string; updatedAt?: string }> },
): Promise<any> {
  const res = await authedApiRequest<any>(`/api/service/${serviceId}/flow`, {
    method: 'PUT',
    body: JSON.stringify(flowDto),
  })
  return res?.data ?? res
}

export async function updateDepartmentConfig(
  departmentType = 'GOOGLE_DEPARTMENT',
  payload: { triggersJson?: string; configsJson?: string; [key: string]: any },
): Promise<any> {
  const res = await authedApiRequest<any>(`/api/dept-config/${departmentType}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return res?.data ?? res
}

export interface DepartmentUserSummary {
  totalCustomers: number
  totalServices: number
  followUps: number
  pendingServices: number
  inProgressServices: number
  completedServices: number
  cancelledServices: number
  target: number
  dailyCompletedServices?: Array<{
    date: string
    completedCount: number
  }>
  presentUsers?: number
  absentUsers?: number
  automationStats?: any
  websiteStats?: any
}

export async function getDepartmentSummary(params?: {
  startDate?: string
  endDate?: string
}): Promise<DepartmentUserSummary> {
  const query = new URLSearchParams()
  if (params?.startDate) query.set('startDate', params.startDate)
  if (params?.endDate) query.set('endDate', params.endDate)
  const qs = query.toString() ? `?${query.toString()}` : ''

  const res = await authedApiRequest<any>(`/api/auth/department/summary${qs}`)
  return (res?.data ?? res) as DepartmentUserSummary
}

export async function editServiceTag(params: {
  operation: 'add' | 'remove'
  customerId: string | number
  serviceType: string
  tagName: string
  description?: string
  timestamp?: string
}): Promise<any> {
  const { operation, customerId, serviceType, tagName, description, timestamp } = params
  const res = await authedApiRequest<any>(
    `/api/auth/edit/tags?operation=${operation}`,
    {
      method: 'POST',
      body: JSON.stringify({
        customerId: String(customerId),
        serviceType,
        tagName,
        description: description || '',
        timestamp: timestamp || new Date().toISOString(),
      }),
    },
  )
  return res?.data ?? res
}

export async function updateCustomerSubServiceStatus(params: {
  customerId: string | number
  departmentType?: string
  subServiceName: string
  newStatus: string
}): Promise<any> {
  const { customerId, departmentType = 'GOOGLE_DEPARTMENT', subServiceName, newStatus } = params
  const res = await authedApiRequest<any>(
    `/api/auth/${customerId}/${departmentType}/sub-service/update`,
    {
      method: 'PUT',
      body: JSON.stringify({
        subServiceName,
        newStatus,
      }),
    },
  )
  return res?.data ?? res
}

export async function updateServiceFlowStepStatus(params: {
  customerId: string | number
  subServiceName: string
  flowStepName: string
  status: string
}): Promise<any> {
  const { customerId, subServiceName, flowStepName, status } = params
  const res = await authedApiRequest<any>(
    `/api/service/service-flow/update`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        customerId: Number(customerId),
        subServiceName,
        flowStepName,
        status,
      }),
    },
  )
  return res?.data ?? res
}

export async function sendSubServiceConfirmationMail(params: {
  customerId: string | number
  subServiceName: string
  departmentType?: string
  duplicateCustomerId?: string
}): Promise<any> {
  const { customerId, subServiceName, departmentType = 'GOOGLE_DEPARTMENT', duplicateCustomerId } = params
  const res = await authedApiRequest<any>(
    `/api/service/service-flow/send-confirmation`,
    {
      method: 'POST',
      body: JSON.stringify({
        customerId: Number(customerId) || customerId,
        subServiceName,
        departmentType,
        ...(duplicateCustomerId ? { duplicateCustomerId } : {}),
      }),
    },
  )
  return res?.data ?? res
}

export interface UpdateDepartmentServiceStatusParams {
  customerId: string | number
  serviceType?: string
  newStatus: string
  oldStatus?: string
  departmentType?: string
  customerStatus?: string
}

export async function updateDepartmentServiceStatus(
  params: UpdateDepartmentServiceStatusParams,
): Promise<any> {
  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''
  const departmentType =
    params.departmentType ||
    session?.user?.departmentType ||
    'GOOGLE_DEPARTMENT'

  const newStatusStr = params.newStatus.toUpperCase().replace(/-/g, '_')
  const oldStatusStr = (params.oldStatus || 'PENDING').toUpperCase().replace(/-/g, '_')
  const serviceType = params.serviceType || 'GOOGLE SERVICE'

  const queryParams = new URLSearchParams()
  if (params.customerStatus) {
    queryParams.set('customerStatus', params.customerStatus)
  }
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : ''

  const requestBody = {
    customerId: Number(params.customerId) || params.customerId,
    serviceType,
    newStatus: newStatusStr,
    oldStatus: oldStatusStr,
    departmentType,
    username,
  }

  return authedApiRequest<any>(`/api/auth/update/service${qs}`, {
    method: 'POST',
    headers: {
      username,
    },
    body: JSON.stringify(requestBody),
  })
}

export function extractServiceTags(c: any): Record<string, string> {
  if (!c) return {}

  const parseTags = (raw: any): Record<string, string> => {
    if (!raw) return {}
    let val = raw
    if (typeof val === 'string') {
      try {
        val = JSON.parse(val)
      } catch {
        return { [val]: val }
      }
    }
    if (Array.isArray(val)) {
      const acc: Record<string, string> = {}
      val.forEach((item, idx) => {
        if (typeof item === 'string') {
          acc[`tag_${idx}`] = item
        } else if (item && typeof item === 'object') {
          const name = item.tagName || item.name || item.tag || item.value || Object.values(item)[0]
          if (name) acc[`tag_${idx}`] = String(name)
        }
      })
      return acc
    }
    if (val && typeof val === 'object') {
      const acc: Record<string, string> = {}
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined && v !== null && v !== '') {
          if (typeof v === 'object') {
            const name = (v as any).tagName || (v as any).name || (v as any).tag || (v as any).value || Object.values(v as any)[0]
            if (name) acc[k] = String(name)
          } else {
            acc[k] = String(v)
          }
        }
      }
      return acc
    }
    return {}
  }

  let tags = parseTags(c.serviceTags)

  // Merge tags from services array
  if (Array.isArray(c.services)) {
    for (const s of c.services) {
      const sTags = parseTags(s?.serviceTags)
      tags = { ...tags, ...sTags }
    }
  }

  // Merge tags from customerDetails
  if (c.customerDetails) {
    const cdTags = parseTags(c.customerDetails.serviceTags)
    tags = { ...tags, ...cdTags }
    if (Array.isArray(c.customerDetails.services)) {
      for (const s of c.customerDetails.services) {
        const sTags = parseTags(s?.serviceTags)
        tags = { ...tags, ...sTags }
      }
    }
  }

  // Fallbacks: serviceTag, tags
  if (c.serviceTag) {
    tags = { ...tags, ...parseTags(c.serviceTag) }
  }
  if (c.tags) {
    tags = { ...tags, ...parseTags(c.tags) }
  }

  return tags
}



