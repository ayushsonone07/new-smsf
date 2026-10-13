import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'
import {
  createColumnsForRoute,
  createDynamicDepartmentType,
  createDynamicRoute,
  getDynamicRoutes,
  normalizeDepartmentSlug,
  normalizeDepartmentTypeName,
} from './dynamic-permission.api'
import { isRouteMatch } from '../features/permissions/hooks/useDepartmentRoutePermissions'
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from '../features/departments/types/department.types'
import { DEFAULT_ROUTE_COLUMNS } from '../components/departments/DepartmentFormModal'

interface BackendDepartmentUserDTO {
  id?: string | number
  departmentId?: string | number
  username: string
  email: string
  password?: string
  contact?: string
  departmentType?: string
  role?: string
  isHead?: boolean
  headUser?: string
  calendlyLink?: string
  createdAt?: string
}

interface CustomPageResponse<T> {
  success: boolean
  message: string
  status: string
  data: T[]
  pageNumber: number
  elementSize: number
  totalElements: number
  isFirst: boolean
  isLast: boolean
  totalPage: number
  summary?: unknown
}

interface CustomApiResponse<T> {
  success?: boolean
  message?: string
  status?: string | number
  data?: T
}

interface GetDepartmentsParams {
  searchTerm?: string
  departmentType?: string
  departmentTypes?: string[]
  isHead?: boolean
  headUser?: string
  page?: number
  size?: number
  sortBy?: string
  sortDirection?: string
}

function getAdminUsername(): string {
  const session = getSession()
  return session?.user?.email || session?.user?.username || ''
}

function mapBackendToDepartment(dto: BackendDepartmentUserDTO): Department {
  return {
    id: String(dto.departmentId ?? dto.id ?? dto.email),
    name: dto.username || dto.email,
    type: dto.departmentType as Department['type'],
    username: dto.username,
    email: dto.email,
    contact: dto.contact,
    status: dto.isHead ? 'ACTIVE' : 'ACTIVE',
    createdAt: dto.createdAt || new Date().toISOString(),
    role: dto.role || 'DEPARTMENT_HEAD',
  }
}

export async function getDepartments(
  params: GetDepartmentsParams = {},
): Promise<Department[]> {
  // Default to isHead=true and size=100 so all department heads are returned
  const searchParams = new URLSearchParams()
  if (params.searchTerm) searchParams.set('searchTerm', params.searchTerm)
  if (params.departmentType)
    searchParams.set('departmentType', params.departmentType)
  if (params.departmentTypes?.length)
    params.departmentTypes.forEach((t) =>
      searchParams.append('departmentTypes', t),
    )
  if (params.isHead !== undefined) {
    searchParams.set('isHead', String(params.isHead))
  } else {
    searchParams.set('isHead', 'true')
  }
  if (params.headUser) searchParams.set('headUser', params.headUser)
  searchParams.set('page', String(params.page ?? 0))
  searchParams.set('size', String(params.size ?? 100))
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortDirection)
    searchParams.set('sortDirection', params.sortDirection)

  const queryString = searchParams.toString()
  const endpoint = `/api/auth/admin/departments${queryString ? `?${queryString}` : ''}`
  const adminUsername = getAdminUsername()

  const response = await authedApiRequest<
    CustomPageResponse<BackendDepartmentUserDTO>
  >(endpoint, {
    headers: adminUsername ? { username: adminUsername } : undefined,
  })

  if (!response.success || !response.data) {
    return []
  }

  return response.data.map(mapBackendToDepartment)
}

export async function createDepartment(
  data: CreateDepartmentRequest,
): Promise<Department> {
  const adminUsername = getAdminUsername()
  const rawDeptType =
    data.departmentType || data.type || data.name || 'ONBOARDING_DEPARTMENT'
  const departmentType = normalizeDepartmentTypeName(rawDeptType)

  // 1. Register the dynamic department type in SMSB (idempotent if it already exists)
  await createDynamicDepartmentType(departmentType)

  // 2. Register the Department Head user via POST /api/auth/department/register (matching SMSF)
  // Backend DTO limits: username 3-20, password 6-12. Fail fast with a clear
  // message instead of a bare 400 + transaction rollback.
  const username = (data.username || data.name).trim()
  const email = data.email.trim()
  if (username.length < 3 || username.length > 20) {
    throw new Error('Username must be between 3 and 20 characters.')
  }
  if (!data.password || data.password.length < 6 || data.password.length > 12) {
    throw new Error('Password must be 6 to 12 characters long.')
  }
  const contact = (data.contact || '9999999999').trim()
  if (contact.length < 10 || contact.length > 15) {
    throw new Error('Contact must be 10 to 15 characters long.')
  }
  const payload = {
    username,
    email,
    password: data.password,
    contact,
    departmentType,
    role: 'DEPARTMENT_HEAD',
    isHead: true,
    headUser: adminUsername,
  }

  const response = await authedApiRequest<
    CustomApiResponse<BackendDepartmentUserDTO> & BackendDepartmentUserDTO
  >('/api/auth/department/register', {
    method: 'POST',
    headers: adminUsername ? { username: adminUsername } : undefined,
    body: JSON.stringify(payload),
  })

  if (response && response.success === false) {
    throw new Error(response.message || 'Failed to create department')
  }

  // 3. Provision ONLY the selected initial environment routes in http://localhost:5173/{department_name}/{role}/{route} format
  if (Array.isArray(data.initialRoutes) && data.initialRoutes.length > 0) {
    try {
      const existingRoutes = await getDynamicRoutes(departmentType)
      const deptSlug = normalizeDepartmentSlug(data.name || departmentType)
      for (const routeSlug of data.initialRoutes) {
        const trimmed = routeSlug.trim()
        if (!trimmed) continue
        const formattedRouteName = `${deptSlug}/head/${trimmed}`
        let targetRoute = existingRoutes.find((r) =>
          isRouteMatch(r, formattedRouteName) ||
          isRouteMatch(r, trimmed) ||
          isRouteMatch(r, `${deptSlug}/${trimmed}`),
        )
        if (!targetRoute) {
          targetRoute = await createDynamicRoute({
            departmentType,
            routeName: formattedRouteName,
          })
        }

        // Provision columns for this particular route (from routeColumnsMap or defaults)
        const customCols =
          data.routeColumnsMap?.[trimmed] ||
          data.routeColumnsMap?.[formattedRouteName] ||
          DEFAULT_ROUTE_COLUMNS[trimmed] ||
          []

        if (targetRoute && customCols && customCols.length > 0) {
          try {
            await createColumnsForRoute({
              departmentType,
              routeId: targetRoute.routeId,
              routeName: targetRoute.routeName,
              columnNames: customCols,
            })
          } catch (colErr) {
            console.warn('Non-fatal warning auto-provisioning route columns:', colErr)
          }
        }
      }
    } catch (err) {
      console.warn('Non-fatal warning while provisioning initial routes:', err)
    }
  }

  const dto: BackendDepartmentUserDTO =
    response?.data && typeof response.data === 'object'
      ? response.data
      : {
          departmentId: response?.departmentId ?? payload.email,
          username: payload.username,
          email: payload.email,
          contact: payload.contact,
          departmentType: payload.departmentType,
          role: 'DEPARTMENT_HEAD',
          isHead: true,
        }

  return mapBackendToDepartment({
    ...dto,
    departmentType: dto.departmentType || departmentType,
    role: dto.role || 'DEPARTMENT_HEAD',
  })
}

export async function updateDepartment(
  id: string,
  data: UpdateDepartmentRequest,
): Promise<Department> {
  const adminUsername = getAdminUsername()
  const rawDeptType = data.departmentType || data.type
  const departmentType = rawDeptType
    ? normalizeDepartmentTypeName(rawDeptType)
    : undefined

  if (departmentType) {
    await createDynamicDepartmentType(departmentType)
  }

  const payload: Record<string, unknown> = {
    username: (data.oldEmail || data.email).trim(),
    newUsername: (data.username || data.name).trim(),
    email: data.email.trim(),
    role: 'DEPARTMENT_HEAD',
    isHead: true,
  }
  if (data.password && data.password.trim()) {
    payload.password = data.password.trim()
  }
  if (departmentType) {
    payload.departmentType = departmentType
  }

  const response = await authedApiRequest<
    CustomApiResponse<BackendDepartmentUserDTO>
  >('/api/auth/manage?action=update', {
    method: 'POST',
    headers: adminUsername ? { username: adminUsername } : undefined,
    body: JSON.stringify(payload),
  })

  if (response && response.success === false) {
    throw new Error(response.message || 'Failed to update department')
  }

  const dto = response?.data
  return mapBackendToDepartment(
    dto ?? {
      departmentId: id,
      username: data.username || data.name,
      email: data.email,
      departmentType,
      role: 'DEPARTMENT_HEAD',
      isHead: true,
    },
  )
}

export async function deleteDepartment(emailOrId: string): Promise<void> {
  const adminUsername = getAdminUsername()
  const response = await authedApiRequest<CustomApiResponse<unknown>>(
    '/api/auth/manage?action=delete',
    {
      method: 'POST',
      headers: adminUsername ? { username: adminUsername } : undefined,
      body: JSON.stringify({ username: emailOrId }),
    },
  )

  if (response && response.success === false) {
    throw new Error(response.message || 'Failed to delete department')
  }
}
