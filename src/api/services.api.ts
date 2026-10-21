import { authedApiRequest } from './client'
import { getSession } from '../app/auth/session'
import type { Service } from '../features/departments/types/service.types'

interface DepartmentServiceEntity {
  departmentServiceId: number
  departmentServiceName: string
  departmentType: string
  remarks: string | null
  isServiceActive: boolean
  createdAt: string
}

interface ServiceFetchResponse {
  data: DepartmentServiceEntity[]
}

export async function getServices(
  departmentId: string,
): Promise<Service[]> {
  const session = getSession()
  const username = session?.user?.email || session?.user?.username || ''

  const res = await authedApiRequest<ServiceFetchResponse>(
    '/api/service/fetch?page=0&size=100',
    { headers: { username } },
  )

  const rows = res?.data ?? []

  return rows.map((row) => ({
    id: String(row.departmentServiceId),
    departmentId,
    name: row.departmentServiceName,
    description: row.remarks ?? '',
    category: row.departmentType,
    status: row.isServiceActive ? 'AVAILABLE' : 'UNAVAILABLE',
  }))
}
