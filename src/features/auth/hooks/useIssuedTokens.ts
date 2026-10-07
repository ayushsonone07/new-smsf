import { useQuery } from '@tanstack/react-query'
import { getIssuedTokens } from '../../../api/auth.api'

export const issuedTokensQueryKey = [
  'issued-tokens',
] as const

export function useIssuedTokens() {
  return useQuery({
    queryKey: issuedTokensQueryKey,
    queryFn: getIssuedTokens,
  })
}
