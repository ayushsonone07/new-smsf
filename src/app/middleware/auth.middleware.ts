import { redirect } from '@tanstack/react-router'
import {
  getSession,
  homeForRole,
} from '../auth/session'
import type {
  UserRole,
} from '../../features/auth/types/auth.types'

export function requireAuth(): void {
  const session = getSession()

  if (!session) {
    throw redirect({ to: '/login' })
  }
}

/**
 * Keeps authenticated users away from guest-only pages and sends
 * them to the dashboard owned by their persisted session role.
 */
export function redirectAuthenticatedUser(): void {
  const session = getSession()

  if (session) {
    throw redirect({ to: homeForRole(session.user.role) })
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

/**
 * Role guard for dashboard roots. A signed-in user who opens a
 * dashboard belonging to another role is returned to their own
 * dashboard instead of being left inside the wrong layout.
 */
export function requireRoleDashboard(
  ...roles: UserRole[]
): () => void {
  return function dashboardRoleGuard(): void {
    const session = getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    if (!roles.includes(session.user.role)) {
      throw redirect({ to: homeForRole(session.user.role) })
    }
  }
}
