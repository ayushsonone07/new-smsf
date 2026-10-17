import { useCallback } from 'react'
import { getSession } from '../../../app/auth/session'
import { useDynamicColumns } from './useDynamicPermissions'
import type { DynamicColumnResponse } from '../../../api/dynamic-permission.api'
import { isUserGoogle, resolveDeptFromPath } from '../../departments/head/utils/routeUtils'

export interface DepartmentColumnPermissionsResult {
  columns: DynamicColumnResponse[]
  isLoading: boolean
  isPending: boolean
  isError: boolean
  isColumnEnabled: (nameOrId: string, routeFilter?: string) => boolean
  canEditColumn: (nameOrId: string) => boolean
  refetch: () => unknown
}

function normalizeColumnName(str: string): string {
  if (!str) return ''
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

function matchesRoute(col: DynamicColumnResponse, routeFilter: string): boolean {
  if (!col || !routeFilter) return true
  const normFilter = routeFilter.toLowerCase().trim().replace(/^(\/|#)+/, '').replace(/\/+$/, '')
  const filterSlug = normFilter.split('/').pop() || normFilter

  const rName = (col.routeName || '').toLowerCase().trim()
  const rType = (col.routesType || '').toLowerCase().trim()
  const rId = (col.routeId || '').toLowerCase().trim()

  if (rName.includes(filterSlug) || rType.includes(filterSlug) || rId.includes(filterSlug)) return true
  return false
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

  // 'Customer' <-> 'Customer Name' <-> 'Customer / Lead' <-> 'Lead' <-> 'Client'
  const isCustTarget =
    targetClean === 'customer' ||
    targetClean === 'customername' ||
    targetClean === 'customerlead' ||
    targetClean === 'lead' ||
    targetClean === 'leadname' ||
    targetClean === 'client'
  const isCustCol =
    colNameClean === 'customer' ||
    colNameClean === 'customername' ||
    colNameClean === 'customerlead' ||
    colNameClean === 'lead' ||
    colNameClean === 'leadname' ||
    colNameClean === 'client'
  if (isCustTarget && isCustCol) return true

  // 'Service' <-> 'Service Name' <-> 'Department Service Name'
  const isServiceTarget = targetClean === 'service' || targetClean === 'servicename' || targetClean === 'departmentservicename'
  const isServiceCol = colNameClean === 'service' || colNameClean === 'servicename' || colNameClean === 'departmentservicename'
  if (isServiceTarget && isServiceCol) return true

  // 'Phase' <-> 'Phase Name' <-> 'Stage'
  const isPhaseTarget = targetClean === 'phase' || targetClean === 'phasename' || targetClean === 'stage'
  const isPhaseCol = colNameClean === 'phase' || colNameClean === 'phasename' || colNameClean === 'stage'
  if (isPhaseTarget && isPhaseCol) return true

  // 'Service Status' <-> 'Service State'
  const isServiceStatusTarget = targetClean === 'servicestatus' || targetClean === 'servicestate'
  const isServiceStatusCol = colNameClean === 'servicestatus' || colNameClean === 'servicestate'
  if (isServiceStatusTarget && isServiceStatusCol) return true

  // 'Timeline' <-> 'Duration' <-> 'Date'
  const isTimelineTarget = targetClean === 'timeline' || targetClean === 'duration' || targetClean === 'dates' || targetClean === 'date'
  const isTimelineCol = colNameClean === 'timeline' || colNameClean === 'duration' || colNameClean === 'dates' || colNameClean === 'date'
  if (isTimelineTarget && isTimelineCol) return true

  // 'Record' <-> 'Recording' <-> 'Action'
  const isRecordTarget = targetClean === 'record' || targetClean === 'recording' || targetClean === 'recordings' || targetClean === 'action' || targetClean === 'actions'
  const isRecordCol = colNameClean === 'record' || colNameClean === 'recording' || colNameClean === 'recordings' || colNameClean === 'action' || colNameClean === 'actions'
  if (isRecordTarget && isRecordCol) return true

  // 'Old Status'
  const isOldStatusTarget = targetClean === 'oldstatus' || targetClean === 'previousstatus'
  const isOldStatusCol = colNameClean === 'oldstatus' || colNameClean === 'previousstatus'
  if (isOldStatusTarget && isOldStatusCol) return true

  // 'New Status'
  const isNewStatusTarget = targetClean === 'newstatus' || targetClean === 'currentstatus'
  const isNewStatusCol = colNameClean === 'newstatus' || colNameClean === 'currentstatus'
  if (isNewStatusTarget && isNewStatusCol) return true

  // 'Updated By'
  const isUpdatedByTarget = targetClean === 'updatedby' || targetClean === 'modifiedby'
  const isUpdatedByCol = colNameClean === 'updatedby' || colNameClean === 'modifiedby'
  if (isUpdatedByTarget && isUpdatedByCol) return true

  // 'Date & Time'
  const isDateTimeTarget = targetClean === 'datetime' || targetClean === 'dateandtime'
  const isDateTimeCol = colNameClean === 'datetime' || colNameClean === 'dateandtime'
  if (isDateTimeTarget && isDateTimeCol) return true

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
  const isStatusTarget = targetClean === 'status' || targetClean === 'taskstatus'
  const isStatusCol = colNameClean === 'status' || colNameClean === 'taskstatus'
  if (isStatusTarget && isStatusCol) return true

  // 'Created' <-> 'Created Date' <-> 'Created At'
  const isCreatedTarget = targetClean === 'created' || targetClean === 'createdat' || targetClean === 'createddate'
  const isCreatedCol = colNameClean === 'created' || colNameClean === 'createdat' || colNameClean === 'createddate'
  if (isCreatedTarget && isCreatedCol) return true

  // 'Department' <-> 'Departments'
  const isDeptTarget = targetClean === 'department' || targetClean === 'departments' || targetClean === 'dept'
  const isDeptCol = colNameClean === 'department' || colNameClean === 'departments' || colNameClean === 'dept'
  if (isDeptTarget && isDeptCol) return true

  // 'Meeting Date' <-> 'Meeting' <-> 'Scheduled Date'
  const isMeetDateTarget = targetClean === 'meetingdate' || targetClean === 'meeting' || targetClean === 'scheduleddate' || targetClean === 'meetingtime'
  const isMeetDateCol = colNameClean === 'meetingdate' || colNameClean === 'meeting' || colNameClean === 'scheduleddate' || colNameClean === 'meetingtime'
  if (isMeetDateTarget && isMeetDateCol) return true

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
 *   - For HEAD role: `col.enableHead !== false && col.roleAPermission !== '0'`
 *   - For USER role: `col.enableUser !== false && col.roleBPermission !== '0'`
 *
 * If a column has not been added/configured in DB at all:
 *   - Allows default display (returns true) so unconfigured core columns don't disappear.
 */
export function useDepartmentColumnPermissions(
  departmentType?: string,
): DepartmentColumnPermissionsResult {
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const isGoogle = isUserGoogle(departmentType || session?.user.departmentType)
  const dept = isGoogle
    ? 'GOOGLE_DEPARTMENT'
    : (departmentType || session?.user.departmentType || deptFromUrl || 'ONBOARDING_DEPARTMENT')
  const isHead = session?.user.role !== 'USER'

  const query = useDynamicColumns(dept)
  const columns = query.data ?? []

  const isColumnEnabled = useCallback(
    (nameOrId: string, routeFilter?: string): boolean => {
      if (!nameOrId) return false
      // If no columns are in DB yet, allow standard columns
      if (columns.length === 0) return true

      // If routeFilter provided, try to find a column matching both name and route first
      let col = routeFilter
        ? columns.find((c) => isColumnMatch(c, nameOrId) && matchesRoute(c, routeFilter))
        : undefined

      if (!col) {
        col = columns.find((c) => isColumnMatch(c, nameOrId))
      }

      if (col) {
        // If master visibility is explicitly false or 0, the column is completely disabled
        if (col.visibility === false || (col.visibility as unknown) === 0) return false

        if (isHead) {
          return col.enableHead !== false && (col.enableHead as unknown) !== 0 && col.roleAPermission !== '0'
        }
        return col.enableUser !== false && (col.enableUser as unknown) !== 0 && col.roleBPermission !== '0'
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
