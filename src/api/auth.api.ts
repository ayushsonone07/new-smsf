import { apiRequest } from './client'
import { delay } from './mock/db'
import {
  generateToken,
  issuedTokens,
  persistIssuedTokens,
  storedUsers,
  toAuthUser,
} from './mock/auth.db'
import type {
  AuthSession,
  AuthUser,
  IssuedLoginToken,
  UserRole,
} from '../features/auth/types/auth.types'
import type { StoredUser } from './mock/auth.db'

function createSession(
  user: StoredUser,
): AuthSession {
  return {
    token: generateToken({
      sub: user.id,
      role: user.role,
      type: 'session',
    }),
    user: toAuthUser(user),
    issuedAt: new Date().toISOString(),
  }
}

export async function getUsers(): Promise<
  AuthUser[]
> {
  await delay()

  return storedUsers.map(toAuthUser)
}

interface LoginApiResponse {
  success?: boolean
  status?: string
  message?: string
  data?: Record<string, unknown> | null
}

function decodeJwtPayload(
  token: string,
): Record<string, unknown> {
  try {
    const part = token.split('.')[1]
    const json = atob(
      part.replace(/-/g, '+').replace(/_/g, '/'),
    )

    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

function pickString(
  sources: Record<string, unknown>[],
  keys: string[],
): string | undefined {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]

      if (typeof value === 'string' && value) {
        return value
      }

      if (typeof value === 'number') {
        return String(value)
      }
    }
  }

  return undefined
}

function toUserRole(raw?: string): UserRole {
  const value = (raw ?? '').toUpperCase()

  if (value.includes('ADMIN')) {
    return 'ADMIN'
  }

  if (value.includes('HEAD')) {
    return 'HEAD'
  }

  return 'USER'
}

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthSession> {
  const username = email.trim()

  const response = await apiRequest<LoginApiResponse>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
  )

  const data = response.data ?? {}
  const nestedUser =
    typeof data.user === 'object' && data.user
      ? (data.user as Record<string, unknown>)
      : {}

  const token = pickString(
    [data, response as Record<string, unknown>],
    ['token', 'accessToken', 'access_token', 'jwt'],
  )

  if (!token) {
    throw new Error(
      response.message || 'Login response had no token',
    )
  }

  const claims = decodeJwtPayload(token)
  const sources = [nestedUser, data, claims]

  return {
    token,
    user: {
      id:
        pickString(sources, ['id', 'userId', 'sub']) ??
        username,
      name:
        pickString(sources, ['name', 'fullName', 'username']) ??
        username,
      email:
        pickString(sources, ['email', 'username', 'sub']) ??
        username,
      role: toUserRole(
        pickString(sources, ['role', 'userRole', 'roles']),
      ),
      departmentId: pickString(sources, [
        'departmentId',
        'department_id',
      ]),
      departmentType: pickString(sources, [
        'departmentType',
        'department_type',
      ]),
    },
    issuedAt: new Date().toISOString(),
  }
}

/**
 * The same token can reach the login form in different shapes:
 * raw value, whole login link, line-wrapped paste or a link whose
 * "+" characters were decoded as spaces. Try every plausible shape.
 */
function tokenCandidates(raw: string): string[] {
  const trimmed = raw.trim()
  const candidates: string[] = []

  const push = (value: string) => {
    if (value && !candidates.includes(value)) {
      candidates.push(value)
    }
  }

  push(trimmed)

  const fromLink = trimmed.match(/[?&]token=([^&#\s]+)/)
  if (fromLink) {
    try {
      push(decodeURIComponent(fromLink[1]))
    } catch {
      push(fromLink[1])
    }
  }

  if (/\s/.test(trimmed)) {
    push(trimmed.replace(/\s+/g, ''))
    push(trimmed.replace(/\s+/g, '+'))
  }

  return candidates
}

export async function loginWithToken(
  token: string,
): Promise<AuthSession> {
  await delay(400)

  const issued = tokenCandidates(token)
    .map((candidate) =>
      issuedTokens.find(
        (item) => item.token === candidate && !item.revoked,
      ),
    )
    .find(Boolean)

  if (!issued) {
    throw new Error(
      'Invalid or revoked access token',
    )
  }

  const user = storedUsers.find(
    (item) => item.id === issued.user.id,
  )

  if (!user) {
    throw new Error('Account no longer exists')
  }

  return createSession(user)
}

export async function issueLoginToken(
  targetUserId: string,
  issuedBy: string,
): Promise<IssuedLoginToken> {
  await delay(300)

  const user = storedUsers.find(
    (item) => item.id === targetUserId,
  )

  if (!user) {
    throw new Error('User not found')
  }

  if (user.role === 'ADMIN') {
    throw new Error(
      'Admin signs in with email and password',
    )
  }

  const record: IssuedLoginToken = {
    token: generateToken({
      sub: user.id,
      role: user.role,
      type: 'login',
    }),
    user: toAuthUser(user),
    issuedBy,
    createdAt: new Date().toISOString(),
    revoked: false,
  }

  issuedTokens.unshift(record)
  persistIssuedTokens()

  return record
}

export async function getIssuedTokens(): Promise<
  IssuedLoginToken[]
> {
  await delay()

  return structuredClone(issuedTokens)
}

export async function revokeLoginToken(
  token: string,
): Promise<void> {
  await delay(250)

  const record = issuedTokens.find(
    (item) => item.token === token,
  )

  if (!record) {
    throw new Error('Token not found')
  }

  record.revoked = true
  persistIssuedTokens()
}
