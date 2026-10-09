import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Customer } from '../../departments/types/customer.types'

export interface CustomerSession {
  customerId: string
  name: string
  email: string
  company: string
  loggedInAt: string
}

export function getCustomerSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem('smsf.customer.session')
    if (!raw) return null
    return JSON.parse(raw) as CustomerSession
  } catch {
    return null
  }
}

export function setCustomerSession(session: CustomerSession): void {
  localStorage.setItem('smsf.customer.session', JSON.stringify(session))
}

export function clearCustomerSession(): void {
  localStorage.removeItem('smsf.customer.session')
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
    localStorage.setItem('smsf.customer.session', JSON.stringify(session))
    setSessionState(session)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('smsf.customer.session')
    setSessionState(null)
    navigate({ to: '/customers/login' })
  }, [navigate])

  return { session, login, logout }
}