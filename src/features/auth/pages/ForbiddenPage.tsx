import { useNavigate } from '@tanstack/react-router'
import {
  clearSession,
  getSession,
  homeForRole,
} from '../../../app/auth/session'

export function ForbiddenPage() {
  const navigate = useNavigate()
  const session = getSession()

  function handleLogout() {
    clearSession()
    navigate({ to: '/login' })
  }

  return (
    <main className="page-content">
      <header className="topbar">
        <div>
          <p className="breadcrumb">
            Administration / Access Denied
          </p>

          <h1>403 — Access Denied</h1>

          <p className="page-description">
            Route permission check failed for your
            role.
          </p>
        </div>
      </header>

      <section className="content-card forbidden-card">
        <div className="forbidden-icon">403</div>

        <h2>
          Your role does not allow this route
        </h2>

        <p>
          You are signed in as{' '}
          <strong>
            {session?.user.name ?? 'Guest'}
          </strong>{' '}
          with role{' '}
          <span
            className={`role-badge ${
              session?.user.role.toLowerCase() ?? ''
            }`}
          >
            {session?.user.role ?? '—'}
          </span>
          .
        </p>

        <p className="forbidden-rules">
          Route access — /admin: ADMIN · /head:
          ADMIN, HEAD · /users: ADMIN, HEAD, USER
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            Logout
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate({
                to: session
                  ? homeForRole(session.user.role)
                  : '/login',
              })
            }
          >
            Go to my home
          </button>
        </div>
      </section>
    </main>
  )
}
