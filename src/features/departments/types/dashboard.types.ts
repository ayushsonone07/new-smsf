export interface DepartmentDashboardStats {
  totalCustomers: number
  activeCustomers: number
  openTickets: number
  activeServices: number
}

export interface ActivityItem {
  id: string
  title: string
  description: string
  time: string
}

export interface DepartmentDashboard {
  departmentId: string
  stats: DepartmentDashboardStats
  activity: ActivityItem[]
}
