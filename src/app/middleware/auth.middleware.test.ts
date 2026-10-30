import { beforeEach, describe, expect, it } from 'vitest'
import {
  redirectAuthenticatedUser,
  requireAuth,
  requireRole,
  requireRoleDashboard,
} from './auth.middleware'
import { clearSession, setSession } from '../auth/session'
import type { AuthSession, UserRole } from '../../features/auth/types/auth.types'

function makeSession(role: UserRole, departmentType?: string): AuthSession {
  return {
    token: 'token',
    issuedAt: '2026-01-01T00:00:00.000Z',
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role,
      departmentType,
    },
  }
}

function captureRedirect(fn: () => void): { to?: string } {
  try {
    fn()
  } catch (error) {
    const response = error as Response & { options?: { to?: string } }
    expect(response).toBeInstanceOf(Response)
    return response.options ?? {}
  }
  throw new Error('Expected the guard to redirect')
}

beforeEach(() => {
  clearSession()
})

describe('requireAuth', () => {
  it('redirects anonymous visitors to login', () => {
    expect(captureRedirect(requireAuth).to).toBe('/login')
  })

  it('allows a signed in user through', () => {
    setSession(makeSession('HEAD'))
    expect(() => requireAuth()).not.toThrow()
  })
})

describe('redirectAuthenticatedUser', () => {
  it('keeps guests on the login page', () => {
    expect(() => redirectAuthenticatedUser()).not.toThrow()
  })

  it('sends an authenticated user to their role home', () => {
    setSession(makeSession('ADMIN'))
    expect(captureRedirect(redirectAuthenticatedUser).to).toBe('/admin')
  })

  it('honours the department portal for head and user sessions', () => {
    setSession(makeSession('HEAD', 'SALES_DEPARTMENT'))
    expect(captureRedirect(redirectAuthenticatedUser).to).toBe('/sales-head')

    setSession(makeSession('USER', 'SALES_DEPARTMENT'))
    expect(captureRedirect(redirectAuthenticatedUser).to).toBe('/sales-user')
  })
})

describe('requireRole', () => {
  it('redirects anonymous visitors to login', () => {
    expect(captureRedirect(requireRole('ADMIN')).to).toBe('/login')
  })

  it('redirects a signed in user with the wrong role to forbidden', () => {
    setSession(makeSession('USER'))
    expect(captureRedirect(requireRole('ADMIN', 'HEAD')).to).toBe('/forbidden')
  })

  it('allows any of the accepted roles', () => {
    setSession(makeSession('HEAD'))
    expect(() => requireRole('ADMIN', 'HEAD')()).not.toThrow()
  })
})

describe('requireRoleDashboard', () => {
  it('redirects anonymous visitors to login', () => {
    expect(captureRedirect(requireRoleDashboard('ADMIN')).to).toBe('/login')
  })

  it('returns a user opening the wrong dashboard to their own dashboard', () => {
    setSession(makeSession('USER', 'ONBOARDING_DEPARTMENT'))
    expect(captureRedirect(requireRoleDashboard('ADMIN')).to).toBe('/onboarding-user')
  })

  it('allows a matching role through', () => {
    setSession(makeSession('ADMIN'))
    expect(() => requireRoleDashboard('ADMIN')()).not.toThrow()
  })
})
