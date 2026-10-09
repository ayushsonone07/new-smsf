import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { revokeLoginToken } from '../../../api/auth.api'
import { issuedTokensQueryKey } from './useIssuedTokens'

export function useRevokeLoginToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token: string): Promise<void> =>
      revokeLoginToken(token),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: issuedTokensQueryKey,
      })
    },
  })
}
