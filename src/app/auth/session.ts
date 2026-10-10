import type {
  AuthSession,
  UserRole,
} from '../../features/auth/types/auth.types'

const SESSION_KEY = 'smsf.auth.session'
/** Admin's own session, parked while they are "logged in as" a department. */
const ADMIN_BACKUP_KEY = 'smsf.auth.admin-backup'

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
  localStorage.removeItem(ADMIN_BACKUP_KEY)
}

/** Parks the current (admin) session before switching to a department. */
export function saveAdminBackup(
  session: AuthSession,
): void {
  localStorage.setItem(
    ADMIN_BACKUP_KEY,
    JSON.stringify(session),
  )
}

export function getAdminBackup(): AuthSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_BACKUP_KEY)

    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

/**
 * Puts the parked admin session back as the active one.
 * Returns false when there is nothing to restore.
 */
export function restoreAdminSession(): boolean {
  const backup = getAdminBackup()

  if (!backup) {
    return false
  }

  setSession(backup)
  localStorage.removeItem(ADMIN_BACKUP_KEY)

  return true
}

export type HomeRoute =
  | '/admin'
  | '/head'
  | '/users'
  | '/customers'
  | '/forbidden'
  | '/onboarding'

export function homeForRole(
  role: UserRole,
  departmentType?: string | null,
): HomeRoute {
  if (role === 'ADMIN') {
    return '/admin'
  }

  const dept = (departmentType ?? getSession()?.user.departmentType ?? '').toUpperCase()
  if (dept.includes('ONBOARDING')) {
    return '/onboarding'
  }

  if (role === 'HEAD') {
    return '/head'
  }

  if (role === 'USER') {
    return '/users'
  }

  if (role === 'CUSTOMER') {
    return '/customers'
  }

  return '/forbidden'
}
