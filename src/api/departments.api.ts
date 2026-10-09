import { authedApiRequest } from './client'
import type { Department, CreateDepartmentRequest, UpdateDepartmentRequest } from '../features/departments/types/department.types'

interface BackendDepartmentUserDTO {
  departmentId: string
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

function mapBackendToDepartment(dto: BackendDepartmentUserDTO): Department {
  return {
    id: dto.departmentId,
    name: dto.username,
    type: dto.departmentType as Department['type'],
    username: dto.username,
    email: dto.email,
    status: dto.isHead ? 'ACTIVE' : 'ACTIVE',
    createdAt: dto.createdAt || new Date().toISOString(),
    role: dto.role,
  }
}

export async function getDepartments(params: GetDepartmentsParams = {}): Promise<Department[]> {
  // Default to isHead=true to only fetch department heads from backend
  const searchParams = new URLSearchParams()
  if (params.searchTerm) searchParams.set('searchTerm', params.searchTerm)
  if (params.departmentType) searchParams.set('departmentType', params.departmentType)
  if (params.departmentTypes?.length) params.departmentTypes.forEach(t => searchParams.append('departmentTypes', t))
  // Default to true to only get department heads
  if (params.isHead !== undefined) {
    searchParams.set('isHead', String(params.isHead))
  } else {
    searchParams.set('isHead', 'true')
  }
  if (params.headUser) searchParams.set('headUser', params.headUser)
  if (params.page !== undefined) searchParams.set('page', String(params.page))
  if (params.size !== undefined) searchParams.set('size', String(params.size))
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.sortDirection) searchParams.set('sortDirection', params.sortDirection)

  const queryString = searchParams.toString()
  const endpoint = `/api/auth/admin/departments${queryString ? `?${queryString}` : ''}`

  const response = await authedApiRequest<CustomPageResponse<BackendDepartmentUserDTO>>(endpoint)

  if (!response.success || !response.data) {
    return []
  }

  return response.data.map(mapBackendToDepartment)
}

export async function createDepartment(
  data: CreateDepartmentRequest,
): Promise<Department> {
  const response = await authedApiRequest<CustomPageResponse<BackendDepartmentUserDTO>>(
    '/api/auth/admin/departments',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )

  if (!response.success || !response.data?.[0]) {
    throw new Error(response.message || 'Failed to create department')
  }

  return mapBackendToDepartment(response.data[0])
}

export async function updateDepartment(
  id: string,
  data: UpdateDepartmentRequest,
): Promise<Department> {
  const response = await authedApiRequest<CustomPageResponse<BackendDepartmentUserDTO>>(
    `/api/auth/admin/departments/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  )

  if (!response.success || !response.data?.[0]) {
    throw new Error(response.message || 'Failed to update department')
  }

  return mapBackendToDepartment(response.data[0])
}

export async function deleteDepartment(
  id: string,
): Promise<void> {
  await authedApiRequest(
    `/api/auth/admin/departments/${id}`,
    {
      method: 'DELETE',
    }
  )
}
