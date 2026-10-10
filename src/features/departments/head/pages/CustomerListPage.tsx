import { useMemo, useState, useEffect } from 'react'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import {
  CustomersList,
  type OnboardingAssignee,
  type OnboardingCustomer,
} from '../../../../components/head/customers-list/CustomersList'
import {
  CustomersListFilters,
  type CustomerTab,
} from '../../../../components/head/customers-list/CustomersListFilters'
import { CustomersListSearchBar } from '../../../../components/head/customers-list/CustomersListSearchBar'
import { CustomersListModal } from '../../../../components/head/customers-list/CustomersListModal'
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
import { assignCustomerUser } from '../../../../api/department-users.api'
import { TablePagination } from '../../../../components/ui/TablePagination'
import { getLatestInternalRemark } from '../../../../utils/internalRemarkUtils'
import type { UpdateCustomerRequest } from '../../types/customer.types'

const FALLBACK_ASSIGNEES: OnboardingAssignee[] = sampleDepartmentUsers.map(
  (user) => ({
    id: user.id,
    name: user.name,
  }),
)

/**
 * Head panel — Customer List. Renders the customers-list UI
 * composed from components/head/customers-list, wired to:
 * - GET /api/auth/onboarding/customers?page=0&size=10
 * - GET /api/meetings/users/assigning-list?departmentType=ONBOARDING_DEPARTMENT
 */
export function CustomerListPage() {
  const departmentId = useHeadDepartmentId()
  const session = getSession()
  const rawDepartment = session?.user.departmentType || ''
  const isGoogle =
    rawDepartment.toUpperCase().includes('GOOGLE') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/google-head'))
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

  const canEdit = columnFeatures.canEdit('actions')

  const { isColumnEnabled, canEditColumn } =
    useDepartmentColumnPermissions(currentDepartment)
  const isStatusVisible = isColumnEnabled('Status')
  const canEditStatus = canEditColumn('Status')

  const isAssignToVisible =
    isColumnEnabled('Assign To') ||
    isColumnEnabled('Assign') ||
    isColumnEnabled('Assignee')
  const canEditAssignTo =
    canEditColumn('Assign To') ||
    canEditColumn('Assign') ||
    canEditColumn('Assignee')

  const isRemarkVisible =
    isColumnEnabled('Internal Remark') ||
    isColumnEnabled('Remark')
  const canEditRemark =
    canEditColumn('Internal Remark') ||
    canEditColumn('Remark')

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
    return FALLBACK_ASSIGNEES
  }, [isUser, userEmail, session?.user?.name, assigningUsersQuery.data])

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
  })

  // 3b. Google Department customer rows API: /api/auth/department/customer/rows?page=0&size=10&compatible=true
  const googleCustomerRowsQuery = useDepartmentCustomerRows(
    {
      page,
      size,
      searchParam: search || undefined,
      statusFilter: activeTab === 'all' ? undefined : activeTab.toUpperCase(),
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
            : 'Recent',
          email,
          phone,
          callStatus: 'connected',
          status,
          assigneeId: assigned,
          remark: getLatestInternalRemark(c, ['ONBOARDING_DEPARTMENT']) || c.remark || '',
          hasDuplicateCustomer: hasDuplicates,
          duplicateCount: dupCount,
          duplicateCustomers: c.duplicateCustomers || [],
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
          formUrl: c.onboardingLink,
          callStatus: 'connected',
          status:
            c.onboardingStatus?.toLowerCase() === 'completed'
              ? 'completed'
              : c.onboardingStatus?.toLowerCase() === 'in_progress'
                ? 'in-progress'
                : 'pending',
          assigneeId: assigned,
          remark: getLatestInternalRemark(c, ['ONBOARDING_DEPARTMENT']) || c.remark || c.internalRemark || '',
          hasDuplicateCustomer: hasDuplicates,
          duplicateCount: dupCount,
          duplicateCustomers: c.duplicateCustomers || [],
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
      callStatus:
        customer.callStatus ??
        (index % 3 === 1 ? 'not-answered' : 'connected'),
      status:
        customer.onboardingStatus ??
        (customer.status === 'ACTIVE' ? 'in-progress' : 'pending'),
      assigneeId: localAssigneeMap[customer.id] ?? customer.assigneeId ?? null,
      remark: customer.remark ?? '',
      businessRelationType: customer.businessRelationType,
      businessCount: customer.businessCount,
      businessIndex: customer.businessIndex,
      duplicateCount: customer.duplicateCount,
      hasDuplicateCustomer: (customer.duplicateCount ?? 0) > 0,
    }))
  }, [
    isGoogle,
    googleCustomerRowsQuery.data?.customers,
    onboardingApiQuery.data?.customers,
    customersQuery.data,
    localAssigneeMap,
    page,
    size,
  ])

  const tabCounts = useMemo(() => {
    if (isGoogle) {
      const rows = googleCustomerRowsQuery.data?.customers ?? []
      const total = googleCustomerRowsQuery.data?.totalElements ?? rows.length
      return {
        all: total,
        pending: rows.filter((r) => (r.status || '').toLowerCase().includes('pending')).length,
        inProgress: rows.filter((r) => (r.status || '').toLowerCase().includes('progress') || (r.status || '').toUpperCase() === 'ACTIVE').length,
        completed: rows.filter((r) => (r.status || '').toLowerCase().includes('complete')).length,
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
      authData?.pending ??
      authData?.summary?.pending ??
      apiSummary?.pending

    const inProgress =
      authData?.totalInProgressOnboarding ??
      authData?.inProgress ??
      authData?.summary?.inProgress ??
      apiSummary?.inProgress

    const completed =
      authData?.totalCompletedOnboarding ??
      authData?.totalOnboardedCustomers ??
      authData?.completed ??
      authData?.summary?.completed ??
      apiSummary?.completed

    return {
      all,
      pending,
      inProgress,
      completed,
    }
  }, [isGoogle, googleCustomerRowsQuery.data, authSummaryQuery.data, onboardingApiQuery.data?.summary])

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

  function patchCustomer(id: string, patch: UpdateCustomerRequest) {
    if (!canEdit) return
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
        onOpenDetail={(cust, tab) => {
          setSelectedCustomer(cust)
          setModalTab(tab)
        }}
        onOpenDuplicate={(cust) => {
          setSelectedCustomer(cust)
          setModalTab('duplicates')
        }}
        onStatusChange={(id, status) =>
          patchCustomer(id, { onboardingStatus: status })
        }
        onAssigneeChange={handleAssignUser}
        onRemarkChange={(id, remark) =>
          patchCustomer(id, { remark })
        }
      />

      {/* Table Pagination */}
      <TablePagination
        page={page}
        pageSize={size}
        totalResults={activeCustomerQuery.data?.totalElements ?? onboardingCustomers.length}
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
    </>
  )
}