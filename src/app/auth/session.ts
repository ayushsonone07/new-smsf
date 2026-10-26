import type {
  AuthSession,
  UserRole,
} from '../../features/auth/types/auth.types'

const SESSION_KEY = 'smsf.auth.session'

// Keep session routing independent from the API layer. Importing the API helper
// here created a client -> session -> dynamic API -> client cycle and also pulled
// the dynamic-permission module into the initial bundle.
function normalizeDepartmentSlug(raw: string): string {
  if (!raw) return 'department'
  const trimmed = raw.trim().toLowerCase().replace(/_department$/i, '')
  return (
    trimmed
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^[_-]+|[_-]+$/g, '') || 'department'
  )
}
/** Admin's own session, parked while they are "logged in as" a department. */
const ADMIN_BACKUP_KEY = 'smsf.auth.admin-backup'

export function getSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function getCurrentPhoneNumber(): string {
  try {
    const stored = sessionStorage.getItem('phoneNumber')
    if (stored && stored !== 'XXXXXXXXXX' && stored.trim()) {
      return stored.trim()
    }
    const session = getSession()
    if (
      session?.user.phoneNumber &&
      session.user.phoneNumber !== 'XXXXXXXXXX'
    ) {
      sessionStorage.setItem('phoneNumber', session.user.phoneNumber)
      return session.user.phoneNumber
    }
    if (session?.token && session.token.includes('.')) {
      const payload = session.token.split('.')[1]
      if (payload) {
        const base64 = payload
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(Math.ceil(payload.length / 4) * 4, '=')
        const claims = JSON.parse(atob(base64)) as Record<string, unknown>
        const claimPhone =
          typeof claims.phoneNumber === 'string'
            ? claims.phoneNumber
            : typeof claims.contact === 'string'
              ? claims.contact
              : ''
        if (claimPhone && claimPhone !== 'XXXXXXXXXX' && claimPhone.trim()) {
          sessionStorage.setItem('phoneNumber', claimPhone.trim())
          return claimPhone.trim()
        }
      }
    }
  } catch {
    // Ignore storage/decode errors
  }
  return ''
}

export function updateSessionPhoneNumber(phone: string): void {
  const trimmed = phone.trim()
  sessionStorage.setItem('phoneNumber', trimmed)
  const session = getSession()
  if (session) {
    session.user.phoneNumber = trimmed
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }
}

export function setSession(
  session: AuthSession,
): void {
  const resolvedPhone =
    session.user.phoneNumber ||
    (() => {
      try {
        if (session.token && session.token.includes('.')) {
          const payload = session.token.split('.')[1]
          if (payload) {
            const base64 = payload
              .replace(/-/g, '+')
              .replace(/_/g, '/')
              .padEnd(Math.ceil(payload.length / 4) * 4, '=')
            const claims = JSON.parse(atob(base64)) as Record<string, unknown>
            return typeof claims.phoneNumber === 'string'
              ? claims.phoneNumber
              : ''
          }
        }
      } catch {
        // Ignore
      }
      return ''
    })()

  if (resolvedPhone && resolvedPhone !== 'XXXXXXXXXX') {
    session.user.phoneNumber = resolvedPhone
    sessionStorage.setItem('phoneNumber', resolvedPhone)
  }

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  )
  sessionStorage.setItem('token', session.token)
  sessionStorage.setItem('role', session.user.role)
  if (session.user.departmentType) {
    sessionStorage.setItem('departmentType', session.user.departmentType)
  }

  // Clear any legacy localStorage session to avoid cross-tab bleeding
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(ADMIN_BACKUP_KEY)
    localStorage.removeItem('token')
  } catch {
    // Ignore storage errors
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(ADMIN_BACKUP_KEY)
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('role')
  sessionStorage.removeItem('departmentType')
  sessionStorage.removeItem('phoneNumber')

  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(ADMIN_BACKUP_KEY)
    localStorage.removeItem('token')
  } catch {
    // Ignore storage errors
  }
}

/** Parks the current (admin) session before switching to a department. */
export function saveAdminBackup(
  session: AuthSession,
): void {
  sessionStorage.setItem(
    ADMIN_BACKUP_KEY,
    JSON.stringify(session),
  )
}

export function getAdminBackup(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_BACKUP_KEY)
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

  return true
}

/** Shows feedback in a synchronously opened tab while login-as is pending. */
export function prepareLoginWindow(targetWin: Window | null): void {
  if (!targetWin) return

  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Logging in...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: Arial, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; background:#f4f6fb; color:#0f172a; }
      .container { text-align:center; padding:40px; background:#fff; border:1px solid #e6e9f0; border-radius:12px; box-shadow:0 8px 24px rgba(15,23,42,.08); width:min(360px,80vw); }
      .spinner { width:40px; height:40px; margin:20px auto; border:4px solid #dbe4ff; border-top-color:#2459e0; border-radius:50%; animation:spin .8s linear infinite; }
      h2 { margin:0; font-size:20px; }
      p { margin:0; color:#64748b; font-size:14px; }
      @keyframes spin { to { transform:rotate(360deg); } }
    </style>
  </head>
  <body>
    <main class="container">
      <h2>Logging you in...</h2>
      <div class="spinner" aria-label="Loading"></div>
      <p>Please wait while we prepare the account.</p>
    </main>
  </body>
</html>`

  try {
    targetWin.document.open()
    targetWin.document.write(htmlContent)
    targetWin.document.close()
  } catch {
    // The final session hand-off will still navigate this window.
  }
}

/**
 * Opens a session in a new browser tab with its own isolated sessionStorage,
 * leaving the current tab's session completely intact (just like in SMSF).
 */
export function openSessionInNewTab(
  session: AuthSession,
  targetRoute: string,
  existingWindow?: Window | null,
  backupSession?: AuthSession | null,
): void {
  let targetWin = existingWindow

  if (!targetWin) {
    try {
      targetWin = window.open('', '_blank')
    } catch {
      targetWin = null
    }
  }

  if (!targetWin) {
    // Popup was blocked by browser or unavailable, fallback to same tab
    setSession(session)
    window.location.href = targetRoute
    return
  }

  const sessionJson = JSON.stringify(session)
  const tokenVal = session.token || ''
  const roleVal = session.user.role || 'USER'
  const deptVal = session.user.departmentType || ''
  const phoneVal = session.user.phoneNumber || ''
  const backupJson = backupSession ? JSON.stringify(backupSession) : ''

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
        sessionStorage.setItem('token', ${JSON.stringify(tokenVal)});
        sessionStorage.setItem('role', ${JSON.stringify(roleVal)});
        ${deptVal ? `sessionStorage.setItem('departmentType', ${JSON.stringify(deptVal)});`: ''}
        ${phoneVal ? `sessionStorage.setItem('phoneNumber', ${JSON.stringify(phoneVal)});`: ''}
        ${backupJson ? `sessionStorage.setItem('smsf.auth.admin-backup', ${JSON.stringify(backupJson)});`: ''}
        try {
          localStorage.removeItem('smsf.auth.session');
          localStorage.removeItem('smsf.auth.admin-backup');
          localStorage.removeItem('token');
        } catch (_) {}
        window.location.replace('${targetRoute}');
      } catch (e) {
        console.error('Failed to set session in sessionStorage', e);
        window.location.href = '${targetRoute}';
      }
    </script>
  </body>
</html>`

  try {
    targetWin.document.open()
    targetWin.document.write(htmlContent)
    targetWin.document.close()
  } catch {
    targetWin.location.href = targetRoute
  }
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
  | '/google-user'
  | (string & {})

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
    if (role === 'USER') {
      return '/google-user'
    }
    return '/google-head'
  }

  if (dept) {
    const slug = normalizeDepartmentSlug(dept)
    if (slug && slug !== 'head' && slug !== 'users' && slug !== 'department') {
      const roleSegment = role === 'USER' ? 'user' : 'head'
      return `/${slug}/${roleSegment}/dashboard` as HomeRoute
    }
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
