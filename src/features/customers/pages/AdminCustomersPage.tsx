import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAdminCustomers,
  type AdminCustomer,
} from '../../../api/admin-customers.api'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { DataTable, type DataTableColumn } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingState } from '../../../components/ui/LoadingState'
import { Icon } from '../../../components/head/shared'
import { CustomersListModal } from '../../../components/head/customers-list/CustomersListModal'
import type {
  OnboardingCustomer,
  OnboardingStatus,
} from '../../../components/head/customers-list/CustomersList'
import '../../../components/head/customers-list/CustomersList.css'
import './AdminCustomersPage.css'

function displayName(customer: AdminCustomer): string {
  const personalName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ')

  return (
    customer.customerName ||
    customer.fullName ||
    customer.contactName ||
    customer.contactPersonName ||
    customer.clientName ||
    customer.leadName ||
    customer.ownerName ||
    personalName ||
    customer.name ||
    customer.username ||
    customer.email?.split('@')[0] ||
    'Customer'
  )
}

function displayDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function valueOf(customer: AdminCustomer, key: string): string {
  const value = customer[key]
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

function customerStatus(customer: AdminCustomer): OnboardingStatus {
  const status = String(customer.onboardingStatus || customer.status || '').toLowerCase()
  if (status === 'completed') return 'completed'
  if (status === 'in-progress' || status === 'in_progress') return 'in-progress'
  return 'pending'
}

function toOnboardingCustomer(customer: AdminCustomer): OnboardingCustomer {
  return {
    id: String(customer.id ?? valueOf(customer, 'customerId')),
    rowIndex: 0,
    businessName: customer.businessName || customer.companyName || customer.business || '',
    contactName: displayName(customer),
    contactDate: customer.createdAt || valueOf(customer, 'createdDate'),
    email: customer.email || '',
    phone: customer.phoneNumber || customer.phone || customer.contact || '',
    status: customerStatus(customer),
    assigneeId: null,
    remark: valueOf(customer, 'remark'),
    address: valueOf(customer, 'address'),
    gstNumber: valueOf(customer, 'gstNumber'),
    packageName: valueOf(customer, 'packageName') || valueOf(customer, 'plan'),
    serviceMonths: valueOf(customer, 'serviceExpiration') || valueOf(customer, 'serviceExpiry'),
    salesPerson: valueOf(customer, 'salesPerson'),
    serviceType: valueOf(customer, 'serviceType'),
    duplicateCount: Number(customer.duplicateCount || 0),
    hasDuplicateCustomer: Boolean(customer.hasDuplicateCustomer),
    duplicateCustomers: Array.isArray(customer.duplicateCustomers)
      ? customer.duplicateCustomers
      : [],
    rawCustomer: customer,
  }
}

const baseColumns: DataTableColumn<AdminCustomer>[] = [
  {
    key: 'customer',
    title: 'CUSTOMER',
    render: (customer) => (
      <div className="admin-customer-identity">
        <span className="admin-customer-avatar">
          {displayName(customer).charAt(0).toUpperCase()}
        </span>
        <div>
          <strong>{displayName(customer)}</strong>
          <span>{customer.username || 'Customer account'}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'email',
    title: 'EMAIL',
    render: (customer) => customer.email || '—',
  },
  {
    key: 'phone',
    title: 'PHONE',
    render: (customer) => customer.phoneNumber || customer.phone || customer.contact || '—',
  },
  {
    key: 'business',
    title: 'BUSINESS',
    render: (customer) => customer.businessName || customer.companyName || customer.business || '—',
  },
  {
    key: 'status',
    title: 'STATUS',
    render: (customer) => (
      <span className={`admin-customer-status admin-customer-status--${String(customer.status || 'active').toLowerCase()}`}>
        {customer.status || 'ACTIVE'}
      </span>
    ),
  },
  {
    key: 'created',
    title: 'CREATED',
    render: (customer) => displayDate(customer.createdAt),
  },
]

export function AdminCustomersPage() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null)
  const customersQuery = useQuery({
    queryKey: ['admin-customers', page, size],
    queryFn: () => getAdminCustomers(page, size),
    staleTime: 30_000,
  })

  const result = customersQuery.data
  const modalCustomer = selectedCustomer
    ? toOnboardingCustomer(selectedCustomer)
    : null
  const totalPages = Math.max(1, result?.totalPage ?? 1)
  const start = (result?.totalElements ?? 0) === 0 ? 0 : page * size + 1
  const end = Math.min((page + 1) * size, result?.totalElements ?? 0)
  const columns: DataTableColumn<AdminCustomer>[] = [
    ...baseColumns,
    {
      key: 'actions',
      title: 'ACTIONS',
      className: 'actions-heading',
      render: (customer) => (
        <button
          type="button"
          className="admin-customer-view-button"
          onClick={() => setSelectedCustomer(customer)}
          title={`View ${displayName(customer)}`}
          aria-label={`View details for ${displayName(customer)}`}
        >
          <Icon name="eye" size={17} />
        </button>
      ),
    },
  ]

  return (
    <PageLayout>
      <div className="admin-customers-page">
        <PageHeader
          breadcrumb="Administration / Customers"
          title="Customer Accounts"
          description="View all customer accounts registered across departments."
          actions={
            <>
              <Button
                variant="secondary"
                onClick={() => void customersQuery.refetch()}
                disabled={customersQuery.isFetching}
              >
                {customersQuery.isFetching ? 'Refreshing…' : '↻ Refresh'}
              </Button>
              <ProfileChip />
            </>
          }
        />

        <Card className="admin-customers-card">
          <div className="admin-customers-card__heading">
            <div>
              <h2>Customers</h2>
              <p>{result?.totalElements ?? 0} customer accounts</p>
            </div>
          </div>

          {customersQuery.isPending ? (
            <LoadingState message="Loading customers..." />
          ) : customersQuery.isError ? (
            <ErrorState
              title="Unable to load customers"
              message={customersQuery.error.message}
              onRetry={() => customersQuery.refetch()}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={result?.data ?? []}
                rowKey={(customer, index) => String(customer.id ?? customer.email ?? index)}
                emptyState={
                  <EmptyState
                    icon="♙"
                    title="No customers found"
                    description="Customer accounts will appear here when they are registered."
                  />
                }
              />

              <div className="admin-customers-pagination">
                <label>
                  Rows per page
                  <select
                    value={size}
                    onChange={(event) => {
                      setSize(Number(event.target.value))
                      setPage(0)
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
                <div className="admin-customers-pagination__buttons">
                  <Button variant="secondary" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                    ← Previous
                  </Button>
                  <span>Page {page + 1} of {totalPages}</span>
                  <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>
                    Next →
                  </Button>
                </div>
                <span>Showing {start}–{end} of {result?.totalElements ?? 0}</span>
              </div>
            </>
          )}
        </Card>

        <CustomersListModal
          customer={modalCustomer}
          assignees={[]}
          departmentType=""
          showStatus
          showAssignTo={false}
          requestUsername="onboarding@mbg.com"
          onClose={() => setSelectedCustomer(null)}
        />
      </div>
    </PageLayout>
  )
}
