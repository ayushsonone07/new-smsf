import { useMemo } from 'react'
import { useDepartmentFeatures } from '../../../permissions/hooks/useDepartmentFeatures'
import {
  isRouteMatch,
  useDepartmentRoutePermissions,
} from '../../../permissions/hooks/useDepartmentRoutePermissions'
import type { HeadNavItem } from '../types/head.types'
import type { FeaturePermission, HeadScreenKey } from '../../../permissions/types/permission.types'
import type { IconName } from '../../../../components/head/shared/iconPaths'
import { getSession } from '../../../../app/auth/session'
import {
  buildDepartmentRoute,
  buildGoogleRoute,
  buildOnboardingRoute,
  isUserGoogle,
  isUserOnboarding,
  resolveDeptFromPath,
} from '../utils/routeUtils'

const DEPARTMENT_USER_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'meeting', label: '15 Days Meeting', icon: 'calendar', slug: 'meeting', screen: 'meeting' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
]

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

const GOOGLE_USER_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customers', screen: 'customers' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'help-support', label: 'Help & Support', icon: 'help', slug: 'help-support', screen: 'help-support' },
]

const DYNAMIC_DEPARTMENT_HEAD_SCREENS: Array<{
  key: string
  label: string
  icon: IconName
  slug: string
  screen: HeadScreenKey
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', slug: 'dashboard', screen: 'dashboard' },
  { key: 'users', label: 'Department User', icon: 'users', slug: 'department-user', screen: 'department-user' },
  { key: 'customers', label: 'Customer List', icon: 'list', slug: 'customer-list', screen: 'customer-list' },
  { key: 'history', label: 'History', icon: 'history', slug: 'history', screen: 'history' },
  { key: 'service-flow', label: 'Service Flow', icon: 'flow', slug: 'service-flow', screen: 'service-flow' },
  { key: 'member-flow', label: 'Member Performance', icon: 'perf', slug: 'member-performance', screen: 'member-performance' },
  { key: 'attendance', label: 'Attendance', icon: 'clock', slug: 'attendance', screen: 'attendance' },
  { key: 'analytics', label: 'Analytics', icon: 'bar', slug: 'analytics', screen: 'analytics' },
  { key: 'meeting', label: '15 Days Meeting', icon: 'calendar', slug: 'meeting', screen: 'meeting' },
  { key: 'sop', label: 'SOP', icon: 'book', slug: 'sop', screen: 'sop' },
  { key: 'help-support', label: 'Help & Support', icon: 'help', slug: 'help-support', screen: 'help-support' },
]

function extractCleanSlug(routeName: string): string {
  const trimmed = routeName
    .trim()
    .replace(/^(\/|#)+/, '')
    .replace(/\/+$/, '')
  const parts = trimmed.split('/')
  const last = parts[parts.length - 1]
  const cleaned = last
    .replace(/^(head|users|onboarding-dashboard-head-departmentuser|onboarding-dashboard-head|onboarding|google-head|google-user)[-/]/i, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
  return cleaned || 'custom'
}

function formatRouteLabel(slugOrName: string): string {
  const cleaned = extractCleanSlug(slugOrName)
  return cleaned
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Sidebar items for a department:
 * - For Department User: strictly [Dashboard, Attendance, Customer List, 15 Days Meeting, History] (+ custom DB routes)
 * - For Google Department Head: strictly [Dashboard, Department User, Customer List, History, Analytics, Service Flow, Member Flow, Help & Support]
 * - For Google Department User: strictly [Dashboard, Attendance, Customer List, History, Help & Support]
 * - For Onboarding Head: enabled feature permissions in admin-defined order
 * - For Dynamic / Other Departments: standard department screens + custom DB routes in `access_routes`
 * Filtered by live DB route visibility (if visibility is 0, item is not displayed).
 */
export function useHeadNav(departmentId: string, departmentType?: string) {
  const query = useDepartmentFeatures(departmentId)
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const effectiveDeptType = departmentType || session?.user.departmentType || deptFromUrl || undefined
  const role = session?.user.role
  const isUser = role === 'USER'
  const isGoogle = isUserGoogle(effectiveDeptType)
  const isOnboarding = isUserOnboarding(effectiveDeptType)
  const basePath = isUser ? '/users' : '/head'

  const routePerms = useDepartmentRoutePermissions(effectiveDeptType)

  const features = useMemo<FeaturePermission[]>(() => {
    if (isGoogle) {
      const screensList = isUser ? GOOGLE_USER_SCREENS : GOOGLE_HEAD_SCREENS
      return screensList.map((item, index) => {
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

    if (isUser) {
      const baseUserFeatures: FeaturePermission[] = DEPARTMENT_USER_SCREENS
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            (!isOnboarding ||
              routePerms.isRouteEnabled(buildOnboardingRoute(item.slug, role))),
        )
        .map((item, index) => {
          const existing = (query.data ?? []).find(
            (f) => f.slug === item.slug || f.screen === item.screen,
          )
          return {
            id: existing?.id ?? `user-feat-${item.slug}`,
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

      if (!isOnboarding && routePerms.routes.length > 0) {
        const customUserFeatures: FeaturePermission[] = routePerms.routes
          .filter(
            (r) =>
              r.routeName &&
              routePerms.isRouteEnabled(r.routeName) &&
              !baseUserFeatures.some((f) => isRouteMatch(r, f.slug)),
          )
          .map((r, idx) => {
            const cleanSlug = extractCleanSlug(r.routeName)
            const matchedStd = DYNAMIC_DEPARTMENT_HEAD_SCREENS.find(
              (s) => s.slug === cleanSlug || isRouteMatch(r, s.slug),
            )
            return {
              id: `custom-route-${r.routeId || cleanSlug}`,
              departmentId,
              name: matchedStd?.label ?? formatRouteLabel(r.routeName),
              description: `Dynamic route (${r.routeName})`,
              enabled: true,
              userVisible: true,
              roleAPermission: 'CAN_EDIT',
              roleBPermission: 'CAN_READ',
              screen: matchedStd?.screen ?? 'custom',
              slug: matchedStd?.slug ?? cleanSlug,
              icon: matchedStd?.icon ?? 'brief',
              order: baseUserFeatures.length + idx,
              category: 'screens',
              kind: 'screen',
            }
          })
        return [...baseUserFeatures, ...customUserFeatures]
      }

      return baseUserFeatures
    }

    // Non-Onboarding & Non-Google Dynamic Department Head:
    if (!isOnboarding) {
      const hasConfiguredRoutes = routePerms.routes.length > 0
      const stdFeatures: FeaturePermission[] = DYNAMIC_DEPARTMENT_HEAD_SCREENS
        .filter((item) => {
          if (!routePerms.isRouteEnabled(item.slug)) return false
          if (!hasConfiguredRoutes) {
            // Default environment when no DB routes exist yet
            return item.slug !== 'meeting' && item.slug !== 'sop'
          }
          // Strictly show only routes configured in DB for this department
          return routePerms.routes.some((r) => isRouteMatch(r, item.slug))
        })
        .map((item, index) => ({
          id: `dyn-feat-${item.slug}`,
          departmentId,
          name: item.label,
          description: item.label,
          enabled: true,
          userVisible: true,
          roleAPermission: 'CAN_EDIT',
          roleBPermission: 'CAN_READ',
          screen: item.screen,
          slug: item.slug,
          icon: item.icon,
          order: index,
          category: 'screens',
          kind: 'screen',
        }))

      const customFeatures: FeaturePermission[] = routePerms.routes
        .filter(
          (r) =>
            r.routeName &&
            routePerms.isRouteEnabled(r.routeName) &&
            !stdFeatures.some((f) => isRouteMatch(r, f.slug)),
        )
        .map((r, idx) => {
          const cleanSlug = extractCleanSlug(r.routeName)
          return {
            id: `custom-route-${r.routeId || cleanSlug}`,
            departmentId,
            name: formatRouteLabel(r.routeName),
            description: `Dynamic route (${r.routeName})`,
            enabled: true,
            userVisible: true,
            roleAPermission: 'CAN_EDIT',
            roleBPermission: 'CAN_READ',
            screen: 'custom',
            slug: cleanSlug,
            icon: 'brief',
            order: stdFeatures.length + idx,
            category: 'screens',
            kind: 'screen',
          }
        })

      return [...stdFeatures, ...customFeatures]
    }

    return (query.data ?? [])
      .filter(
        (feature) =>
          feature.kind === 'screen' &&
          feature.enabled &&
          routePerms.isRouteEnabled(feature.slug) &&
          routePerms.isRouteEnabled(buildOnboardingRoute(feature.slug, role)),
      )
      .sort((a, b) => a.order - b.order)
  }, [isGoogle, isUser, isOnboarding, query.data, departmentId, role, routePerms])

  const items = useMemo<HeadNavItem[]>(() => {
    if (isGoogle) {
      const screensList = isUser ? GOOGLE_USER_SCREENS : GOOGLE_HEAD_SCREENS
      return screensList.map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon,
        to: buildGoogleRoute(item.slug, role),
      }))
    }

    if (isUser && isOnboarding) {
      return DEPARTMENT_USER_SCREENS
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            routePerms.isRouteEnabled(buildOnboardingRoute(item.slug, role)) &&
            // Hide "Fetch R/C" from the sidebar for every role (ADMIN, HEAD, USER)
            item.slug !== 'fetch-rc',
        )
        .map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          to: buildOnboardingRoute(item.slug, role),
        }))
    }

    return features
      .filter((feature) => feature.slug !== 'fetch-rc')
      .map((feature) => ({
        key: feature.slug,
        label: feature.name,
        icon: feature.icon,
        to: isOnboarding
          ? buildOnboardingRoute(feature.slug, role)
          : buildDepartmentRoute(feature.slug, effectiveDeptType, role),
      }))
  }, [isGoogle, isUser, features, basePath, isOnboarding, role, routePerms, effectiveDeptType])

  const PROFILE_MENU_SCREENS: Record<
    string,
    { name: string; description: string; screen: HeadScreenKey; icon: IconName }
  > = {
    'airtel-calls': {
      name: 'My Airtel Calls',
      description: 'Call history and analytics',
      screen: 'airtel-calls',
      icon: 'phone',
    },
    'manage-services': {
      name: 'Manage Services',
      description: 'Manage department service offerings and plans',
      screen: 'manage-services',
      icon: 'settings',
    },
    'salary-management': {
      name: 'Salary Management',
      description: 'Manage employee salaries, targets, and incentives',
      screen: 'salary-management',
      icon: 'trend',
    },
  }

  const bySlug = (slug: string): FeaturePermission | undefined => {
    const s = slug === 'customer-list' ? 'customers' : slug

    if (PROFILE_MENU_SCREENS[s]) {
      const meta = PROFILE_MENU_SCREENS[s]
      return {
        id: `feature-${s}`,
        departmentId,
        name: meta.name,
        description: meta.description,
        screen: meta.screen,
        slug: s,
        icon: meta.icon,
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    if (!isGoogle && !routePerms.isRouteEnabled(s)) {
      return undefined
    }
    const found = features.find(
      (feature) =>
        feature.slug === s ||
        feature.screen === s ||
        (s === 'customers' && feature.slug === 'customer-list') ||
        (s === 'customer-list' && feature.slug === 'customers') ||
        (s === 'department-user' && (feature.slug === 'users' || feature.slug === 'department-user')) ||
        (s === 'users' && (feature.slug === 'department-user' || feature.slug === 'users')) ||
        (s === 'member-performance' && (feature.slug === 'member-flow' || feature.slug === 'member-performance')) ||
        (s === 'member-flow' && (feature.slug === 'member-performance' || feature.slug === 'member-flow')),
    )
    if (found) return found

    if (!isGoogle && !isOnboarding && routePerms.routes.length > 0) {
      const matchedDbRoute = routePerms.routes.find(
        (r) => extractCleanSlug(r.routeName) === s || isRouteMatch(r, s),
      )
      if (!matchedDbRoute) {
        return undefined
      }
      const matchedStd = DYNAMIC_DEPARTMENT_HEAD_SCREENS.find(
        (item) => item.slug === s || item.screen === s || isRouteMatch(matchedDbRoute, item.slug),
      )
      return {
        id: `dyn-feat-${s}`,
        departmentId,
        name: matchedStd?.label ?? formatRouteLabel(matchedDbRoute.routeName || s),
        description: matchedStd?.label ?? `Dynamic route (${matchedDbRoute.routeName})`,
        screen: matchedStd?.screen ?? 'custom',
        slug: matchedStd?.slug ?? s,
        icon: matchedStd?.icon ?? 'brief',
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    const dynamicFallback = DYNAMIC_DEPARTMENT_HEAD_SCREENS.find(
      (item) => item.slug === s || item.screen === s,
    )
    if (dynamicFallback) {
      return {
        id: `dyn-feat-${dynamicFallback.slug}`,
        departmentId,
        name: dynamicFallback.label,
        description: dynamicFallback.label,
        screen: dynamicFallback.screen,
        slug: dynamicFallback.slug,
        icon: dynamicFallback.icon,
        enabled: true,
        kind: 'screen',
        order: 99,
        roleAPermission: 'CAN_EDIT',
        roleBPermission: 'CAN_READ',
        category: 'screens',
      }
    }

    const matchedCustomRoute = routePerms.routes.find(
      (r) => extractCleanSlug(r.routeName) === s || isRouteMatch(r, s),
    )
    if (matchedCustomRoute) {
      return {
        id: `custom-route-${matchedCustomRoute.routeId || s}`,
        departmentId,
        name: formatRouteLabel(matchedCustomRoute.routeName || s),
        description: `Dynamic route (${matchedCustomRoute.routeName})`,
        screen: 'custom',
        slug: s,
        icon: 'brief',
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

  const isRouteEnabled = (slugOrPath: string): boolean => {
    if (isGoogle) return true
    if (
      slugOrPath === 'airtel-calls' ||
      slugOrPath === 'manage-services' ||
      slugOrPath === 'salary-management'
    ) {
      return true
    }
    return routePerms.isRouteEnabled(slugOrPath)
  }

  return {
    ...query,
    features,
    items,
    bySlug,
    isRouteEnabled,
    routesQuery: routePerms,
  }
}