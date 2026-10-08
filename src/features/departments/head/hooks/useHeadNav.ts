import { useMemo } from 'react'
import { useDepartmentFeatures } from '../../../permissions/hooks/useDepartmentFeatures'
import type { HeadNavItem } from '../types/head.types'
import type { FeaturePermission } from '../../../permissions/types/permission.types'

/**
 * Sidebar items for a department = its enabled feature
 * permissions, in admin-defined order. Updates live
 * when the admin adds / removes / reorders features.
 */
export function useHeadNav(departmentId: string) {
  const query = useDepartmentFeatures(departmentId)

  const features = useMemo(
    () =>
      (query.data ?? [])
        .filter((feature) => feature.enabled)
        .sort((a, b) => a.order - b.order),
    [query.data],
  )

  const items = useMemo<HeadNavItem[]>(
    () =>
      features.map((feature) => ({
        key: feature.slug,
        label: feature.name,
        icon: feature.icon,
        to: `/head/${feature.slug}`,
      })),
    [features],
  )

  const bySlug = (slug: string): FeaturePermission | undefined =>
    features.find((feature) => feature.slug === slug)

  return { ...query, features, items, bySlug }
}
