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
} from '../../hooks/useDepartmentUsersList'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import { getSession } from '../../../../app/auth/session'
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
  const customersQuery = useDepartmentCustomers(departmentId)
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
  const [page, setPage] = useState(0)
  const [size] = useState(10)

  const canEdit = columnFeatures.canEdit('actions')

  const { isColumnEnabled, canEditColumn } =
    useDepartmentColumnPermissions('ONBOARDING_DEPARTMENT')
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

  const isUpdatedVisible =
    isColumnEnabled('Updated')

  useEffect(() => {
    if (!isStatusVisible && activeTab !== 'all') {
      setActiveTab('all')
    }
  }, [isStatusVisible, activeTab])

  const session = getSession()
  const isUser = session?.user?.role === 'USER'
  const userEmail = session?.user?.email || session?.user?.username || ''

  // 1. Assigning users API - disabled for department users
  const assigningUsersQuery = useAssigningUsers('ONBOARDING_DEPARTMENT', {
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

  // 2. Summary counts: /api/auth/onboarding/summary
  const authSummaryQuery = useAuthOnboardingSummary({
    department: 'ONBOARDING_DEPARTMENT',
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
    allTime: !dateFrom && !dateTo,
  })

  // 3. Onboarding customers live API: /api/auth/onboarding/customers?page=0&size=10
  const onboardingApiQuery = useOnboardingCustomersList({
    page,
    size,
    searchParam: search || undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
    status: activeTab === 'all' ? undefined : activeTab.toUpperCase(),
    filteredUser: isUser
      ? userEmail
      : selectedAssigneeId !== 'all'
        ? selectedAssigneeId ?? undefined
        : undefined,
  })

  const onboardingCustomers = useMemo<OnboardingCustomer[]>(() => {
    const apiCustomers = onboardingApiQuery.data?.customers
    if (apiCustomers && apiCustomers.length > 0) {
      return apiCustomers.map((c, index) => ({
        id: String(c.id ?? c.customerId ?? `c-${index}`),
        rowIndex: index + 1,
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
        phone: c.phoneNumber || '',
        callStatus: 'connected',
        status:
          c.onboardingStatus?.toLowerCase() === 'completed'
            ? 'completed'
            : c.onboardingStatus?.toLowerCase() === 'in_progress'
              ? 'in-progress'
              : 'pending',
        assigneeId: c.assignedUser ?? null,
        remark: '',
        updatedLabel: 'Just now',
      }))
    }

    return (customersQuery.data ?? []).map((customer, index) => ({
      id: customer.id,
      rowIndex: index + 1,
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
      assigneeId: customer.assigneeId ?? null,
      remark: customer.remark ?? '',
      updatedLabel:
        customer.updatedLabel ??
        (index === 0 ? 'Just now' : `${index + 1}h ago`),
      businessRelationType: customer.businessRelationType,
      businessCount: customer.businessCount,
      businessIndex: customer.businessIndex,
      duplicateCount: customer.duplicateCount,
    }))
  }, [onboardingApiQuery.data?.customers, customersQuery.data])

  const tabCounts = useMemo(() => {
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
  }, [authSummaryQuery.data, onboardingApiQuery.data?.summary])

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

  if (customersQuery.isPending && onboardingApiQuery.isPending) {
    return <LoadingState message="Loading customers..." />
  }

  if (customersQuery.isError && onboardingApiQuery.isError) {
    return (
      <ErrorState
        title="Unable to load customers"
        message={
          customersQuery.error?.message ||
          onboardingApiQuery.error?.message ||
          'Failed to load'
        }
        onRetry={() => {
          customersQuery.refetch()
          onboardingApiQuery.refetch()
        }}
      />
    )
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
        showUpdated={isUpdatedVisible}
        onOpenDetail={setSelectedCustomer}
        onStatusChange={(id, status) =>
          patchCustomer(id, { onboardingStatus: status })
        }
        onAssigneeChange={(id, assigneeId) =>
          patchCustomer(id, { assigneeId: assigneeId ?? undefined })
        }
        onRemarkChange={(id, remark) =>
          patchCustomer(id, { remark })
        }
      />

      {/* Pagination */}
      {onboardingApiQuery.data && onboardingApiQuery.data.totalPage > 1 && (
        <div className="clist-pagination">
          <button
            className="clist-page-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || onboardingApiQuery.isFetching}
          >
            Previous
          </button>
          <span className="clist-page-info">
            Page {page + 1} of {onboardingApiQuery.data.totalPage}
            {onboardingApiQuery.data.totalElements !== undefined && (
              <span> · {onboardingApiQuery.data.totalElements} total</span>
            )}
          </span>
          <button
            className="clist-page-btn"
            onClick={() => setPage((p) => Math.min(onboardingApiQuery.data.totalPage - 1, p + 1))}
            disabled={page >= onboardingApiQuery.data.totalPage - 1 || onboardingApiQuery.isFetching}
          >
            Next
          </button>
        </div>
      )}

      <CustomersListModal
        customer={selectedCustomer}
        assignees={assignees}
        showStatus={isStatusVisible}
        showAssignTo={isAssignToVisible}
        onClose={() => setSelectedCustomer(null)}
      />
    </>
  )
}