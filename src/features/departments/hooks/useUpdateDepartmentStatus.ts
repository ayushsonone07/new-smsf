import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateDepartmentStatus } from '../../../api/departments.api'
import { departmentsQueryKey } from './useDepartments'

export function useUpdateDepartmentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ departmentType, active }: { departmentType: string; active: boolean }) =>
      updateDepartmentStatus(departmentType, active),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: departmentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['department-service-statuses'] }),
      ])
    },
  })
}
