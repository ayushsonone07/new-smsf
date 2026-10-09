export type DepartmentStatus = 'ACTIVE' | 'INACTIVE'

export const DEPARTMENT_TYPES = [
  'Onboarding',
  'Sales',
  'Support',
  'Finance',
  'Operations',
  'Other',
] as const

export type DepartmentType = (typeof DEPARTMENT_TYPES)[number]

export interface Department {
  id: string
  name: string
  type?: DepartmentType
  username: string
  email: string
  status: DepartmentStatus
  createdAt: string
}

export interface CreateDepartmentRequest {
  name: string
  type?: DepartmentType
  username: string
  email: string
  password: string
}

export interface UpdateDepartmentRequest {
  name: string
  type?: DepartmentType
  username: string
  email: string
}