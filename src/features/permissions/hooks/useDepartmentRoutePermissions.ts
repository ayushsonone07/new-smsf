import { useCallback } from 'react'
import { getSession } from '../../../app/auth/session'
import { useDynamicRoutes } from './useDynamicPermissions'
import type { DynamicRouteResponse } from '../../../api/dynamic-permission.api'

export interface DepartmentRoutePermissionsResult {
  routes: DynamicRouteResponse[]
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isRouteEnabled: (slugOrPathOrName: string) => boolean
  refetch: () => unknown
}

function normalizeRouteSegment(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/^(\/|#)+/, '')
    .replace(/\/+$/, '')
}

/**
 * Checks whether a given DB route matches a target name, slug, or path.
 */
export function isRouteMatch(route: DynamicRouteResponse, target: string): boolean {
  if (!route || !target) return false
  const tNorm = normalizeRouteSegment(target)
  const nameNorm = normalizeRouteSegment(route.routeName || '')
  const idNorm = normalizeRouteSegment(route.routeId || '')

  if (!tNorm) return false

  // 1. Direct exact equality
  if (tNorm === nameNorm || tNorm === idNorm) return true

  // 1b. Dashboard routes mapping: /onboarding-user is the user dashboard
  if (
    tNorm === 'onboarding-user' ||
    tNorm === 'onboarding-dashboard-head-departmentuser' ||
    tNorm === 'onboarding-dashboard-head' ||
    tNorm === 'onboarding'
  ) {
    return nameNorm === 'dashboard' || idNorm === 'dashboard'
  }

  // 1c. History route mapping
  if (
    tNorm === 'history' ||
    tNorm === 'task-history' ||
    tNorm === 'onboarding-dashboard-head-departmentuser-history' ||
    tNorm === 'onboarding-dashboard-head-history'
  ) {
    if (
      nameNorm === 'history' ||
      nameNorm === 'task-history' ||
      nameNorm === 'my-analytics' ||
      nameNorm === 'analytics' ||
      idNorm === 'history'
    ) {
      return true
    }
  }

  // 2. Slug aliases (e.g. 'customer-list' <-> 'customers')
  const tAlias =
    tNorm === 'customer-list' ? 'customers' : tNorm === 'customers' ? 'customer-list' : tNorm
  if (tAlias === nameNorm) return true

  // 3. Suffix / subpath matching:
  // e.g. target="/onboarding-dashboard-head-meeting", routeName="meeting" or "/head/meeting"
  if (nameNorm && (tNorm.endsWith(`-${nameNorm}`) || tNorm.endsWith(`/${nameNorm}`))) return true
  if (tNorm && (nameNorm.endsWith(`-${tNorm}`) || nameNorm.endsWith(`/${tNorm}`))) return true

  // 4. Last segment matching:
  // e.g. target="onboarding-dashboard-head-meeting", last segment="meeting"
  // name="head/meeting", last segment="meeting"
  const targetLast = tNorm.split(/[-/]/).pop() || ''
  const nameLast = nameNorm.split(/[-/]/).pop() || ''
  if (targetLast && nameLast && targetLast === nameLast) {
    return true
  }

  // Handle customer list last segment alias
  const targetLastAlias =
    targetLast === 'customer-list'
      ? 'customers'
      : targetLast === 'customers'
        ? 'customer-list'
        : targetLast
  if (targetLastAlias && nameLast && targetLastAlias === nameLast) {
    return true
  }

  return false
}

/**
 * Hook to validate dynamic route permissions for a department & role.
 *
 * If a route's visibility is 0 (false) or disabled for current role:
 * isRouteEnabled(target) returns FALSE so that particular UI (tab, button, page) is NOT displayed.
 */
export function useDepartmentRoutePermissions(
  departmentType?: string,
): DepartmentRoutePermissionsResult {
  const session = getSession()
  const dept = departmentType || session?.user.departmentType || 'ONBOARDING_DEPARTMENT'
  const isHead = session?.user.role !== 'USER'

  const query = useDynamicRoutes(dept)
  const routes = query.data ?? []

  const isRouteEnabled = useCallback(
    (slugOrPathOrName: string): boolean => {
      if (!slugOrPathOrName) return false
      // If no dynamic routes exist in DB yet, don't block display
      if (routes.length === 0) return true

      const matching = routes.find((r) => isRouteMatch(r, slugOrPathOrName))
      if (matching) {
        // If master visibility is false/0, route is completely disabled
        if (matching.visibility === false) return false

        // Check role-specific enable flag
        return isHead
          ? Boolean(matching.enableHead ?? matching.visibility ?? false)
          : Boolean(matching.enableUser ?? matching.visibility ?? false)
      }

      // If route not explicitly configured in DB, allow display
      return true
    },
    [routes, isHead],
  )

  return {
    routes,
    isLoading: query.isLoading,
    isPending: query.isPending,
    isError: query.isError,
    isRouteEnabled,
    refetch: query.refetch,
  }
}

