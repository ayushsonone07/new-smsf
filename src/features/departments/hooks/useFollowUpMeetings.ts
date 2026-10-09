import { useQuery } from '@tanstack/react-query'
import {
  getFollowUpRecentMeetings,
  getFollowUpDueMeetings,
  type FollowUpQueryParams,
  type CustomerFollowUpItem,
} from '../../../api/meetings.api'

export function useFollowUpRecentMeetings(params: FollowUpQueryParams = {}) {
  return useQuery<{
    data: CustomerFollowUpItem[]
    totalElements: number
    totalPage: number
  }>({
    queryKey: ['follow-up-recent', params],
    queryFn: () => getFollowUpRecentMeetings(params),
    staleTime: 30_000,
  })
}

export function useFollowUpDueMeetings(params: FollowUpQueryParams = {}) {
  return useQuery<{
    data: CustomerFollowUpItem[]
    totalElements: number
    totalPage: number
  }>({
    queryKey: ['follow-up-due', params],
    queryFn: () => getFollowUpDueMeetings(params),
    staleTime: 30_000,
  })
}

export function useFollowUpMeetingCounts(baseParams: FollowUpQueryParams = {}) {
  const recentQuery = useQuery({
    queryKey: ['follow-up-recent-count', baseParams],
    queryFn: () =>
      getFollowUpRecentMeetings({ ...baseParams, page: 0, size: 1, days: 15 }),
    staleTime: 30_000,
  })

  const dueQuery = useQuery({
    queryKey: ['follow-up-due-count', baseParams],
    queryFn: () =>
      getFollowUpDueMeetings({ ...baseParams, page: 0, size: 1 }),
    staleTime: 30_000,
  })

  return {
    doneCount: recentQuery.data?.totalElements ?? 0,
    notDoneCount: dueQuery.data?.totalElements ?? 0,
    isLoading: recentQuery.isLoading || dueQuery.isLoading,
    refetch: () => {
      recentQuery.refetch()
      dueQuery.refetch()
    },
  }
}

