import { useMemo } from 'react'
import { useDepartmentFeatures } from '../../../permissions/hooks/useDepartmentFeatures'
import type { HeadNavItem } from '../types/head.types'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { getSession } from '../../../../app/auth/session'

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
  const role = getSession()?.user.role
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
        to: `${basePath}/${feature.slug}`,
      })),
    [features, basePath],
  )

  const bySlug = (slug: string): FeaturePermission | undefined =>
    features.find((feature) => feature.slug === slug)

  return { ...query, features, items, bySlug }
}
