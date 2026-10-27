import { authedApiRequest } from './client'

/** One row of `GET /api/auth/routs` (session-scoped, JWT-derived). */
export interface MyRoute {
  routeId: string
  routeName: string
}

/**
 * One row of `GET /api/auth/my-column-permissions`.
 * Only columns of the user's allowed routes that the admin made visible
 * are returned, so every field is always set. `routeId` is the one route
 * (screen) the column belongs to; `access` is `"12"` (read+write),
 * `"1"` (read) or `"2"` (write).
 */
export interface MyColumnPermission {
  columnId: string
  columnName: string
  routeId: string
  access: string
}

interface BackendEnvelope<T> {
  data?: T
  success?: boolean
  message?: string
}

/** Routes assigned to the signed-in user's role + department. */
export async function getMyRoutes(): Promise<MyRoute[]> {
  const res = await authedApiRequest<
    BackendEnvelope<MyRoute[]> | MyRoute[]
  >('/api/auth/routs')

  if (Array.isArray(res)) {
    return res
  }

  return Array.isArray(res?.data) ? res.data : []
}

/** Column permissions of the signed-in user's role + department. */
export async function getMyColumnPermissions(): Promise<
  MyColumnPermission[]
> {
  const res = await authedApiRequest<
    BackendEnvelope<MyColumnPermission[]> | MyColumnPermission[]
  >('/api/auth/my-column-permissions')

  if (Array.isArray(res)) {
    return res
  }

  return Array.isArray(res?.data) ? res.data : []
}

/** Human label for the backend `access` flag. */
export function accessLabel(
  access: string | null | undefined,
): string {
  if (access === '12') {
    return 'Read + Write'
  }

  if (access === '1') {
    return 'Read'
  }

  if (access === '2') {
    return 'Write'
  }

  return 'No access'
}
