import { useMemo } from 'react'
import { useDepartmentFeatures } from '../../../permissions/hooks/useDepartmentFeatures'
import { useDepartmentRoutePermissions } from '../../../permissions/hooks/useDepartmentRoutePermissions'
import type { HeadNavItem } from '../types/head.types'
import type { FeaturePermission, HeadScreenKey } from '../../../permissions/types/permission.types'
import type { IconName } from '../../../../components/head/shared/iconPaths'
import { getSession } from '../../../../app/auth/session'
import {
  buildOnboardingRoute,
  isUserOnboarding,
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

/**
 * Sidebar items for a department:
 * - For Department User: strictly [Dashboard, Attendance, Customer List, 15 Days Meeting, History]
 * - For Head: enabled feature permissions in admin-defined order
 * Filtered by live DB route visibility (if visibility is 0, item is not displayed).
 */
export function useHeadNav(departmentId: string) {
  const query = useDepartmentFeatures(departmentId)
  const session = getSession()
  const role = session?.user.role
  const isUser = role === 'USER'
  const isOnboarding = isUserOnboarding(session?.user.departmentType)
  const basePath = isUser ? '/users' : '/head'

  const routePerms = useDepartmentRoutePermissions(session?.user.departmentType)

  const features = useMemo<FeaturePermission[]>(() => {
    if (isUser) {
      return DEPARTMENT_USER_SCREENS
        .filter(
          (item) =>
            routePerms.isRouteEnabled(item.slug) &&
            routePerms.isRouteEnabled(buildOnboardingRoute(item.slug, role)),
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
  }, [isUser, query.data, departmentId, role, routePerms])

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

    return features.map((feature) => ({
      key: feature.slug,
      label: feature.name,
      icon: feature.icon,
      to: isOnboarding
        ? buildOnboardingRoute(feature.slug, role)
        : `${basePath}/${feature.slug}`,
    }))
  }, [isUser, features, basePath, isOnboarding, role, routePerms])

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
