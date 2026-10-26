import { useMemo } from 'react'
import { getSession } from '../../../app/auth/session'
import { resolveDeptFromPath } from '../../departments/head/utils/routeUtils'
import { useDepartmentFeatures } from './useDepartmentFeatures'
import { useDepartmentColumnPermissions } from './useDepartmentColumnPermissions'
import type { FeaturePermission } from '../types/permission.types'

export type ColumnCategory = 'customers' | 'users'

export interface ColumnFeaturesState {
  isPending: boolean
  isError: boolean
  error: { message: string } | null
  refetch: () => unknown
  /** Column keys the admin switched off — hide them. */
  hiddenColumns: string[]
  /**
   * Role A = head, Role B = user; false means read-only.
   *
   * Dynamic column permissions from the admin panel are authoritative.
   * Legacy feature permissions are used only when the column has not been
   * configured in the backend yet. `fallbackWhenUnconfigured` controls the
   * result when neither source has a record for the column.
   */
  canEdit: (columnKey: string, fallbackWhenUnconfigured?: boolean) => boolean
}

/**
 * Column-level feature permissions for one table.
 *
 * `enabled` decides whether a column is shown at all, and the permission of
 * the signed-in role (Role A = HEAD / ADMIN, Role B = USER) decides whether
 * controls inside it stay editable.
 */
export function useColumnFeatures(
  departmentId: string,
  category: ColumnCategory,
  departmentTypeOverride?: string,
): ColumnFeaturesState {
  const query = useDepartmentFeatures(departmentId)
  const session = getSession()

  const isUser = session?.user.role === 'USER'
  const permissionKey = isUser
    ? 'roleBPermission'
    : 'roleAPermission'

  const dynamicDepartmentType =
    departmentTypeOverride ||
    session?.user.departmentType ||
    resolveDeptFromPath() ||
    undefined
  const dynamicRouteName =
    typeof window !== 'undefined' ? window.location.pathname : undefined
  const dynamic = useDepartmentColumnPermissions(
    dynamicDepartmentType,
    dynamicRouteName,
  )

  const columns = useMemo(
    () =>
      (query.data ?? []).filter(
        (feature: FeaturePermission) =>
          feature.kind === 'column' &&
          feature.category === category &&
          Boolean(feature.columnKey),
      ),
    [query.data, category],
  )

  const byKey = useMemo(() => {
    const map: Record<string, FeaturePermission> = {}

    for (const feature of columns) {
      map[feature.columnKey as string] = feature
    }

    return map
  }, [columns])

  const hiddenColumns = useMemo(
    () =>
      columns
        .filter(
          (feature) =>
            !feature.enabled ||
            (isUser && feature.userVisible === false),
        )
        .map((feature) => feature.columnKey as string),
    [columns, isUser],
  )

  function legacyCanEdit(feature: FeaturePermission): boolean {
    if (!feature.enabled) return false
    if (isUser && feature.userVisible === false) return false

    return feature[permissionKey] === 'CAN_EDIT'
  }

  function canEdit(
    columnKey: string,
    fallbackWhenUnconfigured = true,
  ): boolean {
    if (dynamic.isPending) return false

    if (
      !dynamic.isError &&
      dynamic.isColumnConfigured(columnKey)
    ) {
      return dynamic.canEditColumn(columnKey)
    }

    const feature = byKey[columnKey]
    if (feature) return legacyCanEdit(feature)

    return fallbackWhenUnconfigured
  }

  return {
    isPending: query.isPending || dynamic.isPending,
    isError: query.isError || dynamic.isError,
    error: query.error ?? (dynamic.isError ? { message: 'Unable to load column permissions' } : null),
    refetch: () => {
      query.refetch()
      dynamic.refetch()
    },
    hiddenColumns,
    canEdit,
  }
}
