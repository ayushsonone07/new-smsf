import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { issueLoginToken } from '../../../api/auth.api'
import { issuedTokensQueryKey } from './useIssuedTokens'
import type { IssuedLoginToken } from '../types/auth.types'

export function useIssueLoginToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      targetUserId,
      issuedBy,
    }: {
      targetUserId: string
      issuedBy: string
    }): Promise<IssuedLoginToken> =>
      issueLoginToken(targetUserId, issuedBy),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: issuedTokensQueryKey,
      })
    },
  })
}
