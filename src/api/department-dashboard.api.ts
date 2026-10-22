import type { DepartmentDashboard } from '../features/departments/types/dashboard.types'

export async function getDepartmentDashboard(
  departmentId: string,
): Promise<DepartmentDashboard> {
  return {
    departmentId,
    stats: {
      totalCustomers: 0,
      activeCustomers: 0,
      openTickets: 0,
      activeServices: 0,
    },
    activity: [],
  }
}
