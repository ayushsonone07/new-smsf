import { authedApiRequest } from './client'

/**
 * Minimal axios-compatible wrapper over `authedApiRequest`.
 *
 * Exists so modules written against an `apiClient`
 * (`get`/`post`/`put` returning `{ data }`) work with
 * this repo's fetch-based authed client. Auth headers
 * (Bearer token + `username`) come from the session —
 * pass per-request `headers`/`params` as with axios.
 */
interface ApiClientConfig {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
}

function withParams(
  url: string,
  params?: ApiClientConfig['params'],
): string {
  if (!params) return url

  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      qs.append(key, String(value))
    }
  }

  const serialized = qs.toString()
  if (!serialized) return url

  return `${url}${url.includes('?') ? '&' : '?'}${serialized}`
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  config?: ApiClientConfig,
): Promise<{ data: T }> {
  const data = await authedApiRequest<T>(
    withParams(url, config?.params),
    {
      method,
      headers: { ...(config?.headers ?? {}) },
      body:
        body === undefined || body === null
          ? undefined
          : JSON.stringify(body),
    },
  )

  return { data }
}

export const apiClient = {
  get: <T>(url: string, config?: ApiClientConfig) =>
    request<T>('GET', url, undefined, config),
  post: <T>(url: string, body?: unknown, config?: ApiClientConfig) =>
    request<T>('POST', url, body, config),
  put: <T>(url: string, body?: unknown, config?: ApiClientConfig) =>
    request<T>('PUT', url, body, config),
  patch: <T>(url: string, body?: unknown, config?: ApiClientConfig) =>
    request<T>('PATCH', url, body, config),
  delete: <T>(url: string, config?: ApiClientConfig) =>
    request<T>('DELETE', url, undefined, config),
}
