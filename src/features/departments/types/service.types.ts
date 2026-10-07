export type ServiceStatus = 'AVAILABLE' | 'UNAVAILABLE'

export interface Service {
  id: string
  departmentId: string
  name: string
  description: string
  category: string
  status: ServiceStatus
}
