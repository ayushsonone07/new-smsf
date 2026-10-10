import type {
  AuthSession,
  UserRole,
} from '../../features/auth/types/auth.types'

const SESSION_KEY = 'smsf.auth.session'
/** Admin's own session, parked while they are "logged in as" a department. */
const ADMIN_BACKUP_KEY = 'smsf.auth.admin-backup'

export function getSession(): AuthSession | null {
  try {
    const raw =
      sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)

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
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  )
  // Also store in localStorage as fallback for cold tab loads
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  )
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(ADMIN_BACKUP_KEY)
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(ADMIN_BACKUP_KEY)
}

/** Parks the current (admin) session before switching to a department. */
export function saveAdminBackup(
  session: AuthSession,
): void {
  sessionStorage.setItem(
    ADMIN_BACKUP_KEY,
    JSON.stringify(session),
  )
  localStorage.setItem(
    ADMIN_BACKUP_KEY,
    JSON.stringify(session),
  )
}

export function getAdminBackup(): AuthSession | null {
  try {
    const raw =
      sessionStorage.getItem(ADMIN_BACKUP_KEY) ||
      localStorage.getItem(ADMIN_BACKUP_KEY)

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
  sessionStorage.removeItem(ADMIN_BACKUP_KEY)
  localStorage.removeItem(ADMIN_BACKUP_KEY)

  return true
}

/**
 * Opens a session in a new browser tab with its own isolated sessionStorage,
 * leaving the current tab's session completely intact (just like in SMSF).
 */
export function openSessionInNewTab(
  session: AuthSession,
  targetRoute: string,
): void {
  const newWindow = window.open('', '_blank')

  if (!newWindow) {
    // Popup was blocked by browser, fallback to same tab
    setSession(session)
    window.location.href = targetRoute
    return
  }

  const sessionJson = JSON.stringify(session)

  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Logging in as ${session.user.name || session.user.email}...</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background-color: #f8fafc;
        color: #1e293b;
      }
      .container {
        text-align: center;
        padding: 2.5rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        max-width: 26rem;
        width: 90%;
      }
      .spinner {
        border: 3.5px solid #e2e8f0;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border-top-color: #3b82f6;
        animation: spin 0.8s linear infinite;
        margin: 1.25rem auto;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="container">
      <h2 style="font-size: 1.2rem; margin: 0 0 0.5rem 0; font-weight: 600;">Logging in as ${session.user.name || session.user.email}</h2>
      <div class="spinner"></div>
      <p style="color: #64748b; font-size: 0.875rem; margin: 0;">Setting up your session in a new tab...</p>
    </div>
    <script>
      try {
        sessionStorage.setItem('smsf.auth.session', ${JSON.stringify(sessionJson)});
        window.location.replace('${targetRoute}');
      } catch (e) {
        console.error('Failed to set session in sessionStorage', e);
        window.location.href = '${targetRoute}';
      }
    </script>
  </body>
</html>`

  newWindow.document.open()
  newWindow.document.write(htmlContent)
  newWindow.document.close()
}

export type HomeRoute =
  | '/admin'
  | '/head'
  | '/users'
  | '/customers'
  | '/forbidden'
  | '/onboarding'
  | '/onboarding-user'
  | '/google-head'

export function homeForRole(
  role: UserRole,
  departmentType?: string | null,
): HomeRoute {
  if (role === 'ADMIN') {
    return '/admin'
  }

  const dept = (departmentType ?? getSession()?.user.departmentType ?? '').toUpperCase()
  if (dept.includes('ONBOARDING')) {
    if (role === 'USER') {
      return '/onboarding-user'
    }
    return '/onboarding'
  }

  if (dept.includes('GOOGLE')) {
    return '/google-head'
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
