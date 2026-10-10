import { useMemo } from 'react'
import { useDepartmentFeatures } from '../../../permissions/hooks/useDepartmentFeatures'
import { useDepartmentRoutePermissions } from '../../../permissions/hooks/useDepartmentRoutePermissions'
import type { HeadNavItem } from '../types/head.types'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { getSession } from '../../../../app/auth/session'
import {
  buildOnboardingRoute,
  isUserOnboarding,
} from '../utils/routeUtils'

/**
 * Sidebar items for a department = its enabled feature
 * permissions, in admin-defined order, filtered by live DB route visibility.
 *
 * If a route's visibility is 0 in access_routes / access_summary,
 * that tab/menu item is NOT displayed in the UI.
 */
export function useHeadNav(departmentId: string) {
  const query = useDepartmentFeatures(departmentId)
  const session = getSession()
  const role = session?.user.role
  const isOnboarding = isUserOnboarding(session?.user.departmentType)
  const basePath = role === 'USER' ? '/users' : '/head'

  const routePerms = useDepartmentRoutePermissions(session?.user.departmentType)

  const features = useMemo(
    () =>
      (query.data ?? [])
        .filter(
          (feature) =>
            feature.kind === 'screen' &&
            feature.enabled &&
            (role !== 'USER' || feature.userVisible !== false) &&
            routePerms.isRouteEnabled(feature.slug) &&
            routePerms.isRouteEnabled(buildOnboardingRoute(feature.slug, role)),
        )
        .sort((a, b) => a.order - b.order),
    [query.data, role, routePerms],
  )

  const items = useMemo<HeadNavItem[]>(
    () =>
      features.map((feature) => ({
        key: feature.slug,
        label: feature.name,
        icon: feature.icon,
        to: isOnboarding
          ? buildOnboardingRoute(feature.slug, role)
          : `${basePath}/${feature.slug}`,
      })),
    [features, basePath, isOnboarding, role],
  )

  const bySlug = (slug: string): FeaturePermission | undefined => {
    const s = slug === 'customer-list' ? 'customers' : slug
    if (!routePerms.isRouteEnabled(s)) {
      return undefined
    }
    return features.find(
      (feature) =>
        feature.slug === s ||
        feature.screen === s ||
        (s === 'customers' && feature.slug === 'customer-list') ||
        (s === 'customer-list' && feature.slug === 'customers'),
    )
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
