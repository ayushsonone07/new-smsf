import { useQuery } from '@tanstack/react-query'
import {
  getAdminDepartments,
  type AdminDepartmentsPage,
  type AdminDepartmentsParams,
} from '../../../api/admin-departments.api'

/** SUPERADMIN-only paginated department users. */
export function useAdminDepartments(
  params: AdminDepartmentsParams = {},
) {
  return useQuery<AdminDepartmentsPage>({
    queryKey: ['admin-departments', params],
    queryFn: () => getAdminDepartments(params),
    staleTime: 30_000,
  })
}
