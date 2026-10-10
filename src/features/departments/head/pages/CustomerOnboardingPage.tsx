import { useMemo, useState } from 'react'
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
import '../../../../components/head/customers-list/CustomersList.css'
import { sampleDepartmentUsers } from '../../../../api/mock/head.db'
import { getSession } from '../../../../app/auth/session'
import { useDepartmentCustomers } from '../../hooks/useDepartmentCustomers'
import { useColumnFeatures } from '../../../permissions/hooks/useColumnFeatures'
import { useHeadDepartmentId } from '../hooks/useHeadDepartmentId'
import { useDepartmentColumnPermissions } from '../../../permissions/hooks/useDepartmentColumnPermissions'
import type { FeaturePermission } from '../../../permissions/types/permission.types'

const ASSIGNEES: OnboardingAssignee[] = sampleDepartmentUsers.map((user) => ({
  id: user.id,
  name: user.name,
}))

interface OnboardingOverrides {
  status?: OnboardingStatus
  assigneeId?: string | null
  remark?: string
}

/** Customer List screen composed from components/head/customers-list. */
export function CustomerOnboardingPage({ feature }: { feature: FeaturePermission }) {
  const departmentId = useHeadDepartmentId()
  const customersQuery = useDepartmentCustomers(departmentId)
  const columnFeatures = useColumnFeatures(departmentId, 'customers')
  const isUser = getSession()?.user.role === 'USER'
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CustomerTab>('all')
  const [selectedAssigneeId, setSelectedAssigneeId] =
    useState<string | null | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [overrides, setOverrides] = useState<Record<string, OnboardingOverrides>>({})
  const [selectedCustomer, setSelectedCustomer] =
    useState<OnboardingCustomer | null>(null)

  const screenPermission = getSession()?.user.role === 'USER'
    ? feature.roleBPermission
    : feature.roleAPermission
  const canEdit =
    screenPermission === 'CAN_EDIT' && columnFeatures.canEdit('actions')

  const { isColumnEnabled, canEditColumn } =
    useDepartmentColumnPermissions('ONBOARDING_DEPARTMENT')
  const isStatusVisible = isColumnEnabled('Status')
  const canEditStatus = canEditColumn('Status')

  const isAssignToVisible =
    !isUser &&
    (isColumnEnabled('Assign To') ||
      isColumnEnabled('Assign') ||
      isColumnEnabled('Assignee'))
  const canEditAssignTo =
    !isUser &&
    (canEditColumn('Assign To') ||
      canEditColumn('Assign') ||
      canEditColumn('Assignee'))

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

  const onboardingCustomers = useMemo<OnboardingCustomer[]>(
    () =>
      (customersQuery.data ?? []).map((customer, index) => {
        const override = overrides[customer.id]
        return {
          id: customer.id,
          rowIndex: index + 1,
          businessName: customer.company || customer.name,
          contactName: customer.name,
          contactDate: new Date(customer.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          email: customer.email,
          phone: customer.phone,
          callStatus: index % 3 === 1 ? 'not-answered' : 'connected',
          status: override?.status ?? (customer.status === 'ACTIVE' ? 'in-progress' : 'pending'),
          assigneeId:
            override && 'assigneeId' in override
              ? override.assigneeId ?? null
              : ASSIGNEES[index % ASSIGNEES.length]?.id ?? null,
          remark: override?.remark ?? '',
          updatedLabel: index === 0 ? 'Just now' : `${index + 1}h ago`,
          businessRelationType: index < 3 ? (index === 0 ? 'main' : 'branch') : undefined,
          businessCount: index < 3 ? 3 : undefined,
          businessIndex: index < 3 ? index + 1 : undefined,
          duplicateCount: index === 0 ? 2 : undefined,
        }
      }),
    [customersQuery.data, overrides],
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

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return onboardingCustomers
      .filter((customer) => activeTab === 'all' || customer.status === activeTab)
      .filter((customer) =>
        selectedAssigneeId === 'all' || customer.assigneeId === selectedAssigneeId)
      .filter((customer) =>
        !term || [customer.businessName, customer.contactName, customer.email, customer.phone]
          .some((value) => value.toLowerCase().includes(term)))
      .filter((customer) => {
        const source = customersQuery.data?.find((item) => item.id === customer.id)
        if (!source) return false
        const created = source.createdAt.slice(0, 10)
        return (!dateFrom || created >= dateFrom) && (!dateTo || created <= dateTo)
      })
      .map((customer, index) => ({ ...customer, rowIndex: index + 1 }))
  }, [activeTab, customersQuery.data, dateFrom, dateTo, onboardingCustomers, search, selectedAssigneeId])

  if (customersQuery.isPending) return <LoadingState message="Loading customers..." />
  if (customersQuery.isError) {
    return (
      <ErrorState
        title="Unable to load customers"
        message={customersQuery.error.message}
        onRetry={() => customersQuery.refetch()}
      />
    )
  }

  function patchCustomer(id: string, patch: OnboardingOverrides) {
    if (!canEdit) return
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }))
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
        searchSlot={<CustomersListSearchBar value={search} onChange={setSearch} />}
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
        showStatusTabs={isStatusVisible}
      />
      <CustomersList
        customers={filteredCustomers}
        assignees={ASSIGNEES}
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
        onStatusChange={(id, status) => patchCustomer(id, { status })}
        onAssigneeChange={(id, assigneeId) => patchCustomer(id, { assigneeId })}
        onRemarkChange={(id, remark) => patchCustomer(id, { remark })}
        onOpenDetail={setSelectedCustomer}
      />
      <CustomersListModal
        customer={selectedCustomer}
        assignees={ASSIGNEES}
        showStatus={isStatusVisible}
        showAssignTo={isAssignToVisible}
        onClose={() => setSelectedCustomer(null)}
      />
    </>
  )
}
