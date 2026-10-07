import { redirect } from '@tanstack/react-router'
import { getSession } from '../auth/session'
import type {
  UserRole,
} from '../../features/auth/types/auth.types'

export function requireAuth(): void {
  const session = getSession()

  if (!session) {
    throw redirect({ to: '/login' })
  }
}

export function requireRole(
  ...roles: UserRole[]
): () => void {
  return function roleGuard(): void {
    const session = getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    if (!roles.includes(session.user.role)) {
      throw redirect({ to: '/forbidden' })
    }
  }
}
