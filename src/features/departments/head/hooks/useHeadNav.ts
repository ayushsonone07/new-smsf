import { useCallback, useMemo } from 'react'
import { getSession } from '../../../../app/auth/session'
import type { IconName } from '../../../../components/head/shared/iconPaths'
import { useDynamicRoutes } from '../../../permissions/hooks/useDynamicPermissions'
import type {
  FeaturePermission,
  HeadScreenKey,
} from '../../../permissions/types/permission.types'
import type { HeadNavItem } from '../types/head.types'

const SCREEN_META: Record<
  string,
  { screen: HeadScreenKey; label: string; icon: IconName }
> = {
  dashboard: { screen: 'dashboard', label: 'Dashboard', icon: 'grid' },
  users: { screen: 'users', label: 'Department Users', icon: 'users' },
  customers: { screen: 'customers', label: 'Customer List', icon: 'users' },
  attendance: { screen: 'attendance', label: 'Attendance', icon: 'clock' },
  meeting: { screen: 'meeting', label: '15 Days Meeting', icon: 'calendar' },
  sop: { screen: 'sop', label: 'SOP', icon: 'flow' },
  'help-center': { screen: 'help-center', label: 'Help Center', icon: 'help' },
}

function normalizeRoute(routeName: string): string {
  return routeName.split('?')[0].replace(/^\/+|\/+$/g, '').toLowerCase()
}

function screenKeyForRoute(slug: string): string {
  if (slug === 'customer-list' || slug.endsWith('-customers')) return 'customers'
  if (slug === 'department-users' || slug.endsWith('-users')) return 'users'
  if (slug === '15-days-meeting' || slug.endsWith('-meeting')) return 'meeting'
  if (slug.endsWith('-attendance')) return 'attendance'
  if (slug.endsWith('-help-center')) return 'help-center'
  if (slug.endsWith('-sop')) return 'sop'
  if (slug === 'dashboard') return 'dashboard'
  return slug
}

function humanizeRoute(slug: string): string {
  return slug
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function routeToFeature(
  route: { routeId: string; routeName: string },
  departmentId: string,
  order: number,
): FeaturePermission {
  const slug = normalizeRoute(route.routeName)
  const meta = SCREEN_META[screenKeyForRoute(slug)]

  return {
    id: route.routeId,
    departmentId,
    name: meta?.label ?? humanizeRoute(slug),
    description: route.routeName,
    enabled: true,
    userVisible: true,
    roleAPermission: 'CAN_EDIT',
    roleBPermission: 'CAN_READ',
    screen: meta?.screen ?? 'custom',
    slug,
    icon: meta?.icon ?? 'grid',
    order,
    category: 'screens',
    kind: 'screen',
  }
}

/** The sidebar is the enabled route list returned by the backend for this department. */
export function useHeadNav(departmentId: string) {
  const session = getSession()
  const role = session?.user.role
  const departmentType = session?.user.departmentType
  const query = useDynamicRoutes(departmentType)
  const basePath = role === 'USER' ? '/users' : '/head'

  const features = useMemo(
    () =>
      (query.data ?? [])
        .filter((route) => {
          if (route.visibility === false) return false
          return role === 'USER'
            ? route.enableUser === true
            : route.enableHead === true
        })
        .map((route, index) => routeToFeature(route, departmentId, index)),
    [departmentId, query.data, role],
  )

  const items = useMemo<HeadNavItem[]>(
    () =>
      features.map((feature) => ({
        key: feature.slug,
        label: feature.name,
        icon: feature.icon,
        to: `${basePath}/${feature.slug}`,
      })),
    [basePath, features],
  )

  const bySlug = useCallback(
    (slug: string): FeaturePermission | undefined => {
      const normalized = normalizeRoute(slug)
      return features.find(
        (feature) =>
          feature.slug === normalized ||
          feature.screen === screenKeyForRoute(normalized),
      )
    },
    [features],
  )

  const isRouteEnabled = useCallback(
    (slugOrPath: string): boolean => bySlug(slugOrPath) !== undefined,
    [bySlug],
  )

  return { ...query, features, items, bySlug, isRouteEnabled }
}
