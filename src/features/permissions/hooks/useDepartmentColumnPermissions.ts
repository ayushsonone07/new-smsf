import { useCallback } from 'react'
import { getSession } from '../../../app/auth/session'
import { useDynamicColumns } from './useDynamicPermissions'
import type { DynamicColumnResponse } from '../../../api/dynamic-permission.api'

export interface DepartmentColumnPermissionsResult {
  columns: DynamicColumnResponse[]
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isColumnEnabled: (nameOrId: string) => boolean
  canEditColumn: (nameOrId: string) => boolean
  refetch: () => unknown
}

/**
 * Validates dynamic column permissions for a given departmentType and current role.
 *
 * For HEAD role:
 *   - Checks `col.enableHead !== false`
 *   - Edit check: `col.roleAPermission === '12' || col.roleAPermission === '2'`
 *
 * For USER role:
 *   - Checks `col.enableUser !== false`
 *   - Edit check: `col.roleBPermission === '12' || col.roleBPermission === '2'`
 *
 * Defaults to enabled (true) if column is not yet configured or pending.
 */
export function useDepartmentColumnPermissions(
  departmentType?: string,
): DepartmentColumnPermissionsResult {
  const session = getSession()
  const dept = departmentType || session?.user.departmentType || 'ONBOARDING_DEPARTMENT'
  const isHead = session?.user.role !== 'USER'

  const query = useDynamicColumns(dept)
  const columns = query.data ?? []

  const isColumnEnabled = useCallback(
    (nameOrId: string): boolean => {
      if (!nameOrId) return true
      if (columns.length === 0) return true
      const normalized = nameOrId.trim().toLowerCase()
      const col = columns.find(
        (c) =>
          c.columnName?.trim().toLowerCase() === normalized ||
          c.columnId?.trim().toLowerCase() === normalized,
      )
      if (!col) return true
      return isHead ? col.enableHead !== false : col.enableUser !== false
    },
    [columns, isHead],
  )

  const canEditColumn = useCallback(
    (nameOrId: string): boolean => {
      if (!nameOrId) return true
      if (columns.length === 0) return true
      const normalized = nameOrId.trim().toLowerCase()
      const col = columns.find(
        (c) =>
          c.columnName?.trim().toLowerCase() === normalized ||
          c.columnId?.trim().toLowerCase() === normalized,
      )
      if (!col) return true

      const isEnabled = isHead ? col.enableHead !== false : col.enableUser !== false
      if (!isEnabled) return false

      const perm = isHead ? col.roleAPermission : col.roleBPermission
      return perm === '12' || perm === '2' || perm === 'CAN_EDIT'
    },
    [columns, isHead],
  )

  return {
    columns,
    isLoading: query.isLoading,
    isPending: query.isPending,
    isError: query.isError,
    isColumnEnabled,
    canEditColumn,
    refetch: query.refetch,
  }
}

