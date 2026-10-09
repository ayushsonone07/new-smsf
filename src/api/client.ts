import { getSession } from '../app/auth/session'

const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'

interface ApiErrorResponse {
  message?: string
  error?: string
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
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const errorData = (await response.json()) as ApiErrorResponse

      message =
        errorData.message ||
        errorData.error ||
        message
    } catch {
      // Response wasn't JSON.
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

/**
 * Session-bound variant of `apiRequest`.
 *
 * The backend's department APIs expect the login JWT plus a
 * `username` header that must equal the token's `sub` claim
 * (the account email), see OnboardingDashboardService.
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
      username: session.user.email,
      ...options.headers,
    },
  })
}