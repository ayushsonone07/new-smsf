import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Icon } from '../../../components/head/shared/Icon'
import { useCustomerSession } from '../hooks/useCustomerSession'
import './CustomerLoginPage.css'

const TEST_CREDENTIALS = {
  email: 'customer@demo.com',
  password: 'demo123',
}

const DEMO_CUSTOMERS = [
  {
    id: 'cust-1',
    departmentId: 'dept-1',
    name: 'Aarav Sharma',
    email: 'customer@demo.com',
    phone: '+1 555 0101',
    company: 'Northwind Traders',
    status: 'ACTIVE' as const,
    createdAt: '2026-01-15T09:15:00.000Z',
    onboardingStatus: 'in-progress' as const,
    callStatus: 'connected' as const,
    assigneeId: 'u-1',
    remark: '',
    updatedLabel: 'Just now',
  },
]

export function CustomerLoginPage() {
  const navigate = useNavigate()
  const { login } = useCustomerSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      if (email === TEST_CREDENTIALS.email && password === TEST_CREDENTIALS.password) {
        const customer = DEMO_CUSTOMERS[0]
        login(customer)
        navigate({ to: '/customers' })
      } else {
        setError('Invalid email or password. Use customer@demo.com / demo123')
      }
      setIsLoading(false)
    }, 500)
  }

  return (
    <main className="cust-auth-page">
      <div className="cust-auth-card">
        <div className="cust-auth-brand">
          <div className="cust-auth-brand-icon">
            <Icon name="users" size={24} strokeWidth={2} />
          </div>
          <div>
            <strong>SMSF</strong>
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
            Email Address
            <Input
              type="email"
              required
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="customer@demo.com"
              autoComplete="email"
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

        <div className="cust-auth-demo-hint">
          <strong>Demo:</strong> customer@demo.com / demo123
        </div>
      </div>
    </main>
  )
}