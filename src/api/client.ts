import { getSession } from '../app/auth/session'
import { ACTIVE_API_BASE_URL } from '../config/api.config'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ACTIVE_API_BASE_URL
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
  [key: string]: unknown
}

function getApiErrorMessage(
  errorData: ApiErrorResponse & Record<string, unknown>,
  fallback: string,
): string {
  if (errorData.message) return errorData.message
  if (errorData.error && typeof errorData.error === 'string') {
    // Backend validation failures (MethodArgumentNotValidException) return a
    // field->message map like { username: "...", password: "...", status: 400 }
    // with NO `message` key. Surface the field messages instead of generic
    // "Bad Request".
    const ignored = new Set([
      'error',
      'status',
      'cause',
      'timestamp',
      'timeStamp',
    ])
    const fieldMessages = Object.entries(errorData)
      .filter(
        ([key, value]) =>
          !ignored.has(key) && typeof value === 'string' && value.trim(),
      )
      .map(([, value]) => value as string)
    if (fieldMessages.length > 0) return fieldMessages.join(' ')
    return errorData.error
  }
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
  // Let the browser set the multipart boundary for FormData bodies;
  // forcing application/json breaks file uploads.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData
  publishApiActivity(1)
  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      cache: options.cache ?? (options.method == null || options.method === 'GET' ? 'no-store' : undefined),
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

export async function authedFileRequest(
  endpoint: string,
): Promise<{ blob: Blob; fileName?: string }> {
  const session = getSession()
  if (!session) throw new ApiError('Not signed in', 401)

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${normalizedEndpoint}`
  publishApiActivity(1)
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/pdf, application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Authorization: `Bearer ${session.token}`,
        username: session.user.email || session.user.username || '',
        'ngrok-skip-browser-warning': 'true',
      },
    })
    if (!response.ok) {
      let message = `Export failed with status ${response.status}`
      try {
        const errorData = (await response.json()) as ApiErrorResponse & Record<string, unknown>
        message = getApiErrorMessage(errorData, message)
      } catch {
        // Non-JSON error response.
      }
      throw new ApiError(message, response.status)
    }
    const disposition = response.headers.get('content-disposition') || ''
    const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
    return { blob: await response.blob(), fileName }
  } finally {
    publishApiActivity(-1)
  }
}
