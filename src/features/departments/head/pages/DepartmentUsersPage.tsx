import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from '../../../../hooks/useDebounce'
import { Button } from '../../../../components/ui/Button'
import { Pill } from '../../../../components/ui/Pill'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { RefreshButton } from '../../../../components/ui/RefreshButton'
import { SearchBar } from '../../../../components/head/shared/SearchBar'
import { SectionCard } from '../../../../components/head/shared/SectionCard'
import { LearningButton } from '../../../../components/head/shared/LearningButton'
import { ImpersonationBanner } from '../../../../components/head/layout/ImpersonationBanner'
import { DepartmentUsersTable } from '../../../../components/head/users/DepartmentUsersTable'
import { UserDetails } from '../../../../components/head/users/UserDetails'
import { UserFormModal } from '../../../../components/head/users/UserFormModal'
import { BulkAssignModal } from '../../../../components/head/users/BulkAssignModal'
import { StaffReportModal } from '../../../../components/reports/StaffReportModal'
import { Icon } from '../../../../components/head/shared/Icon'
import '../../../../components/head/customers-list/CustomersList.css'
import { useColumnFeatures } from '../../../permissions/hooks/useColumnFeatures'
import { useDynamicColumns } from '../../../permissions/hooks/useDynamicPermissions'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { useInfiniteDepartmentUsersList } from '../../hooks/useDepartmentUsersList'
import {
  createDepartmentUser,
  updateDepartmentUser,
  deleteDepartmentUser,
  type DepartmentUserApiItem,
} from '../../../../api/department-users.api'
import { useMemberDetails } from '../../hooks/useMemberDetails'
import { generateDepartmentSession } from '../../../../api/auth.api'
import {
  getSession,
  homeForRole,
  openSessionInNewTab,
  prepareLoginWindow,
} from '../../../../app/auth/session'
import {
  resolveUserColumnKey,
  USER_TABLE_COLUMN_KEYS,
} from '../utils/userColumnMatch'
import { resolveDeptFromPath } from '../utils/routeUtils'
import { useQuery } from '@tanstack/react-query'
import { fetchUsersByDepartmentType } from '../../../../api/autowebsion.api'
import { normalizeDepartmentTypeName } from '../../../../api/dynamic-permission.api'
import { notifyUserCreated, notifyUserDeleted, notifyUserUpdated } from '../../../../api/notification-factory'
import { UserCog, UserPlus, Building, Download, BookOpen, UsersRound } from 'lucide-react'
import type { DepartmentUserColumnKey } from '../../../../components/head/users/DepartmentUsersTable'
import type { OnboardingDashboardCustomerDTO } from '../../../../api/onboarding-dashboard.api'
import type {
  Attendance,
  DelaySide,
  WorkItemStatus,
  WorkReportItem,
} from '../../../../features/reports/types/staff-report.types'
import type {
  DepartmentUser,
  DepartmentUserFormValues,
  DepartmentUserRole,
} from '../types/head.types'

type ModalState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'bulkAssign' }
  | { kind: 'edit'; user: DepartmentUser }
  | { kind: 'delete'; user: DepartmentUser; error?: string; isDeleting?: boolean }
  | { kind: 'cannotDelete'; user: DepartmentUser; message: string }
  | { kind: 'report'; user: DepartmentUser }

function toLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * Head panel — Department Users. Wired to:
 * - GET /api/auth/department/users?page=0&size=10
 * - GET /api/onboarding/dashboard/member/{userId} (on view click)
 */
export function DepartmentUsersPage() {
  const departmentId = useHeadDepartmentId()
  const session = getSession()
  const deptType = session?.user.departmentType || resolveDeptFromPath() || undefined
  const columnFeatures = useColumnFeatures(departmentId, 'users', deptType)
  const canManageUsers = columnFeatures.canEdit('actions')
  const dynamicColumnsQuery = useDynamicColumns(deptType)
  const isUser = session?.user.role === 'USER'

  // Map the API columns onto the table's fixed columns: a fixed column is
  // hidden only when the API explicitly disables it for this department and
  // role. Columns not configured in the DB stay visible (fails open).
  const mappedHiddenColumns = useMemo<DepartmentUserColumnKey[]>(() => {
    const dynamic = dynamicColumnsQuery.data ?? []

    return USER_TABLE_COLUMN_KEYS.filter((key) => {
      const matches = dynamic.filter(
        (column) => resolveUserColumnKey(column.columnName) === key,
      )
      // Not configured for this department yet → keep the column visible.
      if (matches.length === 0) return false

      const anyEnabled = matches.some((column) => {
        if (column.visibility === false) return false
        return isUser
          ? column.enableUser === true && column.roleBPermission !== '0'
          : column.enableHead === true && column.roleAPermission !== '0'
      })

      return !anyEnabled
    })
  }, [dynamicColumnsQuery.data, isUser])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [viewingAs, setViewingAs] =
    useState<DepartmentUser | null>(null)
  const [loggingInUserId, setLoggingInUserId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    title?: string
    message: string
  } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  async function handleLoginAs(targetUser: DepartmentUser) {
    if (loggingInUserId !== null) return

    const email = targetUser.email?.trim()
    if (!email) {
      alert('This user does not have a valid email.')
      return
    }

    const newWindow = window.open('', '_blank')
    prepareLoginWindow(newWindow)
    setLoggingInUserId(targetUser.id)

    try {
      const currentSession = getSession()

      const newSession = await generateDepartmentSession(email)
      // Inherit the current departmentType if the generated user session does not include it
      if (!newSession.user.departmentType && currentSession?.user.departmentType) {
        newSession.user.departmentType = currentSession.user.departmentType
      }
      const targetRoute = homeForRole(
        newSession.user.role as never,
        newSession.user.departmentType,
      )

      openSessionInNewTab(newSession, targetRoute, newWindow, currentSession)
    } catch (err: unknown) {
      if (newWindow) {
        newWindow.close()
      }
      console.error('Failed to log in as department user:', err)
      const msg = err instanceof Error ? err.message : 'Unable to log in as user'
      alert(`Login failed: ${msg}`)
    } finally {
      setLoggingInUserId(null)
    }
  }

  // Update search state
  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const isAutowebsionDept = useMemo(() => {
    if (!deptType) return false
    const norm = normalizeDepartmentTypeName(deptType)
    return (
      norm === 'AUTOWEBSION_DEPARTMENT' ||
      norm === 'WEBSITE_DEPARTMENT' ||
      norm === 'AUTOMATION_DEPARTMENT' ||
      deptType.toUpperCase().includes('AUTOWEB') ||
      deptType.toUpperCase().includes('WEBSITE') ||
      deptType.toUpperCase().includes('AUTOMATION')
    )
  }, [deptType])

  const [autowebUserTab, setAutowebUserTab] = useState<'users' | 'subUsers' | 'autowebisionUsers'>('autowebisionUsers')

  // Hit exact Autowebsion user endpoint: GET /api/autowebision/users/department/{departmentType}?page=0&size=10
  const autowebUsersQuery = useQuery({
    queryKey: ['autowebisionUsersDept', autowebUserTab, search.trim()],
    queryFn: async () => {
      const targetDept =
        autowebUserTab === 'autowebisionUsers'
          ? 'AUTOWEBSION_DEPARTMENT'
          : autowebUserTab === 'users'
            ? 'WEBSITE_DEPARTMENT'
            : 'AUTOMATION_DEPARTMENT'
      return fetchUsersByDepartmentType(targetDept, 0, 100, search.trim() || undefined)
    },
    enabled: isAutowebsionDept,
  })

  // Live tab badges count
  const autowebTabCountsQuery = useQuery({
    queryKey: ['autowebisionDeptTabCounts'],
    queryFn: async () => {
      const [r1, r2, rAuto] = await Promise.allSettled([
        fetchUsersByDepartmentType('WEBSITE_DEPARTMENT', 0, 1),
        fetchUsersByDepartmentType('AUTOMATION_DEPARTMENT', 0, 1),
        fetchUsersByDepartmentType('AUTOWEBSION_DEPARTMENT', 0, 1),
      ])
      return {
        dept1Count: r1.status === 'fulfilled' ? (r1.value?.totalElements ?? 0) : 0,
        dept2Count: r2.status === 'fulfilled' ? (r2.value?.totalElements ?? 0) : 0,
        autowebCount: rAuto.status === 'fulfilled' ? (rAuto.value?.totalElements ?? 118) : 118,
      }
    },
    enabled: isAutowebsionDept,
    staleTime: 30_000,
  })

  // Infinite query for Department Users: page 0, size 10 initial, next 10 on scroll
  const departmentUsersQuery = useInfiniteDepartmentUsersList({
    size: 10,
    search: debouncedSearch.trim() || undefined,
  })
  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = departmentUsersQuery
  const loadingNextPageRef = useRef(false)
  const loadNextUsersPage = useCallback(async () => {
    if (
      loadingNextPageRef.current ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return
    }

    loadingNextPageRef.current = true
    try {
      await fetchNextPage({
        cancelRefetch: false,
      })
    } finally {
      loadingNextPageRef.current = false
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  ])

  // Load each member's customer activity for the latest seven calendar days.
  const reportStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return toLocalDateTime(d)
  }, [])
  const reportEnd = useMemo(() => {
    const d = new Date()
    d.setHours(23, 59, 59, 999)
    return toLocalDateTime(d)
  }, [])

  // Member details query - triggered when modal.kind === 'report'
  const memberDetailsQuery = useMemberDetails({
    userId: modal.kind === 'report' ? Number(modal.user.id) : 0,
    department: session?.user?.departmentType || 'GOOGLE_DEPARTMENT',
    startDate: reportStart,
    endDate: reportEnd,
    page: 0,
    size: 50,
  })

  // Convert backend member details to frontend WorkReportItem format
  const convertToWorkReportItems = (customers: OnboardingDashboardCustomerDTO[] = []): WorkReportItem[] => {
    return customers.map((c) => {
      const status = c.status === 'COMPLETED' ? 'COMPLETED' : c.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING'
      const delaySide = c.delaySide === 'CLIENT' ? 'CLIENT' : c.delaySide === 'OURS' ? 'OURS' : c.delaySide === 'TECH' ? 'TECH' : undefined
      
      return {
        id: String(c.customerId ?? Math.random()),
        customerName: c.customerName ?? c.ownerName ?? 'Customer',
        contactName: c.ownerName,
        city: c.city,
        status: status as WorkItemStatus,
        delayDays: c.delayDays ?? 0,
        delaySide: delaySide as DelaySide | undefined,
        reason: c.delayReason,
        remark: c.remark,
      }
    })
  }

  // Build person info from member details or fallback to modal user
  const person = useMemo(() => {
    if (memberDetailsQuery.data?.member) {
      return {
        name: memberDetailsQuery.data.member.name,
        email: memberDetailsQuery.data.member.email,
        dateLabel: 'Last 7 days',
        attendance: (memberDetailsQuery.data.statistics?.attendance === 'Present' ? 'PRESENT' : 'ABSENT') as Attendance,
        avatarText: memberDetailsQuery.data.member.name?.charAt(0).toUpperCase(),
        avatarSrc: memberDetailsQuery.data.member.avatar,
      }
    }
    // Fallback to modal user data
    if (modal.kind === 'report' && modal.user) {
      return {
        name: modal.user.name,
        email: modal.user.email,
        dateLabel: 'Last 7 days',
        attendance: (modal.user.isPresentToday ? 'PRESENT' : 'ABSENT') as Attendance,
        avatarText: modal.user.name?.charAt(0).toUpperCase(),
      }
    }
    return null
  }, [memberDetailsQuery.data, modal])

  // Get items from member details
  const items = useMemo(() => {
    if (memberDetailsQuery.data?.customers?.length) {
      return convertToWorkReportItems(memberDetailsQuery.data.customers)
    }
    return []
  }, [memberDetailsQuery.data])

  // Get target from member details
  const target = useMemo(() => {
    if (memberDetailsQuery.data?.statistics?.target) {
      return memberDetailsQuery.data.statistics.target
    }
    return 0
  }, [memberDetailsQuery.data])

  const reportSummary = useMemo(() => {
    const statistics = memberDetailsQuery.data?.statistics
    if (!statistics) return undefined
    return {
      target: statistics.target ?? 0,
      completed: statistics.completed ?? 0,
      achievedPercent: statistics.achievedPercentage ?? 0,
      delayed: statistics.delayed ?? 0,
      present: statistics.presentDays ?? 0,
      absent: statistics.absentDays ?? 0,
      clientSide: statistics.delaySideCounts?.clientSide ?? 0,
      ourSide: statistics.delaySideCounts?.ourSide ?? 0,
      techSide: statistics.delaySideCounts?.techSide ?? 0,
    }
  }, [memberDetailsQuery.data])

  // Map API users to DepartmentUser table structure across all infinite pages
  const apiUsersList = useMemo<DepartmentUser[]>(() => {
    const pages = departmentUsersQuery.data?.pages ?? []
    const allUsers: DepartmentUserApiItem[] = []
    const seenIds = new Set<string>()

    for (const p of pages) {
      for (const u of p.data ?? []) {
        const idKey = String(u.id ?? u.username ?? u.email ?? Math.random())
        if (!seenIds.has(idKey)) {
          seenIds.add(idKey)
          allUsers.push(u)
        }
      }
    }

    return allUsers.map((u, idx) => {
      const isPresent =
        u.isPresentToday !== undefined
          ? u.isPresentToday
          : (u as any).absent !== undefined
            ? !(u as any).absent
            : (u as any).isAbsent !== undefined
              ? !(u as any).isAbsent
              : u.absentDays !== undefined
                ? u.absentDays === 0
                : true

      const isSeniorUser = Boolean(
        u.isSeniorUser ?? (u as any).seniorUser ?? u.role === 'SENIOR_EXECUTIVE'
      )
      const isAddUserDb = Boolean(
        u.isAddUserDb ?? (u as any).addUserDb
      )

      const role = (
        u.role === 'HEAD' || u.isHead
          ? 'TEAM_LEAD'
          : isSeniorUser
            ? 'SENIOR_EXECUTIVE'
            : 'ONBOARDING_EXECUTIVE'
      ) as DepartmentUserRole

      return {
        id: String(u.id ?? u.username ?? `u-${idx}`),
        name: u.username || u.email,
        phone: u.contact || '—',
        email: u.email,
        role,
        rawRole: (u.role as string) || (u as any).rawRole,
        isSeniorUser,
        isAddUserDb,
        departmentType: u.departmentType,
        joinedLabel: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            })
          : '—',
        target: u.target ?? 0,
        achievedPercent:
          u.achievedPercent ??
          (u.totalCompletedCustomers && u.target
            ? Math.round((u.totalCompletedCustomers / u.target) * 100)
            : 0),
        presentDays: u.presentDays ?? (isPresent ? 1 : 0),
        absentDays: u.absentDays ?? (isPresent ? 0 : 1),
        isPresentToday: isPresent,
        dynamicValues: { ...u } as Record<string, unknown>,
      }
    })
  }, [departmentUsersQuery.data?.pages])

  const autowebUsersList = useMemo<DepartmentUser[]>(() => {
    if (!isAutowebsionDept) return []
    const rawData = autowebUsersQuery.data?.data || []
    return rawData.map((u: any, idx: number) => {
      const isPresent =
        u.isPresentToday !== undefined
          ? u.isPresentToday
          : u.absent !== undefined
            ? !u.absent
            : u.isAbsent !== undefined
              ? !u.isAbsent
              : u.absentDays !== undefined
                ? u.absentDays === 0
                : true

      const isSeniorUser = Boolean(
        u.isSeniorUser ?? u.seniorUser ?? String(u.role || '').toUpperCase().includes('SENIOR')
      )
      const isAddUserDb = Boolean(
        u.isAddUserDb ?? u.addUserDb
      )

      const roleStr = String(u.role || '').toUpperCase()
      const role = (
        roleStr.includes('HEAD')
          ? 'TEAM_LEAD'
          : roleStr.includes('SUB') || roleStr.includes('USER_2')
            ? 'ONBOARDING_EXECUTIVE'
            : isSeniorUser
              ? 'SENIOR_EXECUTIVE'
              : 'DEPARTMENT_USER'
      ) as DepartmentUserRole

      return {
        id: String(u.id ?? u.username ?? `auto-u-${idx}`),
        name: u.username || u.email || 'User',
        phone: u.contact || u.phoneNumber || '—',
        email: u.email || '—',
        role,
        rawRole: u.role,
        isSeniorUser,
        isAddUserDb,
        departmentType: u.departmentType,
        joinedLabel: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString('en-IN', {
              month: 'short',
              year: 'numeric',
            })
          : '—',
        target: u.target ?? 0,
        achievedPercent: u.achievedPercent ?? 0,
        presentDays: u.presentDays ?? (isPresent ? 1 : 0),
        absentDays: u.absentDays ?? (isPresent ? 0 : 1),
        isPresentToday: isPresent,
        dynamicValues: { ...u } as Record<string, unknown>,
      }
    })
  }, [isAutowebsionDept, autowebUsersQuery.data])

  const users = isAutowebsionDept ? autowebUsersList : apiUsersList

  // Reloads only the visible users list (and its tab counts for Autowebsion).
  const handleRefreshUsers = () =>
    isAutowebsionDept
      ? Promise.all([autowebUsersQuery.refetch(), autowebTabCountsQuery.refetch()])
      : departmentUsersQuery.refetch()
  const isUsersRefreshing = isAutowebsionDept
    ? autowebUsersQuery.isFetching || autowebTabCountsQuery.isFetching
    : departmentUsersQuery.isFetching && !departmentUsersQuery.isFetchingNextPage
  const usersListQuery = isAutowebsionDept ? autowebUsersQuery : departmentUsersQuery
  const isUsersListDimmed =
    usersListQuery.isFetching && !usersListQuery.isLoading && !departmentUsersQuery.isFetchingNextPage

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return users
    }

    return users.filter((user) =>
      [user.name, user.phone, user.email].some((field) =>
        field.toLowerCase().includes(term),
      ),
    )
  }, [users, search])

  const presentToday = users.filter(
    (user) => user.isPresentToday,
  ).length

  function handleExportCSV() {
    if (filteredUsers.length === 0) {
      alert('No users found to export.')
      return
    }
    const headers = ['Name', 'Phone', 'Email', 'Role', 'Target', 'Achieved %', 'Present Days', 'Absent Days']
    const rows = filteredUsers.map((u) => [
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.phone.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${u.role}"`,
      u.target,
      `${u.achievedPercent}%`,
      u.presentDays,
      u.absentDays,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${isAutowebsionDept ? 'autowebsion-users' : 'department-users'}-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function closeModal() {
    setModal({ kind: 'none' })
  }

  async function handleCreate(values: DepartmentUserFormValues) {
    try {
      const currentUser = session?.user
      const deptType =
        currentUser?.departmentType ||
        (departmentId === 'google' ? 'GOOGLE_DEPARTMENT' : 'ONBOARDING_DEPARTMENT')

      await createDepartmentUser({
        username: (values.username || values.name || '').trim(),
        email: (values.email || '').trim(),
        password: values.password || '',
        phoneNumber: values.phoneNumber || values.phone || '',
        departmentType: deptType,
        role: 'DEPARTMENT_USER',
        isHead: false,
        headUser: currentUser?.email || '',
      })
      notifyUserCreated(values.username || values.name || '', values.email || '')

      if (isAutowebsionDept) {
        await autowebUsersQuery.refetch()
        await autowebTabCountsQuery.refetch()
      } else {
        await departmentUsersQuery.refetch()
      }
      closeModal()
    } catch (err: unknown) {
      console.error('Failed to create department user:', err)
      const msg = err instanceof Error ? err.message : 'Unable to create user'
      alert(`Failed to add user: ${msg}`)
    }
  }

  async function handleEdit(
    user: DepartmentUser,
    values: DepartmentUserFormValues,
  ) {
    try {
      const currentUser = session?.user
      const deptType =
        currentUser?.departmentType ||
        (departmentId === 'google' ? 'GOOGLE_DEPARTMENT' : 'ONBOARDING_DEPARTMENT')

      await updateDepartmentUser({
        id: user.id,
        username: (values.username || values.name || '').trim(),
        email: (values.email || '').trim(),
        password: values.password || undefined,
        phoneNumber: values.phoneNumber || values.phone || undefined,
        target: values.target || undefined,
        role: values.role || 'DEPARTMENT_USER',
        departmentType: deptType,
        isHead: false,
      })
      notifyUserUpdated(values.username || values.name || user.name || '', values.email || user.email || '')

      if (isAutowebsionDept) {
        await autowebUsersQuery.refetch()
        await autowebTabCountsQuery.refetch()
      } else {
        await departmentUsersQuery.refetch()
      }
      closeModal()
    } catch (err: unknown) {
      console.error('Failed to update department user:', err)
      const msg = err instanceof Error ? err.message : 'Unable to update user'
      alert(`Failed to update user: ${msg}`)
    }
  }


/*
 * The expanded user details are currently read-only. Keep mutation handlers
 * out of this page until the corresponding controls are exposed again.
 */
/* function resolveUserId(targetUser: DepartmentUser): number | undefined {
    const candidates = [
      targetUser.id,
      targetUser.dynamicValues?.id,
      targetUser.dynamicValues?.userId,
      targetUser.dynamicValues?.departmentId,
    ]
    for (const c of candidates) {
      if (c !== undefined && c !== null && c !== '') {
        const n = Number(c)
        if (Number.isFinite(n) && n > 0) return n
      }
    }
    const currentSession = getSession()
    if (
      currentSession?.user?.id &&
      (targetUser.email?.toLowerCase() === currentSession.user.email?.toLowerCase() ||
       targetUser.name?.toLowerCase() === currentSession.user.username?.toLowerCase() ||
       targetUser.name?.toLowerCase() === currentSession.user.name?.toLowerCase())
    ) {
      const n = Number(currentSession.user.id)
      if (Number.isFinite(n) && n > 0) return n
    }
    return undefined
  }

  async function handleAttendanceToggle(targetUser: DepartmentUser, isPresent: boolean) {
    const numericId = resolveUserId(targetUser)
    if (!numericId) {
      console.error('[Attendance] Could not resolve numeric user ID for:', targetUser)
      setToast({ type: 'error', title: 'Error', message: 'Valid user ID is required to update attendance.' })
      return
    }

    setUpdatingAttendanceFor(targetUser.id)
    try {
      await updateUserAttendance(numericId, isPresent)
      setToast({
        type: 'success',
        title: isPresent ? 'Marked Present' : 'Marked Absent',
        message: `Attendance for ${targetUser.name} updated to ${isPresent ? 'Present' : 'Absent'} successfully!`,
      })
      if (isAutowebsionDept) {
        await autowebUsersQuery.refetch()
      } else {
        await departmentUsersQuery.refetch()
      }
    } catch (err: unknown) {
      console.error('Failed to update attendance:', err)
      const msg = err instanceof Error ? err.message : 'Failed to update attendance'
      setToast({ type: 'error', title: 'Attendance Error', message: msg })
    } finally {
      setUpdatingAttendanceFor(null)
    }
  }

  async function handleSeniorUserToggle(targetUser: DepartmentUser, isSenior: boolean) {
    const numericId = resolveUserId(targetUser)
    const rawDept =
      targetUser.departmentType ||
      (targetUser.dynamicValues?.departmentType as string) ||
      session?.user?.departmentType ||
      'ONBOARDING_DEPARTMENT'

    const rawRole = (targetUser.dynamicValues?.role as string) || targetUser.rawRole
    const validBackendRole =
      rawRole === 'DEPARTMENT_HEAD' ||
      rawRole === 'DEPARTMENT_SUB_USER' ||
      rawRole === 'SUPERADMIN' ||
      rawRole === 'DEPARTMENT_SFP'
        ? rawRole
        : 'DEPARTMENT_USER'

    setUpdatingSeniorFor(targetUser.id)
    try {
      await updateDepartmentUser({
        id: numericId ?? targetUser.id,
        username: targetUser.name,
        email: targetUser.email,
        isSeniorUser: isSenior,
        departmentType: rawDept,
        role: validBackendRole,
      })
      setToast({
        type: 'success',
        title: 'Senior Status Updated',
        message: `Senior user status updated to ${isSenior ? 'Yes' : 'No'} for ${targetUser.name}!`,
      })
      if (isAutowebsionDept) {
        await autowebUsersQuery.refetch()
      } else {
        await departmentUsersQuery.refetch()
      }
    } catch (err: unknown) {
      console.error('Failed to update senior user status:', err)
      const msg = err instanceof Error ? err.message : 'Failed to update senior user status'
      setToast({ type: 'error', title: 'Senior Status Error', message: msg })
    } finally {
      setUpdatingSeniorFor(null)
    }
  }

  async function handleHelpTicketsToggle(targetUser: DepartmentUser, enabled: boolean) {
    const numericId = resolveUserId(targetUser)
    const rawDept =
      targetUser.departmentType ||
      (targetUser.dynamicValues?.departmentType as string) ||
      session?.user?.departmentType ||
      'ONBOARDING_DEPARTMENT'

    setUpdatingHelpTicketsFor(targetUser.id)
    try {
      const payload: UserActionPayload = enabled
        ? {
            action: 'ADD',
            userId: numericId,
            name: targetUser.name || '',
            email: targetUser.email,
            password: (targetUser.dynamicValues?.password as string) || 'SYNC_LOCKED',
            phone: targetUser.phone !== '—' ? targetUser.phone : null,
            role: (targetUser.dynamicValues?.role as string) || 'CUSTOMER',
            status: 'ACTIVE',
            timezone: (targetUser.dynamicValues?.timezone as string) || 'Asia/Kolkata',
            departmentName: rawDept,
            departmentType: rawDept,
          }
        : {
            action: 'DELETE',
            userId: numericId,
            email: targetUser.email,
          }

      const res = await performUserAction(payload)
      if (res && res.success === false) {
        throw new Error(res.message || 'Action failed')
      }

      setToast({
        type: 'success',
        title: 'Ticket DB Updated',
        message: `User ${targetUser.name} ${enabled ? 'added to' : 'removed from'} Help Tickets database successfully!`,
      })
      if (isAutowebsionDept) {
        await autowebUsersQuery.refetch()
      } else {
        await departmentUsersQuery.refetch()
      }
    } catch (err: unknown) {
      console.error('Failed to update Help Tickets database status:', err)
      const msg = err instanceof Error ? err.message : 'Failed to update ticket database access'
      setToast({ type: 'error', title: 'Ticket DB Error', message: msg })
    } finally {
      setUpdatingHelpTicketsFor(null)
    }
  }

*/

  async function handleDelete(user: DepartmentUser) {
    setModal((prev) =>
      prev.kind === 'delete' ? { ...prev, isDeleting: true, error: undefined } : prev,
    )
    try {
      await deleteDepartmentUser({
        id: user.id,
      })
      notifyUserDeleted(user.name || '', user.email || '')
      if (isAutowebsionDept) {
        await autowebUsersQuery.refetch()
        await autowebTabCountsQuery.refetch()
      } else {
        await departmentUsersQuery.refetch()
      }
      closeModal()
      setToast({
        type: 'success',
        title: 'User removed',
        message: `${user.name || user.email || 'User'} was removed successfully.`,
      })
    } catch (err: unknown) {
      console.error('Failed to delete department user:', err)
      const rawMsg = err instanceof Error ? err.message : String(err)
      const isAssignedConflict =
        rawMsg.toLowerCase().includes('assigned') ||
        rawMsg.toLowerCase().includes('assign') ||
        rawMsg.toLowerCase().includes('customer')

      if (isAssignedConflict) {
        setModal({
          kind: 'cannotDelete',
          user,
          message: 'First you need to assign customer of this user to another user.',
        })
        setToast({
          type: 'error',
          title: 'Cannot Remove User',
          message: 'First you need to assign customer of this user to another user.',
        })
      } else {
        setModal((prev) =>
          prev.kind === 'delete' ? { ...prev, isDeleting: false, error: rawMsg } : prev,
        )
        setToast({ type: 'error', title: 'Failed to remove user', message: rawMsg })
      }
    }
  }

  return (
    <>
      {viewingAs ? (
        <ImpersonationBanner
          name={viewingAs.name}
          onExit={() => setViewingAs(null)}
        />
      ) : null}

      {isAutowebsionDept ? (
        <div className="space-y-4 mb-4">
          {/* Top Toolbar: Tabs on left, Actions on right */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Tabs: Department 1, Department 2, AUTOWEBSION */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/90 p-1.5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setAutowebUserTab('users')
                  setSearch('')
                }}
                className={`h-9 inline-flex items-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold transition-all ${
                  autowebUserTab === 'users'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <UserCog className="mr-1.5 h-4 w-4" />
                <span>Department 1</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    autowebUserTab === 'users'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {autowebTabCountsQuery.data?.dept1Count ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAutowebUserTab('subUsers')
                  setSearch('')
                }}
                className={`h-9 inline-flex items-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold transition-all ${
                  autowebUserTab === 'subUsers'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                <span>Department 2</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    autowebUserTab === 'subUsers'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {autowebTabCountsQuery.data?.dept2Count ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAutowebUserTab('autowebisionUsers')
                  setSearch('')
                }}
                className={`h-9 inline-flex items-center rounded-lg px-3.5 text-xs sm:text-sm font-semibold transition-all ${
                  autowebUserTab === 'autowebisionUsers'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <Building className="mr-1.5 h-4 w-4" />
                <span>AUTOWEBSION</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    autowebUserTab === 'autowebisionUsers'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {autowebTabCountsQuery.data?.autowebCount ?? 118}
                </span>
              </button>
            </div>

            {/* Action Buttons: Export, Department Learning, Add User */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={handleExportCSV}
                className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <Download className="mr-2 h-4 w-4 text-slate-500" />
                Export
              </Button>

              <Button
                type="button"
                className="h-10 rounded-xl border border-amber-300 bg-amber-400 px-4 text-xs sm:text-sm font-semibold text-amber-950 opacity-100 shadow-none"
                title="Department Learning"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Department Learning
              </Button>

              {canManageUsers ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setModal({ kind: 'bulkAssign' })}
                    className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                  >
                    <UsersRound className="mr-2 h-4 w-4 text-blue-600" />
                    Bulk Assign
                  </Button>
                  <Button
                    className="head-primary-button"
                    onClick={() => setModal({ kind: 'create' })}
                  >
                    <Icon name="userPlus" size={16} />
                    Add User
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder={
              autowebUserTab === 'users'
                ? 'Search Department 1 by name, number or email...'
                : autowebUserTab === 'subUsers'
                  ? 'Search Department 2 by name, number or email...'
                  : 'Search by name, number or email...'
            }
          />
        </div>
      ) : (
        <div className="head-toolbar">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by name, number or email"
          />

          <LearningButton newCount={2} />

          {canManageUsers ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setModal({ kind: 'bulkAssign' })}
                className="inline-flex items-center gap-2"
              >
                <UsersRound className="h-4 w-4" />
                Bulk Assign
              </Button>
              <Button
                className="head-primary-button"
                onClick={() => setModal({ kind: 'create' })}
              >
                <Icon name="userPlus" size={16} />
                Add User
              </Button>
            </>
          ) : null}
        </div>
      )}

      <SectionCard
        title={
          isAutowebsionDept
            ? autowebUserTab === 'autowebisionUsers'
              ? 'AUTOWEBSION Users'
              : autowebUserTab === 'users'
                ? 'Department 1 Users'
                : 'Department 2 Users'
            : 'Department Users'
        }
        meta={
          <>
            <Pill tone="info" size="sm">
              {filteredUsers.length} users
            </Pill>

            <Pill tone="success" size="sm">
              {presentToday} present today
            </Pill>

            <RefreshButton
              onRefresh={handleRefreshUsers}
              isRefreshing={isUsersRefreshing}
              label="users"
            />
          </>
        }
        hint="Attendance & achievement · this month"
      >
        <div
          className={`transition-opacity${isUsersListDimmed ? ' opacity-60 pointer-events-none' : ''}`}
          aria-busy={isUsersListDimmed}
        >
          <DepartmentUsersTable
            users={filteredUsers}
            emptyMessage={
              isAutowebsionDept
                ? autowebUsersQuery.isLoading
                  ? 'Loading users…'
                  : autowebUsersQuery.isError
                    ? 'Unable to load users. Please try again.'
                    : 'No users found.'
                : departmentUsersQuery.isLoading
                  ? 'Loading users…'
                  : departmentUsersQuery.isError
                    ? 'Unable to load users. Please try again.'
                    : 'No users found.'
            }
            hiddenColumns={[
              ...columnFeatures.hiddenColumns,
              ...mappedHiddenColumns,
            ]}
            canEditActions={canManageUsers}
            hasNextPage={departmentUsersQuery.hasNextPage}
            isFetchingNextPage={departmentUsersQuery.isFetchingNextPage}
            onLoadMore={loadNextUsersPage}
            totalUsers={departmentUsersQuery.data?.pages?.[0]?.totalElements ?? users.length}
            onView={(user) => setModal({ kind: 'report', user })}
            onEdit={(user) => setModal({ kind: 'edit', user })}
            onDelete={(user) =>
              setModal({ kind: 'delete', user })
            }
            onLoginAs={handleLoginAs}
            loggingInUserId={loggingInUserId}
            renderExpanded={(user) => (
              <UserDetails
                user={user}
              />
            )}
          />
        </div>
      </SectionCard>

      {canManageUsers ? (
        <UserFormModal
          open={modal.kind === 'create'}
          mode="create"
          onClose={closeModal}
          onSubmit={handleCreate}
        />
      ) : null}

      {canManageUsers ? (
        <BulkAssignModal
          open={modal.kind === 'bulkAssign'}
          onClose={closeModal}
          onTransferred={async () => {
            if (isAutowebsionDept) {
              await autowebUsersQuery.refetch()
            } else {
              await departmentUsersQuery.refetch()
            }
          }}
        />
      ) : null}

      {canManageUsers && modal.kind === 'edit' ? (
        <UserFormModal
          open
          mode="edit"
          initialValues={{
            name: modal.user.name,
            phone: modal.user.phone,
            target: modal.user.target,
            email: modal.user.email,
            role: modal.user.role,
          }}
          onClose={closeModal}
          onSubmit={(values) =>
            handleEdit(modal.user, values)
          }
        />
      ) : null}

      {canManageUsers && modal.kind === 'delete' ? (
        <ConfirmDialog
          open
          title="Remove user?"
          message={`${modal.user.name} will lose access to the department panel.`}
          confirmLabel="Remove"
          confirmLoadingLabel="Removing..."
          isLoading={modal.isDeleting}
          error={modal.error}
          onClose={closeModal}
          onConfirm={() => handleDelete(modal.user)}
        />
      ) : null}

      {modal.kind === 'cannotDelete' ? (
        <ConfirmDialog
          open
          title="Cannot Remove User"
          message={
            <div className="space-y-2">
              <p className="font-semibold text-amber-700 text-sm">
                {modal.message}
              </p>
              <p className="text-xs text-slate-500">
                <strong>{modal.user.name || modal.user.email}</strong> currently has customers assigned in this department. Please reassign their customers to another user before removing them.
              </p>
            </div>
          }
          confirmLabel="Reassign Customers"
          cancelLabel="Close"
          onClose={closeModal}
          onConfirm={() => setModal({ kind: 'bulkAssign' })}
        />
      ) : null}

      {modal.kind === 'report' && person ? (
        <StaffReportModal
          open
          onClose={closeModal}
          person={person}
          items={items}
          target={target}
          summary={reportSummary}
          hint={memberDetailsQuery.isLoading ? 'Loading the last 7 days…' : 'Showing customer activity from the last 7 days'}
        />
      ) : null}

      {toast ? (
        <div
          className={`cl-toast cl-toast--${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <span>
            <strong className="cl-toast-title">{toast.title || (toast.type === 'success' ? 'Success' : 'Error')}</strong>
            <small className="cl-toast-message">{toast.message}</small>
          </span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      ) : null}
    </>
  )
}
