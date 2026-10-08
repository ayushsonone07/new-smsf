import {
  delay,
  getDepartmentDashboardData,
} from './mock/db'
import type { DepartmentDashboard } from '../features/departments/types/dashboard.types'

export async function getDepartmentDashboard(
  departmentId: string,
): Promise<DepartmentDashboard> {
  await delay()

  return structuredClone(
    getDepartmentDashboardData(departmentId),
  )
}
