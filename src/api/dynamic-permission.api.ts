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
  departmentType?: string
  departmentId?: number
  enableHead?: boolean
  enableUser?: boolean
  visibility?: boolean
  assignedRoles?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateDynamicColumnPayload {
  departmentType: string
  columnName: string
  routesType?: string
  routeId?: string
  readWriteAccess?: '1' | '2' | '12'
}

export interface DynamicColumnResponse {
  columnId: string
  columnName: string
  departmentType?: string
  departmentId?: number
  routeId?: string
  routesType?: string
  routeName?: string
  readWriteAccess?: string
  roleAPermission?: string
  roleBPermission?: string
  enableHead?: boolean
  enableUser?: boolean
  visibility?: boolean
  isConfigured?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface DepartmentDetailsResponse {
  departmentType: string
  departmentId: number | null
  totalRoutes: number
  totalColumns: number
  routes: DynamicRouteResponse[]
  columns: DynamicColumnResponse[]
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
 * Get routes from access_routes (optionally filtered by departmentType)
 */
export async function getDynamicRoutes(
  departmentType?: string,
): Promise<DynamicRouteResponse[]> {
  try {
    const url = departmentType && departmentType !== 'ALL'
      ? `/api/dynamic-permission/routes?departmentType=${encodeURIComponent(departmentType)}`
      : '/api/dynamic-permission/routes'
    const res = await authedApiRequest<any>(url)
    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.data)) return res.data
    if (res && res.data && Array.isArray(res.data.data)) return res.data.data
    return []
  } catch (err) {
    console.error('Failed to fetch dynamic routes:', err)
    return []
  }
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
 * Get columns from access_customer_columns (optionally filtered with department role permissions)
 */
export async function getDynamicColumns(
  departmentType?: string,
): Promise<DynamicColumnResponse[]> {
  try {
    const url = departmentType && departmentType !== 'ALL'
      ? `/api/dynamic-permission/columns?departmentType=${encodeURIComponent(departmentType)}`
      : '/api/dynamic-permission/columns'
    const res = await authedApiRequest<any>(url)
    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.data)) return res.data
    if (res && res.data && Array.isArray(res.data.data)) return res.data.data
    return []
  } catch (err) {
    console.error('Failed to fetch dynamic columns:', err)
    return []
  }
}

/**
 * Get department details including ID, mapped routes count, and columns count
 */
export async function getDepartmentDetails(
  departmentType: string,
): Promise<DepartmentDetailsResponse | null> {
  try {
    const res = await authedApiRequest<any>(
      `/api/dynamic-permission/department-details?departmentType=${encodeURIComponent(departmentType)}`,
    )
    if (res && res.data) return res.data
    return res as DepartmentDetailsResponse
  } catch (err) {
    console.error('Failed to fetch department details:', err)
    return null
  }
}

export interface UpdateColumnPermissionPayload {
  columnId?: string
  columnName?: string
  roleName: string
  departmentType: string
  readWriteAccess: '1' | '2' | '12' | 'CAN_READ' | 'CAN_EDIT'
  assignedRoles?: string[]
}

export interface ColumnPermissionUpdateResponse {
  columnId: string
  columnName: string
  roleName: string
  departmentId: number | string
  departmentType: string
  readWriteAccess: string
  assignedRoles?: string[]
}

/**
 * Update read/write permission for a specific (role, department, column)
 * in the database (access_controls table).
 */
export async function updateColumnPermission(
  payload: UpdateColumnPermissionPayload,
): Promise<ColumnPermissionUpdateResponse> {
  const res = await authedApiRequest<
    ColumnPermissionUpdateResponse | { data: ColumnPermissionUpdateResponse }
  >('/api/dynamic-permission/columns/permission', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (res && 'data' in res && res.data) {
    return res.data
  }
  return res as ColumnPermissionUpdateResponse
}

export interface UpdateColumnStatusPayload {
  columnId?: string
  columnName?: string
  roleName: string
  departmentType: string
  enable?: boolean
  visibility?: boolean
}

export interface ColumnStatusUpdateResponse {
  columnId: string
  columnName: string
  roleName: string
  departmentId: number | string
  departmentType: string
  enable?: boolean
  disable?: boolean
  visibility?: boolean
  assignedRoles?: string[]
}

/**
 * Update enable/disable status for a column for a specific role and department
 */
export async function updateColumnStatus(
  payload: UpdateColumnStatusPayload,
): Promise<ColumnStatusUpdateResponse> {
  const res = await authedApiRequest<
    ColumnStatusUpdateResponse | { data: ColumnStatusUpdateResponse }
  >('/api/dynamic-permission/columns/status', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (res && 'data' in res && res.data) {
    return res.data
  }
  return res as ColumnStatusUpdateResponse
}

export interface UpdateRouteStatusPayload {
  routeId?: string
  routeName?: string
  roleName: string
  departmentType: string
  enable?: boolean
  visibility?: boolean
}

export interface RouteStatusUpdateResponse {
  routeId: string
  routeName: string
  roleName: string
  departmentId: number | string
  departmentType: string
  enable?: boolean
  disable?: boolean
  visibility?: boolean
  assignedRoles?: string[]
}

/**
 * Update enable/disable status for a route for a specific role and department
 */
export async function updateRouteStatus(
  payload: UpdateRouteStatusPayload,
): Promise<RouteStatusUpdateResponse> {
  const res = await authedApiRequest<
    RouteStatusUpdateResponse | { data: RouteStatusUpdateResponse }
  >('/api/dynamic-permission/routes/status', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (res && 'data' in res && res.data) {
    return res.data
  }
  return res as RouteStatusUpdateResponse
}

export interface UserDynamicPermissionsResponse {
  username: string
  roleName: string
  departmentType: string
  departmentId: number
  totalRoutes: number
  totalColumns: number
  routes: Array<{
    routeId: string
    routeName: string
  }>
  columnPermissions: Array<{
    columnId: string
    columnName: string
    readWriteAccess: string
    canRead: boolean
    canEdit: boolean
    enabled?: boolean
    visibility?: boolean
  }>
}

/**
 * Get all allowed routes and column permissions based on username and departmentType
 */
export async function getUserDynamicPermissions(params?: {
  username?: string
  departmentType?: string
}): Promise<UserDynamicPermissionsResponse | null> {
  try {
    const query = new URLSearchParams()
    if (params?.username) query.append('username', params.username)
    if (params?.departmentType) query.append('departmentType', params.departmentType)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await authedApiRequest<any>(
      `/api/dynamic-permission/user-permissions${queryString}`,
    )
    if (res && res.data) return res.data
    return res as UserDynamicPermissionsResponse
  } catch (err) {
    console.error('Failed to fetch user dynamic permissions:', err)
    return null
  }
}
