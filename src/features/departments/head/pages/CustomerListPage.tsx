import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import {
  CustomersList,
  type OnboardingAssignee,
  type OnboardingCustomer,
  type OnboardingStatus,
} from '../../../../components/head/customers-list/CustomersList'
import {
  CustomersListFilters,
  type CustomerTab,
} from '../../../../components/head/customers-list/CustomersListFilters'
import { CustomersListSearchBar } from '../../../../components/head/customers-list/CustomersListSearchBar'
import { CustomersListModal } from '../../../../components/head/customers-list/CustomersListModal'
import { OnboardingConfirmationModal } from '../../../../components/head/customers-list/OnboardingConfirmationModal'
import { ServiceFlowModal } from '../../../../components/head/customers-list/ServiceFlowModal'
import { GoogleInfoModal } from '../../../../components/head/customers-list/GoogleInfoModal'
import { ServiceTagsModal } from '../../../../components/head/customers-list/ServiceTagsModal'
import {
  updateDepartmentServiceStatus,
  extractServiceTags,
  getDepartmentConfig,
  getServiceFlows,
} from '../../../../api/service-flow.api'
import '../../../../components/head/customers-list/CustomersList.css'
import { sampleDepartmentUsers } from '../../../../api/mock/head.db'
import { useDepartmentCustomers } from '../../hooks/useDepartmentCustomers'
import { useUpdateCustomer } from '../../hooks/useUpdateCustomer'
import { useColumnFeatures } from '../../../permissions/hooks/useColumnFeatures'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { resolveDeptFromPath } from '../utils/routeUtils'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
import {
  useOnboardingCustomersList,
  useAuthOnboardingSummary,
  useDepartmentCustomerRows,
  useDepartmentUsersList,
} from '../../hooks/useDepartmentUsersList'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import { getSession } from '../../../../app/auth/session'
import { assignCustomerUser, updateOnboardingStatus } from '../../../../api/department-users.api'
import { useRoundRobinStatus, useUpdateRoundRobinStatus } from '../../hooks/useRoundRobin'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { TablePagination } from '../../../../components/ui/TablePagination'
import { getLatestInternalRemark } from '../../../../utils/internalRemarkUtils'
import { getCustomerFormUrl } from '../../../../utils/urlEncryption'
import type { UpdateCustomerRequest } from '../../types/customer.types'
import { initiateAirtelClickToCall } from '../../../../api/airtel.api'

const FALLBACK_ASSIGNEES: OnboardingAssignee[] = sampleDepartmentUsers.map(
  (user) => ({
    id: user.id,
    name: user.name,
  }),
)

/**
 * Head panel — Customer List. Renders the customers-list UI
 * composed from components/head/customers-list, wired to:
 * - Onboarding dept: GET /api/auth/onboarding/customers?page=0&size=10
 * - Any other (dynamic) department: GET
 *   /api/auth/department/customer/rows?page=0&size=10&compatible=true
 *   (used whenever the admin picks customer columns for the dept)
 * - Sub-service flows (when they exist): GET /api/service/flows?page=0&size=100
 * - Round robin: GET/PUT /api/round-robin/department?departmentType=X
 * - GET /api/meetings/users/assigning-list?departmentType=X
 */
export function CustomerListPage() {
  const departmentId = useHeadDepartmentId()
  const session = getSession()
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const rawDepartment = session?.user.departmentType || deptFromUrl || ''
  const isGoogle =
    rawDepartment.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/google-head') ||
      window.location.pathname.startsWith('/google-user') ||
      window.location.pathname.startsWith('/google')
    ))
  const currentDepartment = isGoogle ? 'GOOGLE_DEPARTMENT' : (rawDepartment || 'ONBOARDING_DEPARTMENT')
  const isOnboardingDept = currentDepartment === 'ONBOARDING_DEPARTMENT'
  // Any non-onboarding (incl. dynamically added) department drives its
  // customer table from the generic rows endpoint once columns are picked.
  const useRowsEndpoint = !isOnboardingDept

  const customersQuery = useDepartmentCustomers(departmentId, { enabled: isOnboardingDept })
  const updateMutation = useUpdateCustomer(departmentId)
  const columnFeatures = useColumnFeatures(departmentId, 'customers')

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CustomerTab>('all')
  const [selectedAssigneeId, setSelectedAssigneeId] =
    useState<string | null | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCustomer, setSelectedCustomer] =
    useState<OnboardingCustomer | null>(null)
  const [modalTab, setModalTab] = useState<any>(undefined)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [localAssigneeMap, setLocalAssigneeMap] = useState<Record<string, string | null>>({})
  const [localStatusMap, setLocalStatusMap] = useState<Record<string, OnboardingStatus>>({})
  const [confirmingCustomer, setConfirmingCustomer] = useState<OnboardingCustomer | null>(null)
  const [serviceFlowCustomer, setServiceFlowCustomer] = useState<OnboardingCustomer | null>(null)
  const [serviceTagsCustomer, setServiceTagsCustomer] = useState<OnboardingCustomer | null>(null)
  const [googleInfoCustomer, setGoogleInfoCustomer] = useState<OnboardingCustomer | null>(null)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    title?: string
    message: string
  } | null>(null)
  const [callingCustomerId, setCallingCustomerId] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  // 1. Department Config: GET /api/dept-config/{departmentType}
  useQuery({
    queryKey: ['deptConfig', currentDepartment],
    queryFn: () => getDepartmentConfig(currentDepartment),
    enabled: useRowsEndpoint,
  })

  // 2. Sub-service flows (when they exist): GET /api/service/flows?page=0&size=100
  const serviceFlowsQuery = useQuery({
    queryKey: ['serviceFlows', currentDepartment],
    queryFn: () => getServiceFlows({ page: 0, size: 100 }),
    enabled: useRowsEndpoint,
  })
  const hasSubServiceFlow = (serviceFlowsQuery.data?.data.length ?? 0) > 0

  // 3. Department Users: GET /api/auth/department/users?page=0&size=100
  useDepartmentUsersList({ page: 0, size: 100 }, { enabled: useRowsEndpoint })

  // 4. Round robin status: GET /api/round-robin/department?departmentType=X
  const roundRobinQuery = useRoundRobinStatus(currentDepartment, {
    enabled: useRowsEndpoint,
  })
  const roundRobinMutation = useUpdateRoundRobinStatus(currentDepartment)
  const roundRobinEnabled = roundRobinQuery.data ?? false
  const [roundRobinDialogOpen, setRoundRobinDialogOpen] = useState(false)
  const [roundRobinError, setRoundRobinError] = useState<string | null>(null)

  const canEdit = columnFeatures.canEdit('actions')

  const role = (session?.user?.role || '').toUpperCase()
  const isDeptUser =
    role === 'USER' ||
    role === 'DEPARTMENT_USER' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.includes('/google-user') ||
        window.location.pathname.includes('/onboarding-user') ||
        window.location.pathname.includes('/users')))

  const { isColumnEnabled, canEditColumn } =
    useDepartmentColumnPermissions(currentDepartment)
  const isStatusVisible = isColumnEnabled('Status')
  const canEditStatus = isDeptUser || canEditColumn('Status')

  const isAssignToVisible =
    !isDeptUser &&
    (isColumnEnabled('Assign To') ||
      isColumnEnabled('Assign') ||
      isColumnEnabled('Assignee'))
  const canEditAssignTo =
    !isDeptUser &&
    (canEditColumn('Assign To') ||
      canEditColumn('Assign') ||
      canEditColumn('Assignee'))

  const isRemarkVisible =
    isColumnEnabled('Internal Remark') ||
    isColumnEnabled('Remark')
  const canEditRemark = session?.user.role === 'USER'

  const isContactVisible =
    isColumnEnabled('Contact') ||
    isColumnEnabled('Phone') ||
    isColumnEnabled('Email')

  const isBusinessVisible =
    isColumnEnabled('Business') ||
    isColumnEnabled('Company')

  useEffect(() => {
    if (!isStatusVisible && activeTab !== 'all') {
      setActiveTab('all')
    }
  }, [isStatusVisible, activeTab])

  const isUser = session?.user?.role === 'USER'
  const userEmail = session?.user?.email || session?.user?.username || ''

  // 1. Assigning users API - for Onboarding: ONBOARDING_DEPARTMENT, for Google: GOOGLE_DEPARTMENT
  const assigningUsersQuery = useAssigningUsers(currentDepartment, {
    enabled: !isUser,
  })

  const assignees: OnboardingAssignee[] = useMemo(() => {
    if (isUser) {
      return [
        {
          id: userEmail,
          name: session?.user?.name || userEmail,
        },
      ]
    }
    const list = assigningUsersQuery.data
    if (list && list.length > 0) {
      return list.map((u) => ({
        id: u.email,
        name: u.username ? `${u.username} (${u.email})` : u.email,
      }))
    }
    return isGoogle ? [] : FALLBACK_ASSIGNEES
  }, [isGoogle, isUser, userEmail, session?.user?.name, assigningUsersQuery.data])

  // Reset page when filters/search change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }
  const handleTabChange = (tab: CustomerTab) => {
    setActiveTab(tab)
    setPage(0)
  }
  const handleAssigneeChange = (id: string | null | 'all') => {
    setSelectedAssigneeId(id)
    setPage(0)
  }
  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    setPage(0)
  }
  const handleResetFilters = () => {
    setSearch('')
    setActiveTab('all')
    setSelectedAssigneeId('all')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  // 2. Summary counts: /api/auth/onboarding/summary (for onboarding)
  const authSummaryQuery = useAuthOnboardingSummary(
    {
      department: currentDepartment,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
      allTime: !dateFrom && !dateTo,
    },
    { enabled: isOnboardingDept },
  )

  // 3a. Onboarding customers live API: /api/auth/onboarding/customers?page=0&size=10
  const onboardingApiQuery = useOnboardingCustomersList({
    page,
    size,
    searchParam: search || undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
    status:
      activeTab === 'all'
        ? undefined
        : activeTab === 'in-progress'
          ? 'IN_PROGRESS'
          : activeTab.toUpperCase(),
  }, { enabled: isOnboardingDept })

  // 3b. Department customer rows (any non-onboarding dept):
  // /api/auth/department/customer/rows?page=0&size=10&compatible=true
  const departmentRowsQuery = useDepartmentCustomerRows(
    {
      page,
      size,
      searchParam: search || undefined,
      statusFilter:
        activeTab === 'all'
          ? undefined
          : activeTab === 'in-progress'
            ? 'IN_PROGRESS'
            : activeTab.toUpperCase(),
      userFilter:
        selectedAssigneeId !== 'all'
          ? selectedAssigneeId ?? undefined
          : undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
      compatible: true,
    },
    { enabled: useRowsEndpoint },
  )

  const activeCustomerQuery = useRowsEndpoint ? departmentRowsQuery : onboardingApiQuery

  const onboardingCustomers = useMemo<OnboardingCustomer[]>(() => {
    if (useRowsEndpoint) {
      const rows = departmentRowsQuery.data?.customers ?? []
      const serviceFallback = `${currentDepartment.replace(/_DEPARTMENT$/, '').replace(/_/g, ' ')} SERVICE`
      return rows.map((c, index) => {
        const id = String(c.id ?? c.customerId ?? `c-${index}`)
        const bName =
          c.businessName ||
          c.customerDetails?.businessName ||
          c.customerDetails?.ownerName ||
          c.ownerName ||
          'Customer'
        const cName =
          c.ownerName ||
          c.customerDetails?.ownerName ||
          c.customerDetails?.businessName ||
          'Customer'
        const email = c.email || c.customerDetails?.email || ''
        const phone = c.phoneNumber || c.customerDetails?.phoneNumber || ''
        const s = (c.status || c.onboardingStatus || 'pending').toLowerCase()
        const status = s.includes('complete')
          ? 'completed'
          : s.includes('progress') || s === 'active'
            ? 'in-progress'
            : 'pending'

        const hasDuplicates =
          Boolean(c.hasDuplicate) ||
          Boolean(c.hasDuplicateCustomer) ||
          Boolean(c.hasDuplicateCustomers) ||
          Boolean(c.customerDetails?.hasDuplicate) ||
          Boolean(c.customerDetails?.hasDuplicateCustomer) ||
          Number(c.duplicateCount ?? c.customerDetails?.duplicateCount ?? 0) > 0 ||
          (Array.isArray(c.duplicateCustomers) && c.duplicateCustomers.length > 0)

        const dupCount =
          Number(c.duplicateCount ?? c.customerDetails?.duplicateCount ?? (c.duplicateCustomers?.length || 0)) ||
          (hasDuplicates ? 1 : 0)

        const assigned =
          localAssigneeMap[id] !== undefined
            ? localAssigneeMap[id]
            : c.assignedUserEmail || c.assignedUserName || c.assignedTo || null

        return {
          id,
          rowIndex: page * size + index + 1,
          businessName: bName,
          contactName: cName,
          contactDate: c.createdAt
            ? new Date(c.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—',
          email,
          phone,
          formUrl:
            getCustomerFormUrl(phone || (c as any).contact, hasDuplicates) ||
            c.onboardingLink ||
            (c.customerDetails as any)?.onboardingLink ||
            '',
          serviceType: c.serviceType || serviceFallback,
          callStatus: 'connected',
          status: localStatusMap[id] !== undefined ? localStatusMap[id] : status,
          assigneeId: assigned,
          remark: getLatestInternalRemark(c, [currentDepartment, 'ONBOARDING_DEPARTMENT']) || c.remark || '',
          hasDuplicateCustomer: hasDuplicates,
          duplicateCount: dupCount,
          duplicateCustomers: c.duplicateCustomers || [],
          serviceTags: extractServiceTags(c),
          subServiceInfo: (c as any).subServiceInfo || (c.customerDetails as any)?.subServiceInfo,
          services: (c as any).services || [],
          rawCustomer: c,
        }
      })
    }

    const apiCustomers = onboardingApiQuery.data?.customers
    if (apiCustomers && apiCustomers.length > 0) {
      return apiCustomers.map((c, index) => {
        const id = String(c.id ?? c.customerId ?? `c-${index}`)
        const hasDuplicates =
          Boolean(c.hasDuplicate) ||
          Boolean(c.hasDuplicateCustomer) ||
          Boolean(c.hasDuplicateCustomers) ||
          Boolean(c.customerDetails?.hasDuplicate) ||
          Boolean(c.customerDetails?.hasDuplicateCustomer) ||
          Number(c.duplicateCount ?? c.customerDetails?.duplicateCount ?? 0) > 0 ||
          (Array.isArray(c.duplicateCustomers) && c.duplicateCustomers.length > 0)

        const dupCount =
          Number(c.duplicateCount ?? c.customerDetails?.duplicateCount ?? (c.duplicateCustomers?.length || 0)) ||
          (hasDuplicates ? 1 : 0)

        const assigned =
          localAssigneeMap[id] !== undefined
            ? localAssigneeMap[id]
            : c.assignedUserEmail || c.assignedUserName || c.assignedUser || c.assignedTo || null

        return {
          id,
          rowIndex: page * size + index + 1,
          businessName: c.businessName || c.ownerName || 'Customer',
          contactName: c.ownerName || 'Customer',
          contactDate: c.createdAt
            ? new Date(c.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'Recent',
          email: c.email || '',
          phone: c.phoneNumber || c.contact || '',
          formUrl:
            getCustomerFormUrl(c.phoneNumber || c.contact, hasDuplicates) ||
            c.onboardingLink ||
            '',
          callStatus: 'connected',
          status:
            localStatusMap[id] !== undefined
              ? localStatusMap[id]
              : c.onboardingStatus?.toLowerCase() === 'completed'
                ? 'completed'
                : c.onboardingStatus?.toLowerCase() === 'in_progress'
                  ? 'in-progress'
                  : 'pending',
          assigneeId: assigned,
          remark: getLatestInternalRemark(c, ['ONBOARDING_DEPARTMENT']) || c.remark || c.internalRemark || '',
          hasDuplicateCustomer: hasDuplicates,
          duplicateCount: dupCount,
          duplicateCustomers: c.duplicateCustomers || [],
          serviceTags: extractServiceTags(c),
          rawCustomer: c,
        }
      })
    }

    return (customersQuery.data ?? []).map((customer, index) => ({
      id: customer.id,
      rowIndex: page * size + index + 1,
      businessName: customer.company || customer.name,
      contactName: customer.name,
      contactDate:
        customer.contactDate ??
        new Date(customer.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      email: customer.email,
      phone: customer.phone,
      formUrl: getCustomerFormUrl(customer.phone, (customer.duplicateCount ?? 0) > 0),
      callStatus:
        customer.callStatus ??
        (index % 3 === 1 ? 'not-answered' : 'connected'),
      status:
        localStatusMap[customer.id] !== undefined
          ? localStatusMap[customer.id]
          : customer.onboardingStatus ??
            (customer.status === 'ACTIVE' ? 'in-progress' : 'pending'),
      assigneeId: localAssigneeMap[customer.id] ?? customer.assigneeId ?? null,
      remark: customer.remark ?? '',
      businessRelationType: customer.businessRelationType,
      businessCount: customer.businessCount,
      businessIndex: customer.businessIndex,
      duplicateCount: customer.duplicateCount,
      hasDuplicateCustomer: (customer.duplicateCount ?? 0) > 0,
      serviceTags: extractServiceTags(customer),
      rawCustomer: customer,
    }))
  }, [
    useRowsEndpoint,
    currentDepartment,
    departmentRowsQuery.data?.customers,
    onboardingApiQuery.data?.customers,
    customersQuery.data,
    localAssigneeMap,
    localStatusMap,
    page,
    size,
  ])

  const tabCounts = useMemo(() => {
    if (useRowsEndpoint) {
      const rows = departmentRowsQuery.data?.customers ?? []
      const total = departmentRowsQuery.data?.totalElements ?? rows.length
      return {
        all: activeTab === 'all' ? total : undefined,
        pending: activeTab === 'pending' ? total : undefined,
        inProgress: activeTab === 'in-progress' ? total : undefined,
        completed: activeTab === 'completed' ? total : undefined,
      }
    }

    const authData = authSummaryQuery.data
    const apiSummary = onboardingApiQuery.data?.summary

    const all =
      authData?.totalCustomers ??
      authData?.total ??
      authData?.summary?.total ??
      apiSummary?.total

    const pending =
      authData?.totalPendingOnboarding ??
      authData?.pendingCustomers ??
      authData?.pending ??
      authData?.summary?.pending ??
      apiSummary?.pending

    const inProgress =
      authData?.totalInProgressOnboarding ??
      authData?.inProgressCustomers ??
      authData?.inProgress ??
      authData?.summary?.inProgress ??
      apiSummary?.inProgress

    const completed =
      authData?.totalCompletedOnboarding ??
      authData?.totalOnboardedCustomers ??
      authData?.onboardedCustomers ??
      authData?.completed ??
      authData?.summary?.completed ??
      apiSummary?.completed

    // The customer-list endpoint is already filtered by the selected status.
    // Its total is authoritative for the active tab; the summary endpoint can
    // lag behind and has been observed returning 0 while matching rows exist.
    const filteredApiTotal = onboardingApiQuery.data?.totalElements
    const activeApiCount =
      typeof filteredApiTotal === 'number' && filteredApiTotal > 0
        ? filteredApiTotal
        : onboardingCustomers.length

    return {
      all,
      pending: activeTab === 'pending' ? activeApiCount : pending,
      inProgress: activeTab === 'in-progress' ? activeApiCount : inProgress,
      completed: activeTab === 'completed' ? activeApiCount : completed,
    }
  }, [useRowsEndpoint, departmentRowsQuery.data, authSummaryQuery.data, onboardingApiQuery.data?.summary])

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return onboardingCustomers
      .filter(
        (customer) =>
          activeTab === 'all' || customer.status === activeTab,
      )
      .filter(
        (customer) =>
          selectedAssigneeId === 'all' ||
          customer.assigneeId === selectedAssigneeId,
      )
      .filter(
        (customer) =>
          !term ||
          [
            customer.businessName,
            customer.contactName,
            customer.email,
            customer.phone,
          ].some((value) => value.toLowerCase().includes(term)),
      )
  }, [activeTab, onboardingCustomers, search, selectedAssigneeId])

  const isLoading = useRowsEndpoint
    ? activeCustomerQuery.isPending
    : customersQuery.isPending && activeCustomerQuery.isPending

  if (isLoading) {
    return <LoadingState message="Loading customers..." />
  }

  const isError = useRowsEndpoint
    ? activeCustomerQuery.isError
    : customersQuery.isError && activeCustomerQuery.isError

  if (isError) {
    return (
      <ErrorState
        title="Unable to load customers"
        message={
          activeCustomerQuery.error?.message ||
          customersQuery.error?.message ||
          'Failed to load'
        }
        onRetry={() => {
          activeCustomerQuery.refetch()
          if (isOnboardingDept) customersQuery.refetch()
        }}
      />
    )
  }

  async function handleAssignUser(customerId: string, assigneeId: string | null) {
    if (!assigneeId) return
    setLocalAssigneeMap((prev) => ({ ...prev, [customerId]: assigneeId }))
    try {
      await assignCustomerUser({
        customerId,
        assignedUserEmail: assigneeId,
        departmentType: currentDepartment,
      })
      await activeCustomerQuery.refetch()
    } catch (err: unknown) {
      console.error('Failed to assign user:', err)
      const msg = err instanceof Error ? err.message : 'Unable to assign customer'
      alert(`Assignment failed: ${msg}`)
      setLocalAssigneeMap((prev) => {
        const next = { ...prev }
        delete next[customerId]
        return next
      })
    }
  }

  async function handleCallCustomer(customer: OnboardingCustomer) {
    setCallingCustomerId(customer.id)
    try {
      const result = await initiateAirtelClickToCall(customer.phone)
      if (result?.success === false) {
        throw new Error(result.message || 'Unable to initiate call')
      }
      setToast({
        type: 'success',
        title: 'Call initiated',
        message: `Connecting you to ${customer.contactName || customer.phone}. Please pick up when your phone rings.`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to initiate call'
      setToast({ type: 'error', title: 'Call failed', message })
    } finally {
      setCallingCustomerId(null)
    }
  }

  async function handleStatusChange(customerId: string, status: OnboardingStatus) {
    if (!isDeptUser && !canEditStatus) {
      alert("You don't have permission to update status.")
      return
    }

    // Customer acknowledgement is strictly required before marking Completed for Onboarding department
    if (!useRowsEndpoint && status === 'completed') {
      const target =
        filteredCustomers.find((c) => c.id === customerId) ||
        onboardingCustomers.find((c) => c.id === customerId)
      if (target) {
        setConfirmingCustomer(target)
        return
      }
    }

    // When sub-service flows exist, all sub-services must be completed before marking Completed
    if (hasSubServiceFlow && status === 'completed') {
      const target =
        filteredCustomers.find((c) => c.id === customerId) ||
        onboardingCustomers.find((c) => c.id === customerId)

      let allDone = false
      if (Array.isArray(target?.subServiceInfo) && target.subServiceInfo.length > 0) {
        allDone = target.subServiceInfo.every((sub: any) => {
          const st = sub?.status || (typeof sub === 'object' ? Object.values(sub)[0] : '')
          return String(st).toUpperCase() === 'COMPLETED'
        })
      } else if (Array.isArray(target?.services) && target.services.length > 0) {
        allDone = target.services.every((s: any) => String(s?.status).toUpperCase() === 'COMPLETED')
      }

      if (!allDone) {
        alert('All sub-services must be completed and acknowledgement sent before marking the main service as completed.')
        return
      }
    }

    const prevStatus = localStatusMap[customerId]
    setLocalStatusMap((prev) => ({ ...prev, [customerId]: status }))

    try {
      if (useRowsEndpoint) {
        const target =
          filteredCustomers.find((c) => c.id === customerId) ||
          onboardingCustomers.find((c) => c.id === customerId)
        const oldStatus = target?.status || 'PENDING'
        const sType = target?.serviceType || `${currentDepartment.replace(/_DEPARTMENT$/, '').replace(/_/g, ' ')} SERVICE`

        await updateDepartmentServiceStatus({
          customerId,
          serviceType: sType,
          newStatus: status,
          oldStatus,
          departmentType: currentDepartment,
        })
      } else {
        await updateOnboardingStatus(customerId, status)
      }

      await activeCustomerQuery.refetch()
      if (isOnboardingDept) await authSummaryQuery.refetch()
    } catch (err: unknown) {
      console.error('Failed to update status:', err)
      const msg = err instanceof Error ? err.message : 'Unable to update status'
      alert(`Status update failed: ${msg}`)
      setLocalStatusMap((prev) => {
        const next = { ...prev }
        if (prevStatus !== undefined) {
          next[customerId] = prevStatus
        } else {
          delete next[customerId]
        }
        return next
      })
    }
  }

  function patchCustomer(id: string, patch: UpdateCustomerRequest) {
    updateMutation.mutate({ id, data: patch })
  }

  const showRoundRobinToggle = useRowsEndpoint && !isDeptUser && !isUser

  function handleConfirmRoundRobin() {
    setRoundRobinError(null)
    roundRobinMutation.mutate(!roundRobinEnabled, {
      onSuccess: () => {
        setRoundRobinDialogOpen(false)
      },
      onError: (err: unknown) => {
        setRoundRobinError(
          err instanceof Error ? err.message : 'Failed to update round robin status',
        )
      },
    })
  }

  return (
    <>
      <CustomersListFilters
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabCounts={tabCounts}
        searchSlot={
          <CustomersListSearchBar
            value={search}
            onChange={handleSearchChange}
          />
        }
        actionsSlot={
          showRoundRobinToggle ? (
            <button
              type="button"
              className={`cl-filter-btn${roundRobinEnabled ? ' is-open' : ''}`}
              title={roundRobinEnabled ? 'Disable round robin assignment' : 'Enable round robin assignment'}
              onClick={() => {
                setRoundRobinError(null)
                setRoundRobinDialogOpen(true)
              }}
              disabled={roundRobinQuery.isPending}
            >
              ⇄ Round Robin: {roundRobinQuery.isPending ? '…' : roundRobinEnabled ? 'ON' : 'OFF'}
            </button>
          ) : undefined
        }
        assignees={assignees}
        selectedAssigneeId={selectedAssigneeId}
        onAssigneeChange={handleAssigneeChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={handleDateChange}
        onReset={handleResetFilters}
      />

      <CustomersList
        customers={filteredCustomers}
        assignees={assignees}
        canEdit={canEdit}
        showStatus={isStatusVisible}
        canEditStatus={canEditStatus}
        showAssignTo={isAssignToVisible}
        canEditAssignTo={canEditAssignTo}
        showRemark={isRemarkVisible}
        canEditRemark={canEditRemark}
        showContact={isContactVisible}
        showBusiness={isBusinessVisible}
        showUpdated={false}
        showServiceType={useRowsEndpoint}
        isGoogle={isGoogle}
        onOpenServiceFlow={(cust) => setServiceFlowCustomer(cust)}
        onOpenServiceTags={(cust) => setServiceTagsCustomer(cust)}
        onOpenGoogleInfo={(cust) => setGoogleInfoCustomer(cust)}
        onOpenDetail={(cust, tab) => {
          setSelectedCustomer(cust)
          setModalTab(tab)
        }}
        onOpenDuplicate={(cust) => {
          setSelectedCustomer(cust)
          setModalTab('duplicates')
        }}
        onStatusChange={(id, status) => handleStatusChange(id, status)}
        onCallCustomer={handleCallCustomer}
        callingCustomerId={callingCustomerId}
        onSendAcknowledgement={setConfirmingCustomer}
        onAssigneeChange={handleAssignUser}
        onRemarkChange={(id, remark) =>
          patchCustomer(id, { remark })
        }
      />

      {/* Table Pagination */}
      <TablePagination
        page={page}
        pageSize={size}
        totalResults={(() => {
          const apiTotal = activeCustomerQuery.data?.totalElements
          if (typeof apiTotal === 'number' && apiTotal > 0) return apiTotal
          const activeCount =
            activeTab === 'all'
              ? tabCounts.all
              : activeTab === 'in-progress'
                ? tabCounts.inProgress
                : tabCounts[activeTab]
          return typeof activeCount === 'number' && activeCount > 0
            ? activeCount
            : filteredCustomers.length
        })()}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setSize(newSize)
          setPage(0)
        }}
        pageSizeOptions={[10, 20, 50, 100]}
        disabled={activeCustomerQuery.isFetching}
      />

      <CustomersListModal
        customer={selectedCustomer}
        assignees={assignees}
        showStatus={isStatusVisible}
        showAssignTo={isAssignToVisible}
        departmentType={currentDepartment}
        initialTab={modalTab}
        onClose={() => {
          setSelectedCustomer(null)
          setModalTab(undefined)
        }}
      />

      <ServiceFlowModal
        customer={serviceFlowCustomer}
        isOpen={Boolean(serviceFlowCustomer)}
        onClose={() => setServiceFlowCustomer(null)}
        departmentType={currentDepartment}
        onStepsUpdated={() => {
          activeCustomerQuery.refetch()
        }}
        onSubServiceStatusUpdated={() => {
          activeCustomerQuery.refetch()
        }}
      />

      <ServiceTagsModal
        isOpen={Boolean(serviceTagsCustomer)}
        customer={serviceTagsCustomer}
        onClose={() => setServiceTagsCustomer(null)}
        onTagsUpdated={() => {
          activeCustomerQuery.refetch()
        }}
      />

      <GoogleInfoModal
        customer={googleInfoCustomer}
        isOpen={Boolean(googleInfoCustomer)}
        onClose={() => setGoogleInfoCustomer(null)}
      />

      <OnboardingConfirmationModal
        open={Boolean(confirmingCustomer)}
        customer={confirmingCustomer}
        onClose={() => setConfirmingCustomer(null)}
        onSuccess={() => {
          setConfirmingCustomer(null)
          setToast({ type: 'success', message: 'Acknowledgement sent successfully' })
          activeCustomerQuery.refetch()
          authSummaryQuery.refetch()
        }}
      />

      <ConfirmDialog
        open={roundRobinDialogOpen}
        title={roundRobinEnabled ? 'Disable Round Robin' : 'Enable Round Robin'}
        message={
          roundRobinEnabled
            ? 'Stop automatic customer distribution among your team members?'
            : 'Automatically distribute customers evenly among your team members?'
        }
        confirmLabel={roundRobinEnabled ? 'Disable' : 'Enable'}
        isLoading={roundRobinMutation.isPending}
        error={roundRobinError ?? undefined}
        onClose={() => setRoundRobinDialogOpen(false)}
        onConfirm={handleConfirmRoundRobin}
      />

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
