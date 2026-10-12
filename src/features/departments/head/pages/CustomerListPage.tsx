import { useMemo, useState, useEffect } from 'react'
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
} from '../../../../api/service-flow.api'
import '../../../../components/head/customers-list/CustomersList.css'
import { sampleDepartmentUsers } from '../../../../api/mock/head.db'
import { useDepartmentCustomers } from '../../hooks/useDepartmentCustomers'
import { useUpdateCustomer } from '../../hooks/useUpdateCustomer'
import { useColumnFeatures } from '../../../permissions/hooks/useColumnFeatures'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { useAssigningUsers } from '../../hooks/useAssigningUsers'
import {
  useOnboardingCustomersList,
  useAuthOnboardingSummary,
  useDepartmentCustomerRows,
} from '../../hooks/useDepartmentUsersList'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import { getSession } from '../../../../app/auth/session'
import { assignCustomerUser, updateOnboardingStatus } from '../../../../api/department-users.api'
import { TablePagination } from '../../../../components/ui/TablePagination'
import { getLatestInternalRemark } from '../../../../utils/internalRemarkUtils'
import { getCustomerFormUrl } from '../../../../utils/urlEncryption'
import type { UpdateCustomerRequest } from '../../types/customer.types'
import { Icon } from '../../../../components/head/shared/Icon'
import { initiateAirtelClickToCall } from '../../../../api/airtel.api'

const FALLBACK_ASSIGNEES: OnboardingAssignee[] = sampleDepartmentUsers.map(
  (user) => ({
    id: user.id,
    name: user.name,
  }),
)

/**
 * Department customer list. Google uses the department rows endpoint;
 * onboarding uses its dedicated customers endpoint.
 */
export function CustomerListPage() {
  const departmentId = useHeadDepartmentId()
  const session = getSession()
  const rawDepartment = session?.user.departmentType || ''
  const isGoogle =
    rawDepartment.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/google-head') ||
      window.location.pathname.startsWith('/google-user') ||
      window.location.pathname.startsWith('/google')
    ))
  const currentDepartment = isGoogle ? 'GOOGLE_DEPARTMENT' : (rawDepartment || 'ONBOARDING_DEPARTMENT')

  const customersQuery = useDepartmentCustomers(departmentId, { enabled: !isGoogle })
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [callingCustomerId, setCallingCustomerId] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

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
    { enabled: !isGoogle },
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
  }, { enabled: !isGoogle })

  // 3b. Google Department customer rows API: /api/auth/department/customer/rows?page=0&size=10&compatible=true
  const googleCustomerRowsQuery = useDepartmentCustomerRows(
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
    { enabled: isGoogle },
  )

  const activeCustomerQuery = isGoogle ? googleCustomerRowsQuery : onboardingApiQuery

  const onboardingCustomers = useMemo<OnboardingCustomer[]>(() => {
    if (isGoogle) {
      const rows = googleCustomerRowsQuery.data?.customers ?? []
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
          serviceType: c.serviceType || '—',
          status: localStatusMap[id] !== undefined ? localStatusMap[id] : status,
          assigneeId: assigned,
          remark: getLatestInternalRemark(c, ['GOOGLE_DEPARTMENT', 'ONBOARDING_DEPARTMENT']) || c.remark || '',
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
    isGoogle,
    googleCustomerRowsQuery.data?.customers,
    onboardingApiQuery.data?.customers,
    customersQuery.data,
    localAssigneeMap,
    localStatusMap,
    page,
    size,
  ])

  const tabCounts = useMemo(() => {
    if (isGoogle) {
      const rows = googleCustomerRowsQuery.data?.customers ?? []
      const total = googleCustomerRowsQuery.data?.totalElements ?? rows.length
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
  }, [
    isGoogle,
    activeTab,
    googleCustomerRowsQuery.data,
    authSummaryQuery.data,
    onboardingApiQuery.data?.summary,
    onboardingApiQuery.data?.totalElements,
    onboardingCustomers.length,
  ])

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

  const isLoading = isGoogle
    ? activeCustomerQuery.isPending
    : customersQuery.isPending && activeCustomerQuery.isPending

  if (isLoading) {
    return <LoadingState message="Loading customers..." />
  }

  const isError = isGoogle
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
          if (!isGoogle) customersQuery.refetch()
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
        message: `Call initiated to ${customer.contactName || customer.phone}. Please pick up when your phone rings.`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to initiate call'
      setToast({ type: 'error', message })
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
    if (!isGoogle && status === 'completed') {
      const target =
        filteredCustomers.find((c) => c.id === customerId) ||
        onboardingCustomers.find((c) => c.id === customerId)
      if (target) {
        setConfirmingCustomer(target)
        return
      }
    }

    // For Google Department, all sub-services must be completed before marking Completed
    if (isGoogle && status === 'completed') {
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
      if (isGoogle) {
        const target =
          filteredCustomers.find((c) => c.id === customerId) ||
          onboardingCustomers.find((c) => c.id === customerId)
        const sType = target?.serviceType
        if (!sType || sType === '—') {
          throw new Error('Google service type is missing from the customer response')
        }
        const oldStatus = target.status

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
      if (!isGoogle) await authSummaryQuery.refetch()

      if (!isGoogle && status === 'in-progress') {
        const target =
          filteredCustomers.find((customer) => customer.id === customerId) ||
          onboardingCustomers.find((customer) => customer.id === customerId)
        if (target) setConfirmingCustomer(target)
      }
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
        showServiceType={isGoogle}
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
      {toast && (
        <div className={`cl-toast cl-toast--${toast.type}`} role="status" aria-live="polite">
          <Icon name={toast.type === 'success' ? 'done' : 'alert'} size={17} strokeWidth={2} />
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification">×</button>
        </div>
      )}
    </>
  )
}
