import { useCallback } from 'react'
import { getSession } from '../../../app/auth/session'
import { useDynamicRoutes } from './useDynamicPermissions'
import type { DynamicColumnResponse, DynamicRouteResponse } from '../../../api/dynamic-permission.api'
import { isUserGoogle, resolveDeptFromPath } from '../../departments/head/utils/routeUtils'

export interface DepartmentRoutePermissionsResult {
  routes: DynamicRouteResponse[]
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isRouteEnabled: (slugOrPathOrName: string) => boolean
  isMasterDisabled: (slugOrPathOrName: string) => boolean
  refetch: () => unknown
}

function normalizeRouteSegment(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/^(\/|#)+/, '')
    .replace(/\/+$/, '')
}

export function extractScreenSlug(str: string): string {
  if (!str) return ''
  const trimmed = str
    .toLowerCase()
    .trim()
    .replace(/^(\/|#)+/, '')
    .replace(/\/+$/, '')
  const parts = trimmed.split('/')
  const last = parts[parts.length - 1] || ''
  return last
    .replace(/^(head|users|user|onboarding-dashboard-head-departmentuser|onboarding-dashboard-head|onboarding|google-head|google-user)[-/]/i, '')
    .replace(/[\s_]+/g, '-')
}

export function areSlugsEquivalent(a: string, b: string): boolean {
  const normA = extractScreenSlug(a)
  const normB = extractScreenSlug(b)
  if (!normA || !normB) return false
  if (normA === normB) return true

  const isUsersA = normA === 'users' || normA === 'department-user' || normA === 'department-users'
  const isUsersB = normB === 'users' || normB === 'department-user' || normB === 'department-users'
  if (isUsersA && isUsersB) return true

  const isCustA =
    normA === 'customers' ||
    normA === 'customer-list' ||
    normA === 'all-customers' ||
    normA === 'manage-department-customers' ||
    normA === 'manage-department-head-customers' ||
    normA === 'autowebision-customers'
  const isCustB =
    normB === 'customers' ||
    normB === 'customer-list' ||
    normB === 'all-customers' ||
    normB === 'manage-department-customers' ||
    normB === 'manage-department-head-customers' ||
    normB === 'autowebision-customers'
  if (isCustA && isCustB) return true

  const isPerfA = normA === 'member-flow' || normA === 'member-performance' || normA === 'members-performance'
  const isPerfB = normB === 'member-flow' || normB === 'member-performance' || normB === 'members-performance'
  if (isPerfA && isPerfB) return true

  const isHelpA = normA === 'help' || normA === 'help-center' || normA === 'help-support'
  const isHelpB = normB === 'help' || normB === 'help-center' || normB === 'help-support'
  if (isHelpA && isHelpB) return true

  const isHistA = normA === 'history' || normA === 'task-history' || normA === 'my-analytics' || normA === 'analytics'
  const isHistB = normB === 'history' || normB === 'task-history' || normB === 'my-analytics' || normB === 'analytics'
  if (isHistA && isHistB) return true

  const isMeetA =
    normA === 'meeting' ||
    normA === 'meetings' ||
    normA === '15-days-meeting' ||
    normA === '15-days-meetings' ||
    normA === '15-day-meeting'
  const isMeetB =
    normB === 'meeting' ||
    normB === 'meetings' ||
    normB === '15-days-meeting' ||
    normB === '15-days-meetings' ||
    normB === '15-day-meeting'
  if (isMeetA && isMeetB) return true

  return false
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

  // 2. Slug equivalence (handles users <-> department-user, customers <-> customer-list, etc.)
  if (areSlugsEquivalent(target, route.routeName || '')) return true
  if (route.routeId && areSlugsEquivalent(target, route.routeId)) return true

  // 3. Suffix / subpath matching:
  if (nameNorm && (tNorm.endsWith(`-${nameNorm}`) || tNorm.endsWith(`/${nameNorm}`))) return true
  if (tNorm && (nameNorm.endsWith(`-${tNorm}`) || nameNorm.endsWith(`/${tNorm}`))) return true

  // 4. Last path segment matching
  const targetLast = tNorm.split('/').pop() || ''
  const nameLast = nameNorm.split('/').pop() || ''
  if (targetLast && nameLast && (targetLast === nameLast || areSlugsEquivalent(targetLast, nameLast))) {
    return true
  }

  return false
}

/**
 * Determines whether a column belongs to a given route.
 * Supports:
 * - Direct routeId match (handles exact UUID match and comma-separated routesType)
 * - Exact routeName match or suffix match
 * - Slug equivalence (e.g. users <-> department-user, customers <-> customer-list)
 */
export function isColumnBelongingToRoute(
  column: DynamicColumnResponse,
  route: DynamicRouteResponse,
): boolean {
  if (!column || !route) return false

  const targetRouteId = (route.routeId || '').trim().toLowerCase()
  const targetRouteName = (route.routeName || '').trim().toLowerCase()

  // 1. Direct routeId match (highest priority, avoids ambiguity)
  if (targetRouteId) {
    if (column.routeId && column.routeId.trim().toLowerCase() === targetRouteId) {
      return true
    }
    if (column.routesType) {
      const ids = column.routesType.split(',').map((s) => s.trim().toLowerCase())
      if (ids.includes(targetRouteId)) {
        return true
      }
    }
  }

  // 2. Route name / slug match
  if (targetRouteName) {
    if (column.routeName) {
      const colRouteNames = column.routeName.split(',').map((s) => s.trim().toLowerCase())
      for (const crn of colRouteNames) {
        if (crn === targetRouteName) return true
        if (areSlugsEquivalent(crn, targetRouteName)) return true
        if (crn.endsWith(`/${targetRouteName}`) || targetRouteName.endsWith(`/${crn}`)) return true
      }
    }

    if (column.routesType) {
      const parts = column.routesType.split(',').map((s) => s.trim().toLowerCase())
      for (const part of parts) {
        if (part === targetRouteName || areSlugsEquivalent(part, targetRouteName)) {
          return true
        }
      }
    }
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
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const isGoogle = isUserGoogle(departmentType || session?.user.departmentType)
  const dept = isGoogle
    ? 'GOOGLE_DEPARTMENT'
    : (departmentType || session?.user.departmentType || deptFromUrl || 'ONBOARDING_DEPARTMENT')
  const isHead = session?.user.role !== 'USER'

  const query = useDynamicRoutes(dept)
  const routes = query.data ?? []

  const isMasterDisabled = useCallback(
    (slugOrPathOrName: string): boolean => {
      if (!slugOrPathOrName || routes.length === 0) return false
      const matching = routes.find((r) => isRouteMatch(r, slugOrPathOrName))
      if (matching) {
        if (matching.visibility === false || (matching.visibility as unknown) === 0) return true
        if (isHead && (matching.enableHead === false || (matching.enableHead as unknown) === 0)) return true
        if (!isHead && (matching.enableUser === false || (matching.enableUser as unknown) === 0)) return true
      }
      return false
    },
    [routes, isHead],
  )

  const isRouteEnabled = useCallback(
    (slugOrPathOrName: string): boolean => {
      if (!slugOrPathOrName) return false
      // If no dynamic routes exist in DB yet, don't block display
      if (routes.length === 0) return true

      const matching = routes.find((r) => isRouteMatch(r, slugOrPathOrName))
      if (matching) {
        // If master visibility is false/0, route is completely disabled
        if (matching.visibility === false || (matching.visibility as unknown) === 0) return false

        // Check role-specific enable flag: allowed by default unless explicitly disabled with false/0
        return isHead
          ? matching.enableHead !== false && (matching.enableHead as unknown) !== 0
          : matching.enableUser !== false && (matching.enableUser as unknown) !== 0
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
    isMasterDisabled,
    refetch: query.refetch,
  }
}

