import { useCallback, useMemo } from 'react'
import { getSession } from '../../../../app/auth/session'
import {
  buildGoogleRoute,
  buildOnboardingRoute,
  isUserGoogle,
  isUserOnboarding,
} from '../utils/routeUtils'

const SCREEN_META: Record<
  string,
  { screen: HeadScreenKey; label: string; icon: IconName }
> = {
  dashboard: { screen: 'dashboard', label: 'Dashboard', icon: 'grid' },
  users: { screen: 'users', label: 'Department Users', icon: 'users' },
  customers: { screen: 'customers', label: 'Customer List', icon: 'users' },
  attendance: { screen: 'attendance', label: 'Attendance', icon: 'clock' },
  meeting: { screen: 'meeting', label: '15 Days Meeting', icon: 'calendar' },
  sop: { screen: 'sop', label: 'SOP', icon: 'workflow' },
  'help-center': { screen: 'help-center', label: 'Help Center', icon: 'help' },
}

function normalizeRoute(routeName: string): string {
  return routeName.split('?')[0].replace(/^\/+|\/+$/g, '').toLowerCase()
}

const GOOGLE_HEAD_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'users', label: 'Department User', icon: 'users', slug: 'users', screen: 'users' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'analytics', label: 'Analytics', icon: 'bar', slug: 'analytics', screen: 'analytics' },
  { key: 'service-flow', label: 'Service Flow', icon: 'flow', slug: 'service-flow', screen: 'service-flow' },
  { key: 'member-flow', label: 'Member Flow', icon: 'perf', slug: 'member-flow', screen: 'member-flow' },
  { key: 'help-support', label: 'Help & Support', icon: 'help', slug: 'help-support', screen: 'help-support' },
]

/**
 * Sidebar items for a department:
 * - For Department User: strictly [Dashboard, Attendance, Customer List, 15 Days Meeting, History]
 * - For Google Department Head: strictly [Dashboard, Department User, Customer List, History, Analytics, Service Flow, Member Flow, Help & Support]
 * - For Onboarding Head: enabled feature permissions in admin-defined order
 * Filtered by live DB route visibility (if visibility is 0, item is not displayed).
 */
export function useHeadNav(departmentId: string) {
  const session = getSession()
  const role = session?.user.role
  const isUser = role === 'USER'
  const isGoogle = isUserGoogle(session?.user.departmentType)
  const isOnboarding = isUserOnboarding(session?.user.departmentType)
  const basePath = isUser ? '/users' : '/head'

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

    if (isGoogle) {
      return GOOGLE_HEAD_SCREENS
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            routePerms.isRouteEnabled(buildGoogleRoute(item.slug, role)),
        )
        .map((item, index) => {
          const existing = (query.data ?? []).find(
            (f) => f.slug === item.slug || f.screen === item.screen,
          )
          return {
            id: existing?.id ?? `google-feat-${item.slug}`,
            departmentId,
            name: item.label,
            description: existing?.description ?? item.label,
            enabled: true,
            userVisible: true,
            roleAPermission: existing?.roleAPermission ?? 'CAN_EDIT',
            roleBPermission: existing?.roleBPermission ?? 'CAN_READ',
            screen: item.screen,
            slug: item.slug,
            icon: item.icon,
            order: index,
            category: 'screens',
            kind: 'screen',
          }
        })
    }

    return (query.data ?? [])
      .filter(
        (feature) =>
          feature.slug === normalized ||
          feature.screen === screenKeyForRoute(normalized),
      )
      .sort((a, b) => a.order - b.order)
  }, [isUser, isGoogle, query.data, departmentId, role, routePerms])

  const items = useMemo<HeadNavItem[]>(() => {
    if (isUser) {
      return DEPARTMENT_USER_SCREENS
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            routePerms.isRouteEnabled(buildOnboardingRoute(item.slug, role)),
        )
        .map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          to: isOnboarding
            ? buildOnboardingRoute(item.slug, role)
            : `${basePath}/${item.slug}`,
        }))
    }

    if (isGoogle) {
      return GOOGLE_HEAD_SCREENS
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            routePerms.isRouteEnabled(buildGoogleRoute(item.slug, role)),
        )
        .map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          to: buildGoogleRoute(item.slug, role),
        }))
    }

    return features.map((feature) => ({
      key: feature.slug,
      label: feature.name,
      icon: feature.icon,
      to: isOnboarding
        ? buildOnboardingRoute(feature.slug, role)
        : `${basePath}/${feature.slug}`,
    }))
  }, [isUser, isGoogle, features, basePath, isOnboarding, role, routePerms])

  const bySlug = (slug: string): FeaturePermission | undefined => {
    const s = slug === 'customer-list' ? 'customers' : slug
    if (!routePerms.isRouteEnabled(s)) {
      return undefined
    }
    const found = features.find(
      (feature) =>
        feature.slug === s ||
        feature.screen === s ||
        (s === 'customers' && feature.slug === 'customer-list') ||
        (s === 'customer-list' && feature.slug === 'customers'),
    )
    if (found) return found

    const googleFallback = GOOGLE_HEAD_SCREENS.find(
      (item) => item.slug === s || item.screen === s,
    )
    if (googleFallback) {
      return {
        id: `google-feat-${googleFallback.slug}`,
        departmentId,
        name: googleFallback.label,
        description: googleFallback.label,
        screen: googleFallback.screen,
        slug: googleFallback.slug,
        icon: googleFallback.icon,
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    if (s === 'history') {
      return {
        id: 'feature-history',
        departmentId,
        name: 'History',
        description: 'Task history & analytics',
        screen: 'history',
        slug: 'history',
        icon: 'history',
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    return undefined
  }

  return {
    ...query,
    features,
    items,
    bySlug,
    isRouteEnabled: routePerms.isRouteEnabled,
    routesQuery: routePerms,
  }
}
