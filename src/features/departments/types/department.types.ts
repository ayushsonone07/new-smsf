export type DepartmentStatus = 'ACTIVE' | 'INACTIVE'

export const DEPARTMENT_TYPES = [
  'Onboarding',
  'Sales',
  'Support',
  'Finance',
  'Operations',
  'Other',
] as const

export type DepartmentType = string

export interface Department {
  id: string
  name: string
  type?: DepartmentType
  username: string
  email: string
  contact?: string
  status: DepartmentStatus
  createdAt: string
  role?: string
}

export interface CreateDepartmentRequest {
  name: string
  type?: DepartmentType
  departmentType?: string
  username: string
  email: string
  password: string
  contact?: string
  initialRoutes?: string[]
}

export interface UpdateDepartmentRequest {
  name: string
  type?: DepartmentType
  departmentType?: string
  username: string
  oldEmail?: string
  email: string
  password?: string
  contact?: string
}