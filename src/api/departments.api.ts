import { apiRequest } from './client'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../features/departments/types/department.types'

export async function getDepartments(): Promise<Department[]> {
  return apiRequest<Department[]>('/departments')
}

export async function createDepartment(
  data: CreateDepartmentRequest,
): Promise<Department> {
  return apiRequest<Department>('/departments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDepartment(
  id: string,
  data: UpdateDepartmentRequest,
): Promise<Department> {
  return apiRequest<Department>(`/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteDepartment(
  id: string,
): Promise<void> {
  return apiRequest<void>(`/departments/${id}`, {
    method: 'DELETE',
  })
}