import { useMemo } from 'react'
import { useDepartmentFeatures } from '../../../permissions/hooks/useDepartmentFeatures'
import type { HeadNavItem } from '../types/head.types'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { getSession } from '../../../../app/auth/session'
import {
  buildOnboardingRoute,
  isUserOnboarding,
} from '../utils/routeUtils'

/**
 * Sidebar items for a department = its enabled feature
 * permissions, in admin-defined order. Updates live
 * when the admin adds / removes / reorders features.
 *
 * Column features (`kind: 'column'`) are config, not
 * navigation — they never show up here.
 */
export function useHeadNav(departmentId: string) {
  const query = useDepartmentFeatures(departmentId)
  const session = getSession()
  const role = session?.user.role
  const isOnboarding = isUserOnboarding(session?.user.departmentType)
  const basePath = role === 'USER' ? '/users' : '/head'

  const features = useMemo(
    () =>
      (query.data ?? [])
        .filter(
          (feature) =>
            feature.kind === 'screen' &&
            feature.enabled &&
            (role !== 'USER' || feature.userVisible !== false),
        )
        .sort((a, b) => a.order - b.order),
    [query.data, role],
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
    return features.find(
      (feature) =>
        feature.slug === s ||
        feature.screen === s ||
        (s === 'customers' && feature.slug === 'customer-list') ||
        (s === 'customer-list' && feature.slug === 'customers'),
    )
  }

  return { ...query, features, items, bySlug }
}
