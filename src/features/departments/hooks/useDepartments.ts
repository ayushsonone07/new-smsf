import { useQuery } from '@tanstack/react-query'
import { getDepartments } from '../../../api/departments.api'

export const departmentsQueryKey = [
  'departments',
] as const

export function useDepartments() {
  return useQuery({
    queryKey: departmentsQueryKey,
    queryFn: getDepartments,
  })
}
