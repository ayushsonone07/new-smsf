export type DepartmentStatus = 'ACTIVE' | 'INACTIVE'

export interface Department {
  id: string
  name: string
  username: string
  email: string
  status: DepartmentStatus
  createdAt: string
}

export interface CreateDepartmentRequest {
  name: string
  username: string
  email: string
  password: string
}

export interface UpdateDepartmentRequest {
  name: string
  username: string
  email: string
}