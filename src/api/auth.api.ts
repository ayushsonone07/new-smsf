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

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthSession> {
  await delay(400)

  const user = storedUsers.find(
    (item) =>
      item.email.toLowerCase() ===
      email.trim().toLowerCase(),
  )

  if (!user || user.password !== password) {
    throw new Error('Invalid email or password')
  }

  return createSession(user)
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
