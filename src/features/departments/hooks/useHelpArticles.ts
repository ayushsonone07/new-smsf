import { useQuery } from '@tanstack/react-query'
import { getHelpArticles } from '../../../api/help-center.api'

export const helpArticlesQueryKey = (
  departmentId: string,
) =>
  ['help-articles', departmentId] as const

export function useHelpArticles(
  departmentId: string,
) {
  return useQuery({
    queryKey: helpArticlesQueryKey(departmentId),
    queryFn: () =>
      getHelpArticles(departmentId),
    enabled: Boolean(departmentId),
  })
}
