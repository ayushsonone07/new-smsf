import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiError } from './client'
import { getSession, setSession } from '../app/auth/session'

afterEach(() => {
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

describe('apiRequest authentication handling', () => {
  it('keeps the session when an endpoint returns a non-authentication 401', async () => {
    const session = {
      token: 'department-user-token',
      user: {
        id: '1',
        name: 'Department User',
        email: 'user@example.com',
        role: 'USER' as const,
        departmentType: 'ONBOARDING_DEPARTMENT',
      },
      issuedAt: new Date().toISOString(),
    }
    setSession(session)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 401,
            error: 'Unauthorized',
            message: 'User is not authorized for this operation',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    await expect(apiRequest('/api/example')).rejects.toBeInstanceOf(ApiError)

    expect(getSession()).toEqual(session)
  })
})
