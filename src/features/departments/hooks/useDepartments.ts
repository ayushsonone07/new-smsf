import { useQuery } from '@tanstack/react-query'
import { getDepartments } from '../../../api/departments.api'
import type { Department } from '../types/department.types'

export const departmentsQueryKey = [
  'departments',
] as const

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: departmentsQueryKey,
    queryFn: () => getDepartments(),
  })
}
