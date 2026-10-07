import { useMutation } from '@tanstack/react-query'
import { loginWithToken } from '../../../api/auth.api'
import type { AuthSession } from '../types/auth.types'

export function useLoginWithToken() {
  return useMutation({
    mutationFn: (
      token: string,
    ): Promise<AuthSession> =>
      loginWithToken(token),
  })
}
