import type {
  AuthSession,
  UserRole,
} from '../../features/auth/types/auth.types'

const SESSION_KEY = 'smsf.auth.session'

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function setSession(
  session: AuthSession,
): void {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  )
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export type HomeRoute =
  | '/admin'
  | '/head'
  | '/users'
  | '/forbidden'

export function homeForRole(
  role: UserRole,
): HomeRoute {
  if (role === 'ADMIN') {
    return '/admin'
  }

  if (role === 'HEAD') {
    return '/head'
  }

  if (role === 'USER') {
    return '/users'
  }

  return '/forbidden'
}
