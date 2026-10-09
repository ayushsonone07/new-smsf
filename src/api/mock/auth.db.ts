import type {
  AuthUser,
  IssuedLoginToken,
  UserRole,
} from '../../features/auth/types/auth.types'
import {
  readPersisted,
  writePersisted,
} from './persist'

export interface StoredUser extends AuthUser {
  password?: string
}

export const storedUsers: StoredUser[] = [
  {
    id: 'usr-1',
    name: 'Super Admin',
    email: 'admin@smsf.test',
    password: 'admin123',
    role: 'ADMIN',
  },
  {
    id: 'usr-2',
    name: 'Ayesha Head',
    email: 'head@smsf.test',
    password: 'head123',
    role: 'HEAD',
    departmentId: 'dept-1',
  },
  {
    id: 'usr-3',
    name: 'Bilal User',
    email: 'user@smsf.test',
    password: 'user123',
    role: 'USER',
    departmentId: 'dept-1',
  },
]

const ISSUED_TOKENS_KEY = 'issued-tokens'
const ISSUED_TOKENS_VERSION = 1

/**
 * Issued login links live in localStorage so they survive a page
 * reload, a new tab or another session of the same browser â€” an
 * in-memory list made every refresh look like "revoked token".
 */
export const issuedTokens: IssuedLoginToken[] =
  readPersisted<IssuedLoginToken[]>(
    ISSUED_TOKENS_KEY,
    ISSUED_TOKENS_VERSION,
  ) ?? []

export function persistIssuedTokens(): void {
  writePersisted(
    ISSUED_TOKENS_KEY,
    ISSUED_TOKENS_VERSION,
    issuedTokens,
  )
}


export function toAuthUser(
  user: StoredUser,
): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
  }
}

function encodePart(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(
    /=+$/,
    '',
  )
}

export function generateToken(payload: {
  sub: string
  role: UserRole
  type: 'session' | 'login'
}): string {
  const header = encodePart({
    alg: 'HS256',
    typ: 'JWT',
  })

  const body = encodePart({
    ...payload,
    iat: Date.now(),
  })

  const signature = encodePart({
    nonce: Math.random().toString(36).slice(2),
  })

  return `${header}.${body}.${signature}`
}
