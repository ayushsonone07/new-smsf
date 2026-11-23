import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Icon } from '../../../components/head/shared/Icon'
import { setCustomerSessionFromAuth } from '../hooks/useCustomerSession'
import { setSession } from '../../../app/auth/session'
import { useLoginWithCredentials } from '../../auth/hooks/useLoginWithCredentials'
import './CustomerLoginPage.css'

export function CustomerLoginPage() {
  const navigate = useNavigate()
  const credentialsMutation = useLoginWithCredentials()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const isLoading = credentialsMutation.isPending

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const trimmedInput = email.trim()
    if (!trimmedInput || !password) {
      setError('Please enter your email or mobile number and password')
      return
    }

    const isEmail = trimmedInput.includes('@')
    const digitsOnly = trimmedInput.replace(/\D/g, '')
    const isPhone = digitsOnly.length >= 10 && digitsOnly.length <= 13

    if (!isEmail && !isPhone) {
      setError('Please enter a valid email address or 10-digit mobile number')
      return
    }

    try {
      const session = await credentialsMutation.mutateAsync({ email: trimmedInput, password })
      if (session.user.role !== 'CUSTOMER') {
        throw new Error('This account is not a customer account.')
      }
      setSession(session)
      setCustomerSessionFromAuth(session)
      navigate({ to: '/customers' })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign in failed. Please try again.')
    }
  }

  return (
    <main className="cust-auth-page">
      <div className="cust-auth-card">
        <div className="cust-auth-brand">
          <img className="cust-auth-brand-icon" src="/mbg-card-logo.svg" alt="MBG Card" />
          <div>
            <strong>MBG Card</strong>
            <span>Customer Portal</span>
          </div>
        </div>

        <h1>Sign in</h1>

        <p className="cust-auth-subtitle">
          Sign in to view your onboarding progress and communicate with your team.
        </p>

        {error && (
          <div className="cust-auth-error" role="alert">
            <Icon name="alert" size={16} strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        <form className="cust-auth-form" onSubmit={handleSubmit}>
          <label className="cust-auth-label">
            Email or Mobile Number
            <Input
              type="text"
              required
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="name@example.com or 10-digit mobile"
              autoComplete="username"
              disabled={isLoading}
            />
          </label>

          <label className="cust-auth-label">
            Password
            <div className="cust-auth-password-wrapper">
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="cust-auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eye' : 'eye'} size={18} strokeWidth={2} />
              </button>
            </div>
          </label>

          <Button
            type="submit"
            variant="primary"
            className="cust-auth-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  )
}
