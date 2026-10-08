import {
  delay,
  departments,
  nextDepartmentId,
  persistMockDb,
  removeFeaturePermissions,
  seedFeaturePermissions,
} from './mock/db'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../features/departments/types/department.types'

export async function getDepartments(): Promise<
  Department[]
> {
  await delay()

  return structuredClone(departments)
}

export async function createDepartment(
  data: CreateDepartmentRequest,
): Promise<Department> {
  await delay()

  const department: Department = {
    id: nextDepartmentId(),
    name: data.name,
    type: data.type,
    username: data.username,
    email: data.email,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  }

  departments.push(department)
  seedFeaturePermissions(department.id)
  persistMockDb()

  return structuredClone(department)
}

export async function updateDepartment(
  id: string,
  data: UpdateDepartmentRequest,
): Promise<Department> {
  await delay()

  const department = departments.find(
    (item) => item.id === id,
  )

  if (!department) {
    throw new Error('Department not found')
  }

  Object.assign(department, data)
  persistMockDb()

  return structuredClone(department)
}

export async function deleteDepartment(
  id: string,
): Promise<void> {
  await delay()

  const index = departments.findIndex(
    (item) => item.id === id,
  )

  if (index === -1) {
    throw new Error('Department not found')
  }

  departments.splice(index, 1)
  removeFeaturePermissions(id)
  persistMockDb()
}
