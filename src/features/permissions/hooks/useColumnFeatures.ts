import { useMemo } from 'react'
import { getSession } from '../../../app/auth/session'
import { useDepartmentFeatures } from './useDepartmentFeatures'
import type { FeaturePermission } from '../types/permission.types'

export type ColumnCategory = 'customers' | 'users'

export interface ColumnFeaturesState {
  isPending: boolean
  isError: boolean
  error: { message: string } | null
  refetch: () => unknown
  /** Column keys the admin switched off — hide them. */
  hiddenColumns: string[]
  /** Role A = head, Role B = user; false means read-only. */
  canEdit: (columnKey: string) => boolean
}

/**
 * Column-level feature permissions for one table.
 *
 * `enabled` decides whether a column is shown at all, and the
 * permission of the signed-in role (Role A = HEAD / ADMIN,
 * Role B = USER) decides whether controls inside it stay
 * editable. Unknown columns fail open so a missing seed never
 * blanks a table.
 */
export function useColumnFeatures(
  departmentId: string,
  category: ColumnCategory,
): ColumnFeaturesState {
  const query = useDepartmentFeatures(departmentId)

  const permissionKey =
    getSession()?.user.role === 'USER'
      ? 'roleBPermission'
      : 'roleAPermission'

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
        .filter((feature) => !feature.enabled)
        .map((feature) => feature.columnKey as string),
    [columns],
  )

  function canEdit(columnKey: string): boolean {
    const feature = byKey[columnKey]

    if (!feature) return true
    if (!feature.enabled) return false

    return feature[permissionKey] === 'CAN_EDIT'
  }

  return {
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hiddenColumns,
    canEdit,
  }
}
