import { useMemo, useState } from 'react'
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
import { useOnboardingCustomersList } from '../../hooks/useDepartmentUsersList'
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

  const canEdit = columnFeatures.canEdit('actions')

  // 1. Assigning users API
  const assigningUsersQuery = useAssigningUsers('ONBOARDING_DEPARTMENT')

  const assignees: OnboardingAssignee[] = useMemo(() => {
    const list = assigningUsersQuery.data
    if (list && list.length > 0) {
      return list.map((u) => ({
        id: u.email,
        name: u.username ? `${u.username} (${u.email})` : u.email,
      }))
    }
    return FALLBACK_ASSIGNEES
  }, [assigningUsersQuery.data])

  // 2. Onboarding customers live API
  const onboardingApiQuery = useOnboardingCustomersList({
    page: 0,
    size: 50,
    searchParam: search || undefined,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
    status: activeTab === 'all' ? undefined : activeTab.toUpperCase(),
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

  const tabCounts = useMemo(
    () => ({
      all: onboardingCustomers.length,
      pending: onboardingCustomers.filter(
        (item) => item.status === 'pending',
      ).length,
      inProgress: onboardingCustomers.filter(
        (item) => item.status === 'in-progress',
      ).length,
      completed: onboardingCustomers.filter(
        (item) => item.status === 'completed',
      ).length,
    }),
    [onboardingCustomers],
  )

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

  function resetFilters() {
    setSearch('')
    setActiveTab('all')
    setSelectedAssigneeId('all')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <>
      <CustomersListFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabCounts={tabCounts}
        searchSlot={
          <CustomersListSearchBar
            value={search}
            onChange={setSearch}
          />
        }
        assignees={assignees}
        selectedAssigneeId={selectedAssigneeId}
        onAssigneeChange={setSelectedAssigneeId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateChange={(from, to) => {
          setDateFrom(from)
          setDateTo(to)
        }}
        onReset={resetFilters}
      />

      <CustomersList
        customers={filteredCustomers}
        assignees={assignees}
        canEdit={canEdit}
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

      <CustomersListModal
        customer={selectedCustomer}
        assignees={assignees}
        onClose={() => setSelectedCustomer(null)}
      />
    </>
  )
}