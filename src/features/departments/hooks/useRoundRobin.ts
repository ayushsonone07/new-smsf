import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSession } from '../../../app/auth/session'
import {
  getRoundRobinStatus,
  updateRoundRobinStatus,
} from '../../../api/round-robin.api'

export const roundRobinStatusQueryKey = (departmentType: string) =>
  ['round-robin-status', departmentType] as const

/**
 * Round-robin auto-distribution status for a department.
 * HEAD-only — department users never see the toggle.
 */
export function useRoundRobinStatus(
  departmentType: string,
  options?: { enabled?: boolean },
) {
  const session = getSession()
  const isHead = session?.user?.role !== 'USER'

  return useQuery({
    queryKey: roundRobinStatusQueryKey(departmentType),
    queryFn: () => getRoundRobinStatus(departmentType),
    enabled:
      (options?.enabled ?? true) && isHead && Boolean(departmentType),
    staleTime: 30_000,
  })
}

export function useUpdateRoundRobinStatus(departmentType: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (enabled: boolean) =>
      updateRoundRobinStatus(departmentType, enabled),
    onMutate: async (enabled) => {
      const queryKey = roundRobinStatusQueryKey(departmentType)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<boolean>(queryKey)
      queryClient.setQueryData(queryKey, enabled)
      return { previous }
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          roundRobinStatusQueryKey(departmentType),
          context.previous,
        )
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: roundRobinStatusQueryKey(departmentType),
      })
    },
  })
}
