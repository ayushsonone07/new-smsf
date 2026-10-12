import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Customer } from '../../departments/types/customer.types'
import { getSession } from '../../../app/auth/session'
import type { AuthSession } from '../../auth/types/auth.types'

export interface CustomerSession {
  customerId: string
  name: string
  email: string
  company: string
  loggedInAt: string
  accessToken?: string
  username?: string
}

export function getCustomerSession(): CustomerSession | null {
  try {
    const raw = sessionStorage.getItem('smsf.customer.session')
    const authSession = getSession()
    if (raw) {
      const customerSession = JSON.parse(raw) as CustomerSession
      if (authSession?.user.role === 'CUSTOMER') {
        customerSession.accessToken ||= authSession.token
        customerSession.username ||= authSession.user.username || authSession.user.email
        customerSession.customerId ||= authSession.user.id
        customerSession.email ||= authSession.user.email
        setCustomerSession(customerSession)
      }
      return customerSession
    }

    if (authSession?.user.role !== 'CUSTOMER') return null

    const customerSession = createCustomerSession(authSession)
    setCustomerSession(customerSession)
    return customerSession
  } catch {
    return null
  }
}

function createCustomerSession(authSession: AuthSession): CustomerSession {
  return {
    customerId: authSession.user.id,
    name: authSession.user.name || authSession.user.email,
    email: authSession.user.email,
    company: authSession.user.name || authSession.user.email,
    loggedInAt: authSession.issuedAt,
    accessToken: authSession.token,
    username: authSession.user.username || authSession.user.email,
  }
}

export function setCustomerSessionFromAuth(authSession: AuthSession): CustomerSession {
  if (authSession.user.role !== 'CUSTOMER') {
    throw new Error('Only customer accounts can open the customer portal.')
  }
  const customerSession = createCustomerSession(authSession)
  setCustomerSession(customerSession)
  return customerSession
}

export function setCustomerSession(session: CustomerSession): void {
  sessionStorage.setItem('smsf.customer.session', JSON.stringify(session))
}

export function clearCustomerSession(): void {
  sessionStorage.removeItem('smsf.customer.session')
}

export function useCustomerSession() {
  const navigate = useNavigate()
  const [session, setSessionState] = useState<CustomerSession | null>(() => getCustomerSession())

  const login = useCallback((customer: Customer) => {
    const session: CustomerSession = {
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      company: customer.company,
      loggedInAt: new Date().toISOString(),
    }
    setCustomerSession(session)
    setSessionState(session)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('smsf.customer.session')
    setSessionState(null)
    navigate({ to: '/customers/login' })
  }, [navigate])

  return { session, login, logout }
}