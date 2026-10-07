import type {
  AuthUser,
  IssuedLoginToken,
  UserRole,
} from '../../features/auth/types/auth.types'

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
    role: 'HEAD',
  },
  {
    id: 'usr-3',
    name: 'Bilal User',
    email: 'user@smsf.test',
    role: 'USER',
  },
]

export const issuedTokens: IssuedLoginToken[] = []

export function toAuthUser(
  user: StoredUser,
): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
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
