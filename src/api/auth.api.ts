import { apiRequest, ApiError } from './client'
import { getSession } from '../app/auth/session'
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

/** Raw payload inside the backend's `CustomApiResponse.data` envelope. */
interface BackendLoginData {
  id?: number | string
  username?: string
  email?: string
  role?: string
  accessToken?: string
  refreshToken?: string
  departmentType?: string
  isHead?: boolean
}

interface BackendLoginEnvelope {
  success?: boolean
  message?: string
  data?: BackendLoginData | null
}

function mapBackendRole(
  role: string | undefined,
  isHead: boolean | undefined,
): UserRole {
  const normalized = (role ?? '').toUpperCase()

  if (normalized === 'SUPERADMIN' || normalized === 'ADMIN') {
    return 'ADMIN'
  }

  if (normalized === 'DEPARTMENT_HEAD' || normalized === 'HEAD') {
    return 'HEAD'
  }

  if (normalized === 'CUSTOMER') {
    return 'CUSTOMER'
  }

  // DEPARTMENT_USER / DEPARTMENT_SUB_USER / DEPARTMENT_SFP (and any
  // future department role): the `isHead` flag decides HEAD vs USER.
  if (isHead === true) {
    return 'HEAD'
  }

  return 'USER'
}

function decodeJwtClaims(
  token: string,
): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]

    if (!payload) return {}

    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')

    return JSON.parse(atob(base64)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function toSessionFromBackend(data: BackendLoginData): AuthSession {
  const token = data.accessToken

  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Invalid authentication token received from server')
  }

  const claims = decodeJwtClaims(token)
  const claimEmail = typeof claims.sub === 'string' ? claims.sub : undefined
  const claimRole = typeof claims.role === 'string' ? claims.role : undefined
  const claimIsHead = typeof claims.isHead === 'boolean' ? claims.isHead : undefined
  const claimDept = typeof claims.departmentType === 'string' ? claims.departmentType : undefined

  const email = (claimEmail || data.email || data.username || '').trim()

  if (!email) {
    throw new Error('Login response did not include an email/username')
  }

  const user: AuthUser = {
    id: String(data.id ?? email),
    name: data.username || email,
    email,
    username: claimEmail || email,
    role: mapBackendRole(data.role ?? claimRole, data.isHead ?? claimIsHead),
    departmentType: data.departmentType || claimDept || undefined,
  }

  return {
    token,
    user,
    issuedAt: new Date().toISOString(),
  }
}

function loginWithMockCredentials(
  email: string,
  password: string,
): AuthSession {
  const user = storedUsers.find(
    (item) =>
      item.email.toLowerCase() === email.trim().toLowerCase(),
  )

  if (!user || user.password !== password) {
    throw new Error('Invalid email or password')
  }

  return createSession(user)
}

function createSession(user: StoredUser): AuthSession {
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

export async function getUsers(): Promise<AuthUser[]> {
  await delay()
  return storedUsers.map(toAuthUser)
}

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthSession> {
  const username = email.trim()
  const payload = { username, password }

  let envelope: BackendLoginEnvelope

  try {
    // Real backend validation: POST /api/auth/login { username, password }.
    // (Backend accepts the email in `username` — case-insensitive.)
    envelope = await apiRequest<BackendLoginEnvelope>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    // Backend answered with a validation error (401/400/500) — surface it
    // instead of silently falling back to the mock store.
    if (error instanceof ApiError) {
      throw new Error(error.message || 'Invalid email or password', {
        cause: error,
      })
    }

    // Only when the backend is unreachable (network down / wrong
    // VITE_API_BASE_URL) fall back to the local mock users so the
    // demo accounts (admin@smsf.test, …) keep working offline.
    await delay(400)
    return loginWithMockCredentials(email, password)
  }

  if (envelope && envelope.success === false) {
    throw new Error(envelope.message || 'Invalid email or password')
  }

  if (!envelope?.data) {
    throw new Error(envelope?.message || 'Login failed. Please try again.')
  }

  return toSessionFromBackend(envelope.data)
}

/** Response of `POST /api/auth/generate-token?username=<email>`. */
interface BackendTokenEnvelope {
  success?: boolean
  message?: string
  data?: BackendLoginData | string | null
  accessToken?: string
  token?: string
}

/**
 * Admin -> department login.
 *
 * Calls `POST /api/auth/generate-token?username=<department email>`
 * and turns the returned token into a normal session, so the
 * admin lands on that department's dashboard without a password.
 */
export async function generateDepartmentSession(
  email: string,
): Promise<AuthSession> {
  const username = email.trim()

  if (!username) {
    throw new Error('Department email is missing')
  }

  const adminSession = getSession()

  const response = await apiRequest<
    BackendTokenEnvelope | string
  >(
    `/api/auth/generate-token?username=${encodeURIComponent(username)}`,
    {
      method: 'POST',
      headers: adminSession?.token
        ? { Authorization: `Bearer ${adminSession.token}` }
        : undefined,
    },
  )

  if (
    typeof response === 'object' &&
    response !== null &&
    response.success === false
  ) {
    throw new Error(
      response.message || 'Unable to generate token',
    )
  }

  // The token can come back as a bare string, as `data`,
  // or inside `data.accessToken` / `data.token`.
  const dataObject: BackendLoginData & { token?: string } =
    typeof response === 'object' &&
    response !== null &&
    typeof response.data === 'object' &&
    response.data !== null
      ? response.data
      : {}

  const token =
    (typeof response === 'string' ? response : undefined) ??
    (typeof response === 'object' && response !== null
      ? typeof response.data === 'string'
        ? response.data
        : undefined
      : undefined) ??
    dataObject.accessToken ??
    dataObject.token ??
    (typeof response === 'object' && response !== null
      ? (response.accessToken ?? response.token)
      : undefined)

  if (!token) {
    throw new Error('Server did not return a token')
  }

  const claims = decodeJwtClaims(token)

  const claimEmail =
    typeof claims.sub === 'string' ? claims.sub : undefined
  const claimRole =
    typeof claims.role === 'string' ? claims.role : undefined

  return toSessionFromBackend({
    ...dataObject,
    accessToken: token,
    email:
      dataObject.email ||
      dataObject.username ||
      claimEmail ||
      username,
    // A department account opens the department console.
    role: dataObject.role ?? claimRole,
    isHead:
      dataObject.isHead ??
      (typeof claims.isHead === 'boolean'
        ? claims.isHead
        : undefined),
    departmentType:
      dataObject.departmentType ??
      (typeof claims.departmentType === 'string'
        ? claims.departmentType
        : undefined),
  })
}

export async function loginWithToken(
  token: string,
): Promise<AuthSession> {
  await delay(400)

  const issued = issuedTokens.find(
    (item) => item.token === token.trim() && !item.revoked,
  )

  if (!issued) {
    throw new Error('Invalid or revoked access token')
  }

  const user = storedUsers.find((item) => item.id === issued.user.id)

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

  const user = storedUsers.find((item) => item.id === targetUserId)

  if (!user) {
    throw new Error('User not found')
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

export async function getIssuedTokens(): Promise<IssuedLoginToken[]> {
  await delay()
  return structuredClone(issuedTokens)
}

export async function revokeLoginToken(token: string): Promise<void> {
  await delay(250)

  const record = issuedTokens.find((item) => item.token === token)

  if (!record) {
    throw new Error('Token not found')
  }

  record.revoked = true
  persistIssuedTokens()
}
