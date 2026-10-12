import { getSession } from '../app/auth/session'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'
).replace(/\/$/, '')

type ApiActivityListener = (activeRequests: number) => void
let activeApiRequests = 0
const apiActivityListeners = new Set<ApiActivityListener>()

function publishApiActivity(delta: number) {
  activeApiRequests = Math.max(0, activeApiRequests + delta)
  apiActivityListeners.forEach((listener) => listener(activeApiRequests))
}

export function subscribeToApiActivity(listener: ApiActivityListener) {
  apiActivityListeners.add(listener)
  listener(activeApiRequests)
  return () => {
    apiActivityListeners.delete(listener)
  }
}

interface ApiErrorResponse {
  message?: string
  error?: string
  details?: string | Record<string, string>
}

function getApiErrorMessage(
  errorData: ApiErrorResponse,
  fallback: string,
): string {
  if (errorData.message) return errorData.message
  if (errorData.error) return errorData.error
  if (typeof errorData.details === 'string') return errorData.details

  if (errorData.details && typeof errorData.details === 'object') {
    const detail = Object.values(errorData.details).find(Boolean)
    if (detail) return detail
  }

  return fallback
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${normalizedEndpoint}`
  publishApiActivity(1)
  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
    })
  } finally {
    publishApiActivity(-1)
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const errorData = (await response.json()) as ApiErrorResponse

      message = getApiErrorMessage(errorData, message)
    } catch {
      // Response wasn't JSON.
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type')
  if (contentType && !contentType.includes('application/json')) {
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      return text as unknown as T
    }
  }

  try {
    return (await response.json()) as T
  } catch {
    return undefined as unknown as T
  }
}

/**
 * Session-bound variant of `apiRequest`.
 *
 * The backend's department APIs expect the login JWT plus a
 * `username` header that must equal the token's `sub` claim.
 * The backend username can differ from the account email, so preserve and
 * prefer the exact identity returned by login.
 */
export async function authedApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession()

  if (!session) {
    throw new ApiError('Not signed in', 401)
  }

  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.token}`,
      username: session.user.email || session.user.username || '',
      ...options.headers,
    },
  })
}
