import { useQuery } from '@tanstack/react-query'
import {
  getTaskHistory,
  getDepartmentUsersAnalytics,
  type TaskHistoryParams,
  type DepartmentUsersAnalyticsParams,
} from '../../../api/history.api'

export function useTaskHistory(params: TaskHistoryParams = {}) {
  return useQuery({
    queryKey: ['task-history', params],
    queryFn: () => getTaskHistory(params),
    staleTime: 30_000,
  })
}

export function useDepartmentUsersAnalytics(
  params: DepartmentUsersAnalyticsParams = {},
) {
  return useQuery({
    queryKey: ['department-users-analytics', params],
    queryFn: () => getDepartmentUsersAnalytics(params),
    staleTime: 30_000,
  })
}

