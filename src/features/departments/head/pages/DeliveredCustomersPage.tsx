import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../../../../components/head/shared/Icon'
import { PermissionToggle } from '../../../../components/permissions/PermissionToggle'
import { CustomersListModal } from '../../../../components/head/customers-list/CustomersListModal'
import { DeliveryConfirmationModal } from '../components/DeliveryConfirmationModal'
import type {
  OnboardingAssignee,
  OnboardingCustomer,
  OnboardingStatus,
} from '../../../../components/head/customers-list/CustomersList'
import { getSession } from '../../../../app/auth/session'
import { getAssigningUsers } from '../../../../api/meetings.api'
import {
  assignCustomerUser,
  getCustomerDeliveryLinks,
  type DeliveryConfirmationData,
  type DepartmentCustomerRowItem,
} from '../../../../api/department-users.api'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import { useDepartmentCustomerRows } from '../../hooks/useDepartmentUsersList'
import {
  useRoundRobinStatus,
  useUpdateRoundRobinStatus,
} from '../../hooks/useRoundRobin'
import './DeliveredCustomersPage.css'

const SUPPORT_DEPARTMENT = 'SUPPORT_DEPARTMENT'
const ASSIGNEE_PAGE_SIZE = 5

interface DeliveredCustomersPageProps {
  feature?: FeaturePermission
}

interface AssigneeSelectProps {
  value: string
  label: string
  users: OnboardingAssignee[]
  disabled?: boolean
  onChange: (email: string) => void
}

function AssigneeSelect({
  value,
  label,
  users,
  disabled = false,
  onChange,
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    setPage(0)
  }, [search, open])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query),
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ASSIGNEE_PAGE_SIZE))
  const pageUsers = filtered.slice(
    page * ASSIGNEE_PAGE_SIZE,
    (page + 1) * ASSIGNEE_PAGE_SIZE,
  )

  return (
    <div className="delivered-assignee" ref={rootRef}>
      <button
        type="button"
        className="delivered-assignee__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{label}</span>
        <Icon name="chevronDown" size={14} />
      </button>

      {open && (
        <div className="delivered-assignee__panel">
          <div className="delivered-assignee__search">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={search}
              placeholder="Search users..."
              autoFocus
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="delivered-assignee__list" role="listbox">
            {pageUsers.length === 0 ? (
              <div className="delivered-assignee__empty">No users found</div>
            ) : (
              pageUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={user.id.toLowerCase() === value.toLowerCase()}
                  className={`delivered-assignee__option ${
                    user.id.toLowerCase() === value.toLowerCase()
                      ? 'is-selected'
                      : ''
                  }`}
                  onClick={() => {
                    onChange(user.id)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <span>{user.name}</span>
                  <small>{user.id}</small>
                </button>
              ))
            )}
          </div>

          <div className="delivered-assignee__pager">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            >
              Prev
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function toOnboardingStatus(value: string): OnboardingStatus {
  const normalized = value.toLowerCase()
  if (normalized.includes('complet') || normalized.includes('deliver')) {
    return 'completed'
  }
  if (normalized.includes('progress') || normalized.includes('process')) {
    return 'in-progress'
  }
  return 'pending'
}

function formatAmount(value: unknown): string {
  if (value == null || value === '') return '—'
  const amount =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return String(value)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function rowId(row: DepartmentCustomerRowItem): string {
  return String(row.customerId ?? row.id ?? '')
}

function rowBusinessName(row: DepartmentCustomerRowItem): string {
  return (
    row.customerDetails?.businessName ??
    row.businessName ??
    row.ownerName ??
    '—'
  )
}

function rowOwnerName(row: DepartmentCustomerRowItem): string {
  return (
    row.customerDetails?.ownerName ??
    row.ownerName ??
    row.customerDetails?.businessName ??
    row.businessName ??
    '—'
  )
}

function rowEmail(row: DepartmentCustomerRowItem): string {
  return row.customerDetails?.email ?? row.email ?? ''
}

function rowPhone(row: DepartmentCustomerRowItem): string {
  return row.customerDetails?.phoneNumber ?? row.phoneNumber ?? ''
}

function formatRowDate(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return undefined
}

function isRowDelivered(row: DepartmentCustomerRowItem): boolean {
  const direct =
    readBoolean(row.delivered) ??
    readBoolean(row.isDelivered) ??
    readBoolean(row.serviceDeliverySent)
  if (direct !== undefined) return direct

  const nested = row.deliveryStatus
  if (nested && typeof nested === 'object') {
    const value =
      readBoolean((nested as Record<string, unknown>).isDelivered) ??
      readBoolean((nested as Record<string, unknown>).delivered)
    if (value !== undefined) return value
  }

  return false
}

export function DeliveredCustomersPage({ feature }: DeliveredCustomersPageProps) {
  const session = getSession()
  const isHead = session?.user.role !== 'USER'
  const isUser = session?.user.role === 'USER'
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [searchParam, setSearchParam] = useState('')
  const [selectedRow, setSelectedRow] = useState<DepartmentCustomerRowItem | null>(null)
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, string>>({})
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadingDeliveryId, setLoadingDeliveryId] = useState<string | null>(null)
  const [deliveryModal, setDeliveryModal] = useState<{
    row: DepartmentCustomerRowItem
    initialData: Partial<DeliveryConfirmationData> | null
  } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchParam(searchInput.trim())
      setPage(0)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const rowsQuery = useDepartmentCustomerRows({
    page,
    size: pageSize,
    searchParam: searchParam || undefined,
  })

  const assigneesQuery = useQuery({
    queryKey: ['assigning-users', SUPPORT_DEPARTMENT],
    queryFn: () => getAssigningUsers(SUPPORT_DEPARTMENT),
    enabled: isHead,
    staleTime: 30_000,
  })

  const roundRobinQuery = useRoundRobinStatus(SUPPORT_DEPARTMENT)
  const updateRoundRobin = useUpdateRoundRobinStatus(SUPPORT_DEPARTMENT)
  const roundRobinError = updateRoundRobin.isError
    ? updateRoundRobin.error instanceof Error
      ? updateRoundRobin.error.message
      : 'Failed to update round robin'
    : null

  const rows = rowsQuery.data?.customers ?? []
  const total = rowsQuery.data?.totalElements ?? 0
  const totalPages = Math.max(
    1,
    rowsQuery.data?.totalPage ?? Math.ceil(total / pageSize),
  )

  const assigneeOptions = useMemo<OnboardingAssignee[]>(
    () =>
      (assigneesQuery.data ?? [])
        .filter((user) => Boolean(user.email))
        .map((user) => ({
          id: user.email,
          name: user.username || user.email,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assigneesQuery.data],
  )

  const assigneeLookup = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of assigneesQuery.data ?? []) {
      if (user.email) {
        map.set(user.email.toLowerCase(), user.username || user.email)
      }
    }
    return map
  }, [assigneesQuery.data])

  function assignedEmail(row: DepartmentCustomerRowItem): string {
    const id = rowId(row)
    const override = assigneeOverrides[id]
    if (override !== undefined) return override
    return (row.assignedUserEmail || row.assignedTo || '').trim()
  }

  function assignedLabel(row: DepartmentCustomerRowItem): string {
    const email = assignedEmail(row)
    if (!email) return row.assignedUserName || 'Unassigned'
    return assigneeLookup.get(email.toLowerCase()) ?? email
  }

  async function handleAssign(row: DepartmentCustomerRowItem, email: string) {
    const id = rowId(row)
    if (!id || assigningId) return
    const previous = assignedEmail(row)
    setAssigneeOverrides((prev) => ({ ...prev, [id]: email }))
    setAssigningId(id)
    setActionError(null)

    try {
      await assignCustomerUser({
        customerId: id,
        assignedUserEmail: email,
        departmentType: SUPPORT_DEPARTMENT,
      })
      void queryClient.invalidateQueries({
        queryKey: ['department-customer-rows'],
      })
    } catch (error) {
      setAssigneeOverrides((prev) => ({ ...prev, [id]: previous }))
      setActionError(
        error instanceof Error ? error.message : 'Failed to assign customer',
      )
    } finally {
      setAssigningId(null)
    }
  }

  async function openDeliveryModal(row: DepartmentCustomerRowItem) {
    const id = rowId(row)
    if (!id || loadingDeliveryId) return
    const customerUsername = row.customerDetails?.email ?? row.email ?? ''
    setLoadingDeliveryId(id)
    setActionError(null)
    try {
      const initialData = customerUsername
        ? await getCustomerDeliveryLinks(id, customerUsername)
        : null
      setDeliveryModal({ row, initialData })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to load delivery details',
      )
      setDeliveryModal({ row, initialData: null })
    } finally {
      setLoadingDeliveryId(null)
    }
  }

  function toOnboardingCustomer(
    row: DepartmentCustomerRowItem,
    index: number,
  ): OnboardingCustomer {
    const id = rowId(row)
    return {
      id,
      rowIndex: page * pageSize + index + 1,
      businessName: rowBusinessName(row),
      contactName: rowOwnerName(row),
      contactDate: row.createdAt ?? '',
      email: row.customerDetails?.email ?? row.email ?? '',
      phone: row.customerDetails?.phoneNumber ?? row.phoneNumber ?? '',
      status: toOnboardingStatus(row.status ?? ''),
      assigneeId: assignedEmail(row) || null,
      remark: row.remark ?? '',
      address: row.customerDetails?.address,
      gstNumber: row.customerDetails?.gstNumber,
      serviceType: row.serviceType,
      duplicateCount: row.customerDetails?.duplicateCount ?? row.duplicateCount,
      hasDuplicateCustomer:
        row.customerDetails?.hasDuplicateCustomer ??
        row.customerDetails?.hasDuplicate ??
        row.hasDuplicateCustomer ??
        row.hasDuplicate,
      rawCustomer: row,
    }
  }

  const selectedCustomer = useMemo(() => {
    if (!selectedRow) return null
    const index = rows.findIndex((row) => rowId(row) === rowId(selectedRow))
    return toOnboardingCustomer(selectedRow, index < 0 ? 0 : index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRow, rows, page, assigneeOverrides, assigneeLookup])

  return (
    <div className="delivered-page" data-feature={feature?.slug}>
      {toast && (
        <div className="delivered-toast" role="status">
          <span>✓</span>
          <div>
            <strong>Sent successfully</strong>
            <p>{toast}</p>
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
        </div>
      )}
      <div className="delivered-toolbar">
        <div>
          <h2 className="delivered-title">Delivered Customers</h2>
          <p className="delivered-subtitle">
            Track delivery status and customer details for the support department.
          </p>
        </div>

        <div className="delivered-toolbar__actions">
          {roundRobinQuery.data !== undefined && (
            <div className="delivered-round-robin">
              <span>
                Round robin
                <strong>{roundRobinQuery.data ? 'On' : 'Off'}</strong>
              </span>
              <PermissionToggle
                checked={Boolean(roundRobinQuery.data)}
                disabled={!isHead || updateRoundRobin.isPending}
                label="Toggle round robin auto assignment"
                onChange={(checked) => updateRoundRobin.mutate(checked)}
              />
            </div>
          )}
          <div className="delivered-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              value={searchInput}
              placeholder="Search business, customer, email..."
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>
      </div>

      {(actionError || roundRobinError) && (
        <div className="delivered-alert" role="alert">
          {actionError || roundRobinError}
        </div>
      )}

      <div className="delivered-card">
        {rowsQuery.isPending ? (
          <div className="delivered-state">Loading customers...</div>
        ) : rowsQuery.isError ? (
          <div className="delivered-state delivered-state--error">
            <p>{rowsQuery.error.message}</p>
            <button type="button" onClick={() => rowsQuery.refetch()}>
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="delivered-state">No customers found.</div>
        ) : (
          <div className="delivered-table-wrap">
            <table className="delivered-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Business Name</th>
                  <th>Delivery Status</th>
                  <th>Paid Amount</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const id = rowId(row)
                  const delivered = isRowDelivered(row)
                  const paid =
                    row.customerDetails?.amountPaid ??
                    row.customerDetails?.paidAmount ??
                    row.amountPaid ??
                    row.paidAmount
                  return (
                    <tr key={id || index}>
                      <td>
                        <div className="delivered-customer-cell">
                          <button
                            type="button"
                            className="delivered-eye"
                            aria-label={`View ${rowOwnerName(row)}`}
                            onClick={() => setSelectedRow(row)}
                          >
                            <Icon name="eye" size={15} />
                          </button>
                          <div className="delivered-cell-details">
                            <strong>{rowOwnerName(row)}</strong>
                            {rowPhone(row) && <small>{rowPhone(row)}</small>}
                          </div>
                        </div>
                      </td>
                      <td className="delivered-business">
                        <div className="delivered-cell-details">
                          <strong>{rowBusinessName(row)}</strong>
                          {(rowEmail(row) || row.createdAt) && (
                            <small>
                              {rowEmail(row)}
                              {rowEmail(row) && row.createdAt ? ' · ' : ''}
                              {formatRowDate(row.createdAt)}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`delivered-badge delivered-status-button ${
                            delivered ? 'is-delivered' : 'is-not-delivered'
                          }`}
                          disabled={!isUser || loadingDeliveryId === id}
                          title={isUser ? 'Edit delivery status' : undefined}
                          onClick={() => void openDeliveryModal(row)}
                        >
                          {loadingDeliveryId === id
                            ? 'Loading...'
                            : delivered ? 'Delivered' : 'Not Delivered'}
                        </button>
                      </td>
                      <td className="delivered-amount">{formatAmount(paid)}</td>
                      <td>
                        {isHead && assigneeOptions.length > 0 ? (
                          <AssigneeSelect
                            value={assignedEmail(row)}
                            label={assignedLabel(row)}
                            users={assigneeOptions}
                            disabled={assigningId === id}
                            onChange={(email) => void handleAssign(row, email)}
                          />
                        ) : (
                          assignedLabel(row)
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="delivered-pagination">
          <span>
            Showing {total === 0 ? 0 : page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div>
            <button
              type="button"
              disabled={page === 0 || rowsQuery.isFetching}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            >
              Previous
            </button>
            <strong>
              {page + 1} / {totalPages}
            </strong>
            <button
              type="button"
              disabled={page + 1 >= totalPages || rowsQuery.isFetching}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedCustomer && (
        <CustomersListModal
          customer={selectedCustomer}
          assignees={assigneeOptions}
          departmentType={SUPPORT_DEPARTMENT}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {deliveryModal && (
        <DeliveryConfirmationModal
          open
          customerId={rowId(deliveryModal.row)}
          customerName={rowOwnerName(deliveryModal.row)}
          initialData={deliveryModal.initialData}
          onClose={() => setDeliveryModal(null)}
          onSuccess={async (result) => {
            await queryClient.invalidateQueries({
              queryKey: ['department-customer-rows'],
            })
            setToast(result.message || 'Delivery confirmation sent successfully.')
          }}
        />
      )}
    </div>
  )
}
