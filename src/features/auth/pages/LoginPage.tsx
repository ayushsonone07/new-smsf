import {
  useCallback,
  useState,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLoginWithCredentials } from '../hooks/useLoginWithCredentials'
import {
  homeForRole,
  setSession,
} from '../../../app/auth/session'
import { setCustomerSessionFromAuth } from '../../customers/hooks/useCustomerSession'
import type { AuthSession } from '../types/auth.types'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const credentialsMutation =
    useLoginWithCredentials()

  const handleSessionCreated = useCallback(
    (session: AuthSession) => {
      setSession(session)
      if (session.user.role === 'CUSTOMER') {
        setCustomerSessionFromAuth(session)
      }
      navigate({
        to: homeForRole(
          session.user.role as never,
          session.user.departmentType,
        ) as never,
      })
    },
    [navigate],
  )

  function handleCredentialsSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    credentialsMutation.mutate(
      { email, password },
      {
        onSuccess: handleSessionCreated,
      },
    )
  }

  const credentialsError =
    credentialsMutation.error?.message

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img className="brand-mark" src="/mbg-card-logo.svg" alt="MBG Card" />

          <div>
            <strong>MBG Card</strong>
            <span>Admin Portal</span>
          </div>
        </div>

        <h1>Sign in</h1>

        <p className="auth-subtitle">
          Sign in with your email address and password.
        </p>

        <form
          className="auth-form"
          onSubmit={handleCredentialsSubmit}
        >
          <label>
            Email Address

            <input
              required
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@company.com"
              autoComplete="username"
            />
          </label>

          <label>
            Password

            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {credentialsError && (
            <p className="auth-error">
              {credentialsError}
            </p>
          )}

          <button
            type="submit"
            className="primary-button auth-submit"
            disabled={credentialsMutation.isPending}
          >
            {credentialsMutation.isPending
              ? 'Signing in...'
              : 'Sign in as Admin'}
          </button>
        </form>
      </div>
    </main>
  )
}





