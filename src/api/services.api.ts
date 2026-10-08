import { delay, services } from './mock/db'
import type { Service } from '../features/departments/types/service.types'

export async function getServices(
  departmentId: string,
): Promise<Service[]> {
  await delay()

  return structuredClone(
    services.filter(
      (service) =>
        service.departmentId === departmentId,
    ),
  )
}
