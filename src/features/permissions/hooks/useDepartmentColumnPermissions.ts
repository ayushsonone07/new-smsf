import { useCallback } from 'react'
import { getSession } from '../../../app/auth/session'
import { useDynamicColumns } from './useDynamicPermissions'
import type { DynamicColumnResponse } from '../../../api/dynamic-permission.api'
import { resolveDeptFromPath } from '../../departments/head/utils/routeUtils'

export interface DepartmentColumnPermissionsResult {
  columns: DynamicColumnResponse[]
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isColumnEnabled: (nameOrId: string) => boolean
  canEditColumn: (nameOrId: string) => boolean
  refetch: () => unknown
}

function normalizeColumnName(str: string): string {
  if (!str) return ''
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

/**
 * Checks whether a given DB column matches a target name or ID.
 * Supports exact name, cleaned name, and common column aliases.
 */
export function isColumnMatch(col: DynamicColumnResponse, nameOrId: string): boolean {
  if (!col || !nameOrId) return false
  const target = nameOrId.trim().toLowerCase()
  const targetClean = normalizeColumnName(nameOrId)

  const colName = (col.columnName || '').trim().toLowerCase()
  const colNameClean = normalizeColumnName(col.columnName || '')
  const colId = (col.columnId || '').trim().toLowerCase()

  // 1. Direct match by ID or exact Name
  if (target === colId || target === colName) return true

  // 2. Cleaned name match (e.g. 'Assign To' == 'assignto' == 'assign_to')
  if (targetClean && colNameClean && targetClean === colNameClean) return true

  // 3. Common column aliases:
  // 'Assign To' <-> 'Assign' <-> 'Assignee'
  const isAssignTarget = targetClean === 'assignto' || targetClean === 'assign' || targetClean === 'assignee'
  const isAssignCol = colNameClean === 'assignto' || colNameClean === 'assign' || colNameClean === 'assignee'
  if (isAssignTarget && isAssignCol) return true

  // 'Internal Remark' <-> 'Remark' <-> 'Remarks'
  const isRemarkTarget = targetClean === 'internalremark' || targetClean === 'remark' || targetClean === 'remarks'
  const isRemarkCol = colNameClean === 'internalremark' || colNameClean === 'remark' || colNameClean === 'remarks'
  if (isRemarkTarget && isRemarkCol) return true

  // 'Contact' <-> 'Phone' <-> 'Email'
  const isContactTarget = targetClean === 'contact' || targetClean === 'phone' || targetClean === 'email'
  const isContactCol = colNameClean === 'contact' || colNameClean === 'phone' || colNameClean === 'email'
  if (isContactTarget && isContactCol) return true

  // 'Business' <-> 'Company' <-> 'Customer'
  const isBizTarget = targetClean === 'business' || targetClean === 'company' || targetClean === 'biz' || targetClean === 'customer'
  const isBizCol = colNameClean === 'business' || colNameClean === 'company' || colNameClean === 'biz' || colNameClean === 'customer'
  if (isBizTarget && isBizCol) return true

  // 'Status'
  const isStatusTarget = targetClean === 'status' || targetClean === 'servicestatus'
  const isStatusCol = colNameClean === 'status' || colNameClean === 'servicestatus'
  if (isStatusTarget && isStatusCol) return true

  // 'Website Exists'
  const isWebExistsTarget = targetClean === 'websiteexists' || targetClean === 'iswebsiteexists'
  const isWebExistsCol = colNameClean === 'websiteexists' || colNameClean === 'iswebsiteexists'
  if (isWebExistsTarget && isWebExistsCol) return true

  // 'Requirement Form' <-> 'Form'
  const isFormTarget = targetClean === 'requirementform' || targetClean === 'form' || targetClean === 'openform'
  const isFormCol = colNameClean === 'requirementform' || colNameClean === 'form' || colNameClean === 'openform'
  if (isFormTarget && isFormCol) return true

  // 'Services' <-> 'Service' <-> 'Service Type'
  const isSvcTarget = targetClean === 'services' || targetClean === 'service' || targetClean === 'servicetype'
  const isSvcCol = colNameClean === 'services' || colNameClean === 'service' || colNameClean === 'servicetype'
  if (isSvcTarget && isSvcCol) return true

  // 'Expiration' <-> 'Expiry'
  const isExpTarget = targetClean === 'expiration' || targetClean === 'expiry' || targetClean === 'serviceexpiration'
  const isExpCol = colNameClean === 'expiration' || colNameClean === 'expiry' || colNameClean === 'serviceexpiration'
  if (isExpTarget && isExpCol) return true

  // 'Client Remark'
  const isClientRemTarget = targetClean === 'clientremark' || targetClean === 'clientremarks'
  const isClientRemCol = colNameClean === 'clientremark' || colNameClean === 'clientremarks'
  if (isClientRemTarget && isClientRemCol) return true

  // 'Draft Sent' <-> 'Draft' <-> 'Mail Sent'
  const isDraftTarget = targetClean === 'draftsent' || targetClean === 'draft' || targetClean === 'mailsent' || targetClean === 'ismailsent'
  const isDraftCol = colNameClean === 'draftsent' || colNameClean === 'draft' || colNameClean === 'mailsent' || colNameClean === 'ismailsent'
  if (isDraftTarget && isDraftCol) return true

  return false
}

/**
 * Validates dynamic column permissions for a given departmentType and current role.
 *
 * If a column is configured in DB:
 *   - Checks `col.visibility !== false`
 *   - For HEAD role: `col.enableHead === true && col.roleAPermission !== '0'`
 *   - For USER role: `col.enableUser === true && col.roleBPermission !== '0'`
 *
 * If a column has not been added/configured in DB at all:
 *   - Allows default display (returns true) so unconfigured core columns don't disappear.
 */
export function useDepartmentColumnPermissions(
  departmentType?: string,
): DepartmentColumnPermissionsResult {
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const dept = departmentType || session?.user.departmentType || deptFromUrl || 'ONBOARDING_DEPARTMENT'
  const isHead = session?.user.role !== 'USER'

  const query = useDynamicColumns(dept)
  const columns = query.data ?? []

  const isColumnEnabled = useCallback(
    (nameOrId: string): boolean => {
      if (!nameOrId) return false
      // If no columns are in DB yet, allow standard columns
      if (columns.length === 0) return true

      const col = columns.find((c) => isColumnMatch(c, nameOrId))
      if (col) {
        // If master visibility is explicitly false, the column is completely disabled
        if (col.visibility === false) return false

        if (isHead) {
          return col.enableHead === true && col.roleAPermission !== '0'
        }
        return col.enableUser === true && col.roleBPermission !== '0'
      }

      // If column is not configured in DB at all, allow it by default
      return true
    },
    [columns, isHead],
  )

  const canEditColumn = useCallback(
    (nameOrId: string): boolean => {
      if (!nameOrId) return false
      if (!isColumnEnabled(nameOrId)) return false
      if (columns.length === 0) return true

      const col = columns.find((c) => isColumnMatch(c, nameOrId))
      if (!col) return true

      const perm = isHead ? col.roleAPermission : col.roleBPermission
      return perm === '12' || perm === '2' || perm === 'CAN_EDIT'
    },
    [columns, isHead, isColumnEnabled],
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

