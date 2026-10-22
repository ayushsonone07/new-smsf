import { apiRequest, ApiError } from './client'
import { getSession } from '../app/auth/session'
import type {
  AuthSession,
  AuthUser,
  UserRole,
} from '../features/auth/types/auth.types'

/** Raw payload inside the backend's `CustomApiResponse.data` envelope. */
interface BackendLoginData {
  id?: number | string
  username?: string
  email?: string
  role?: string
  accessToken?: string
  refreshToken?: string
  departmentType?: string
  phoneNumber?: string
  contact?: string
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

export function decodeJwtClaims(
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
  const claimId = typeof claims.id === 'string' || typeof claims.id === 'number'
    ? claims.id
    : typeof claims.userId === 'string' || typeof claims.userId === 'number'
      ? claims.userId
      : undefined
  const claimRole = typeof claims.role === 'string' ? claims.role : undefined
  const claimIsHead = typeof claims.isHead === 'boolean' ? claims.isHead : undefined
  const claimDept = typeof claims.departmentType === 'string' ? claims.departmentType : undefined
  const claimPhone = typeof claims.phoneNumber === 'string'
    ? claims.phoneNumber
    : typeof claims.contact === 'string'
      ? claims.contact
      : undefined

  const email = (claimEmail || data.email || data.username || '').trim()

  if (!email) {
    throw new Error('Login response did not include an email/username')
  }

  const rawPhone = (data.phoneNumber || data.contact || claimPhone || '').trim()
  const phoneNumber =
    rawPhone && rawPhone !== 'XXXXXXXXXX' ? rawPhone : undefined

  const user: AuthUser = {
    id: String(data.id ?? claimId ?? email),
    name: data.username || email,
    email,
    username: claimEmail || email,
    role: mapBackendRole(data.role ?? claimRole, data.isHead ?? claimIsHead),
    departmentType: data.departmentType || claimDept || undefined,
    phoneNumber,
    contact: phoneNumber,
  }

  return {
    token,
    user,
    issuedAt: new Date().toISOString(),
  }
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
    // Backend answered with a validation error (401/400/500) — surface it.
    if (error instanceof ApiError) {
      throw new Error(error.message || 'Invalid email or password', {
        cause: error,
      })
    }

    // The backend is unreachable (network down / wrong VITE_API_BASE_URL).
    throw new Error('Unable to reach the server. Please try again.', {
      cause: error,
    })
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
