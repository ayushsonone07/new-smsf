import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSession,
  getAdminBackup,
  getCurrentPhoneNumber,
  getSession,
  homeForRole,
  restoreAdminSession,
  saveAdminBackup,
  setSession,
  updateSessionPhoneNumber,
} from './session'
import type { AuthSession } from '../../features/auth/types/auth.types'

function createToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    token: 'test-token',
    issuedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'HEAD',
      departmentType: 'ONBOARDING_DEPARTMENT',
      ...overrides.user,
    },
  }
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('getSession', () => {
  it('returns null when no session is stored', () => {
    expect(getSession()).toBeNull()
  })

  it('returns null for corrupt JSON instead of throwing', () => {
    sessionStorage.setItem('smsf.auth.session', '{not-json')
    expect(getSession()).toBeNull()
  })

  it('reads the session written by setSession', () => {
    const session = makeSession()
    setSession(session)
    expect(getSession()).toEqual(session)
  })
})

describe('setSession', () => {
  it('stores the token, role and department type mirror keys', () => {
    setSession(makeSession())
    expect(sessionStorage.getItem('token')).toBe('test-token')
    expect(sessionStorage.getItem('role')).toBe('HEAD')
    expect(sessionStorage.getItem('departmentType')).toBe('ONBOARDING_DEPARTMENT')
  })

  it('clears legacy localStorage entries so tabs do not bleed into each other', () => {
    localStorage.setItem('smsf.auth.session', 'legacy')
    localStorage.setItem('smsf.auth.admin-backup', 'legacy')
    localStorage.setItem('token', 'legacy')

    setSession(makeSession())

    expect(localStorage.getItem('smsf.auth.session')).toBeNull()
    expect(localStorage.getItem('smsf.auth.admin-backup')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('derives the phone number from the JWT when the user has none', () => {
    const token = createToken({ phoneNumber: '9876543210' })
    setSession(
      makeSession({
        token,
        user: { id: '1', name: 'Test', email: 't@example.com', role: 'HEAD' },
      }),
    )

    expect(sessionStorage.getItem('phoneNumber')).toBe('9876543210')
    expect(getSession()?.user.phoneNumber).toBe('9876543210')
  })

  it('ignores the placeholder phone number', () => {
    setSession(
      makeSession({
        user: {
          id: '1',
          name: 'Test',
          email: 't@example.com',
          role: 'HEAD',
          phoneNumber: 'XXXXXXXXXX',
        },
      }),
    )
    expect(sessionStorage.getItem('phoneNumber')).toBeNull()
  })
})

describe('clearSession', () => {
  it('removes every session related key from both storages', () => {
    setSession(makeSession())
    saveAdminBackup(makeSession())
    localStorage.setItem('token', 'legacy')

    clearSession()

    expect(getSession()).toBeNull()
    expect(getAdminBackup()).toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('role')).toBeNull()
    expect(sessionStorage.getItem('departmentType')).toBeNull()
    expect(sessionStorage.getItem('phoneNumber')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('phone number helpers', () => {
  it('reads the phone number written to session storage', () => {
    sessionStorage.setItem('phoneNumber', ' 9123456789 ')
    expect(getCurrentPhoneNumber()).toBe('9123456789')
  })

  it('falls back to the session user phone number', () => {
    setSession(
      makeSession({
        user: {
          id: '1',
          name: 'Test',
          email: 't@example.com',
          role: 'HEAD',
          phoneNumber: '9988776655',
        },
      }),
    )
    sessionStorage.removeItem('phoneNumber')
    expect(getCurrentPhoneNumber()).toBe('9988776655')
  })

  it('returns an empty string when nothing is available', () => {
    expect(getCurrentPhoneNumber()).toBe('')
  })

  it('updates both the mirror key and the session user', () => {
    setSession(makeSession())
    updateSessionPhoneNumber(' 9000000001 ')
    expect(sessionStorage.getItem('phoneNumber')).toBe('9000000001')
    expect(getSession()?.user.phoneNumber).toBe('9000000001')
  })
})

describe('admin backup session', () => {
  it('parks and restores an admin session', () => {
    const admin = makeSession({
      token: 'admin-token',
      user: {
        id: '1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    })
    saveAdminBackup(admin)
    setSession(
      makeSession({
        token: 'head-token',
        user: {
          id: '2',
          name: 'Head',
          email: 'head@example.com',
          role: 'HEAD',
        },
      }),
    )

    expect(restoreAdminSession()).toBe(true)
    expect(getSession()?.token).toBe('admin-token')
    expect(getAdminBackup()).toBeNull()
  })

  it('returns false when there is nothing to restore', () => {
    expect(restoreAdminSession()).toBe(false)
  })

  it('returns null for a corrupt backup', () => {
    sessionStorage.setItem('smsf.auth.admin-backup', '{oops')
    expect(getAdminBackup()).toBeNull()
  })
})

describe('homeForRole', () => {
  it('sends admins to the admin portal', () => {
    expect(homeForRole('ADMIN')).toBe('/admin')
  })

  it('sends onboarding users and heads to the onboarding portal', () => {
    expect(homeForRole('HEAD', 'ONBOARDING_DEPARTMENT')).toBe('/onboarding-head')
    expect(homeForRole('USER', 'ONBOARDING_DEPARTMENT')).toBe('/onboarding-user')
  })

  it('sends google users and heads to the google portal', () => {
    expect(homeForRole('HEAD', 'GOOGLE_DEPARTMENT')).toBe('/google-head')
    expect(homeForRole('USER', 'GOOGLE_DEPARTMENT')).toBe('/google-user')
  })

  it('builds department specific portals from the department slug', () => {
    expect(homeForRole('HEAD', 'SALES_DEPARTMENT')).toBe('/sales-head')
    expect(homeForRole('USER', 'SALES_DEPARTMENT')).toBe('/sales-user')
  })

  it('falls back to the generic portals and customer portal', () => {
    expect(homeForRole('HEAD')).toBe('/head')
    expect(homeForRole('USER')).toBe('/users')
    expect(homeForRole('CUSTOMER')).toBe('/customers')
  })

  it('uses the persisted session department when none is passed', () => {
    setSession(
      makeSession({
        user: {
          id: '1',
          name: 'Test',
          email: 't@example.com',
          role: 'USER',
          departmentType: 'SALES_DEPARTMENT',
        },
      }),
    )
    expect(homeForRole('USER')).toBe('/sales-user')
  })

  it('returns /forbidden for an unknown role without a department', () => {
    expect(homeForRole('GUEST' as never)).toBe('/forbidden')
  })
})
