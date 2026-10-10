import { authedApiRequest } from './client'

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

