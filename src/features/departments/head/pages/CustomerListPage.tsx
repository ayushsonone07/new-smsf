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
import type { UpdateCustomerRequest } from '../../types/customer.types'

const ASSIGNEES: OnboardingAssignee[] = sampleDepartmentUsers.map((user) => ({
  id: user.id,
  name: user.name,
}))

/**
 * Head panel — Customer List. Renders the customers-list UI
 * composed from components/head/customers-list, wired to the
 * customer API. Access follows the admin's Actions column
 * permission (single-gate): CAN_READ → read-only.
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

  const onboardingCustomers = useMemo<OnboardingCustomer[]>(
    () =>
      (customersQuery.data ?? []).map((customer, index) => ({
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
          customer.callStatus ?? (index % 3 === 1 ? 'not-answered' : 'connected'),
        status:
          customer.onboardingStatus ??
          (customer.status === 'ACTIVE' ? 'in-progress' : 'pending'),
        assigneeId: customer.assigneeId ?? null,
        remark: customer.remark ?? '',
        updatedLabel:
          customer.updatedLabel ?? (index === 0 ? 'Just now' : `${index + 1}h ago`),
        businessRelationType: customer.businessRelationType,
        businessCount: customer.businessCount,
        businessIndex: customer.businessIndex,
        duplicateCount: customer.duplicateCount,
      })),
    [customersQuery.data],
  )

  const tabCounts = useMemo(
    () => ({
      all: onboardingCustomers.length,
      pending: onboardingCustomers.filter((item) => item.status === 'pending').length,
      inProgress: onboardingCustomers.filter((item) => item.status === 'in-progress').length,
      completed: onboardingCustomers.filter((item) => item.status === 'completed').length,
    }),
    [onboardingCustomers],
  )

  const filteredCustomers = useMemo(
    () => {
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
        .filter((customer) => {
          const source = customersQuery.data?.find(
            (item) => item.id === customer.id,
          )
          if (!source) return false
          const created = source.createdAt.slice(0, 10)
          return (
            (!dateFrom || created >= dateFrom) &&
            (!dateTo || created <= dateTo)
          )
        })
    },
    [
      activeTab,
      customersQuery.data,
      dateFrom,
      dateTo,
      onboardingCustomers,
      search,
      selectedAssigneeId,
    ],
  )

  if (customersQuery.isPending) {
    return <LoadingState message="Loading customers..." />
  }

  if (customersQuery.isError) {
    return (
      <ErrorState
        title="Unable to load customers"
        message={customersQuery.error.message}
        onRetry={() => customersQuery.refetch()}
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
        assignees={ASSIGNEES}
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
        assignees={ASSIGNEES}
        canEdit={canEdit}
        onStatusChange={(id, status) =>
          patchCustomer(id, { onboardingStatus: status })
        }
        onAssigneeChange={(id, assigneeId) =>
          patchCustomer(id, { assigneeId })
        }
        onRemarkChange={(id, remark) =>
          patchCustomer(id, { remark })
        }
        onOpenDetail={setSelectedCustomer}
      />
      <CustomersListModal
        customer={selectedCustomer}
        assignees={ASSIGNEES}
        onClose={() => setSelectedCustomer(null)}
      />
    </>
  )
}