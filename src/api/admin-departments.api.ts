import { authedApiRequest } from './client'

/**
 * One row of `GET /api/auth/admin/departments`
 * (SUPERADMIN-only, `username` header carries the requester).
 */
export interface AdminDepartmentUser {
  departmentId?: string
  username: string
  email: string
  contact?: string
  departmentType?: string
  role?: string
  isHead?: boolean
  headUser?: string
  createdAt?: string
}

export interface AdminDepartmentsParams {
  page?: number
  size?: number
  /** true → heads only, false → non-heads only, omit → everyone. */
  isHead?: boolean
  searchTerm?: string
  departmentType?: string
}

export interface AdminDepartmentsPage {
  data: AdminDepartmentUser[]
  totalElements: number
  totalPage: number
  pageNumber: number
  elementSize: number
}

interface AdminDepartmentsRaw {
  data?: AdminDepartmentUser[]
  totalElements?: number
  totalPage?: number
  pageNumber?: number
  elementSize?: number
  success?: boolean
  message?: string
}

/**
 * Paginated department users for the admin console.
 * The backend reads the requesting admin from the `username`
 * header (sent automatically by `authedApiRequest`) and
 * rejects non-SUPERADMIN callers with 403.
 */
export async function getAdminDepartments(
  params: AdminDepartmentsParams = {},
): Promise<AdminDepartmentsPage> {
  const search = new URLSearchParams()

  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? 10))

  if (params.isHead !== undefined) {
    search.set('isHead', String(params.isHead))
  }

  if (params.searchTerm) {
    search.set('searchTerm', params.searchTerm)
  }

  if (params.departmentType) {
    search.set('departmentType', params.departmentType)
  }

  const res = await authedApiRequest<AdminDepartmentsRaw>(
    `/api/auth/admin/departments?${search.toString()}`,
  )

  const items = Array.isArray(res?.data) ? res.data : []

  return {
    data: items,
    totalElements: res?.totalElements ?? items.length,
    totalPage: res?.totalPage ?? 1,
    pageNumber: res?.pageNumber ?? 0,
    elementSize: res?.elementSize ?? 10,
  }
}
