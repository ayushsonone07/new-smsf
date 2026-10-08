import { useMutation } from '@tanstack/react-query'
import { loginWithCredentials } from '../../../api/auth.api'
import type { AuthSession } from '../types/auth.types'

interface LoginCredentials {
  email: string
  password: string
}

export function useLoginWithCredentials() {
  return useMutation({
    mutationFn: ({
      email,
      password,
    }: LoginCredentials): Promise<AuthSession> =>
      loginWithCredentials(email, password),
  })
}
