import { authedApiRequest } from './client'

export const FALLBACK_DEPARTMENT_TYPES = [
  'SMO_DEPARTMENT',
  'GOOGLE_DEPARTMENT',
  'AUTOMATION_DEPARTMENT',
  'DELIVERY_DEPARTMENT',
  'ONBOARDING_DEPARTMENT',
  'SERVICE_EXPIRATION_DEPARTMENT',
  'SUPPORT_DEPARTMENT',
  'WEBSITE_DEPARTMENT',
  'SALES_DEPARTMENT',
  'TELESALES_DEPARTMENT',
  'MARKETING_DEPARTMENT',
  'SEO_DEPARTMENT',
  'BILLING_DEPARTMENT',
  'AUTOWEBSION_DEPARTMENT',
  'HR_DEPARTMENT',
  'SERVICE_DELIVERY_DEPARTMENT',
  'ADVERTISEMENT_DEPARTMENT',
  'RECURRING_DEPARTMENT',
] as const

export type DepartmentType = (typeof FALLBACK_DEPARTMENT_TYPES)[number]

export interface CreateDynamicRoutePayload {
  departmentType: string
  routeName: string
}

export interface DynamicRouteResponse {
  routeId: string
  routeName: string
  departmentType: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateDynamicColumnPayload {
  departmentType: string
  columnName: string
  readWriteAccess?: '1' | '2' | '12'
}

export interface DynamicColumnResponse {
  columnId: string
  columnName: string
  departmentType: string
  readWriteAccess?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Fetch all department enum types from DepartmentType.java via backend
 */
export async function getDepartmentTypes(): Promise<string[]> {
  try {
    const res = await authedApiRequest<string[] | { data: string[] }>(
      '/api/dynamic-permission/departments',
    )
    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.data)) return res.data
    return Array.from(FALLBACK_DEPARTMENT_TYPES)
  } catch (err) {
    console.warn('Falling back to local department types enum:', err)
    return Array.from(FALLBACK_DEPARTMENT_TYPES)
  }
}

/**
 * Create a route in access_routes and link to department
 */
export async function createDynamicRoute(
  payload: CreateDynamicRoutePayload,
): Promise<DynamicRouteResponse> {
  const res = await authedApiRequest<
    DynamicRouteResponse | { data: DynamicRouteResponse }
  >('/api/dynamic-permission/routes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if ('data' in res && res.data) {
    return res.data
  }
  return res as DynamicRouteResponse
}

/**
 * Get all routes from access_routes
 */
export async function getDynamicRoutes(): Promise<DynamicRouteResponse[]> {
  const res = await authedApiRequest<
    DynamicRouteResponse[] | { data: DynamicRouteResponse[] }
  >('/api/dynamic-permission/routes')
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.data)) return res.data
  return []
}

/**
 * Create a column in access_customer_columns and link to department
 */
export async function createDynamicColumn(
  payload: CreateDynamicColumnPayload,
): Promise<DynamicColumnResponse> {
  const res = await authedApiRequest<
    DynamicColumnResponse | { data: DynamicColumnResponse }
  >('/api/dynamic-permission/columns', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if ('data' in res && res.data) {
    return res.data
  }
  return res as DynamicColumnResponse
}

/**
 * Get all columns from access_customer_columns
 */
export async function getDynamicColumns(): Promise<DynamicColumnResponse[]> {
  const res = await authedApiRequest<
    DynamicColumnResponse[] | { data: DynamicColumnResponse[] }
  >('/api/dynamic-permission/columns')
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.data)) return res.data
  return []
}
