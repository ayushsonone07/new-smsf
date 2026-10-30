import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  Info,
  LoaderCircle,
  Tag,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { RefreshButton } from '../../ui/RefreshButton'
import {
  bulkTransferCustomers,
  getDepartmentCustomerRows,
  getDepartmentUsers,
  type DepartmentCustomerRowItem,
} from '../../../api/department-users.api'
import { getSession } from '../../../app/auth/session'
import { notifyCustomerTransferred } from '../../../api/notification-factory'

interface BulkAssignModalProps {
  open: boolean
  onClose: () => void
  onTransferred?: () => void | Promise<void>
}

function formatDeptName(dept?: string): string {
  if (!dept) return 'Current Department'
  return dept
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function customerLabel(customer: DepartmentCustomerRowItem): string {
  return (
    customer.customerDetails?.businessName ||
    customer.businessName ||
    customer.customerDetails?.ownerName ||
    customer.ownerName ||
    `Customer #${customer.customerId ?? customer.id ?? '—'}`
  )
}

function customerMeta(customer: DepartmentCustomerRowItem): string {
  return (
    customer.customerDetails?.phoneNumber ||
    customer.phoneNumber ||
    customer.customerDetails?.email ||
    customer.email ||
    'No contact details'
  )
}

export function BulkAssignModal({
  open,
  onClose,
  onTransferred,
}: BulkAssignModalProps) {
  const queryClient = useQueryClient()
  const session = getSession()
  const rawDepartmentType = session?.user.departmentType || 'Current department'
  const departmentTypeFormatted = formatDeptName(rawDepartmentType)

  const [fromEmail, setFromEmail] = useState('')
  const [toEmail, setToEmail] = useState('')
  const [phaseName, setPhaseName] = useState('Default')
  const [showConfirm, setShowConfirm] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const usersQuery = useQuery({
    queryKey: ['bulk-assign-department-users', rawDepartmentType],
    queryFn: () => getDepartmentUsers({ page: 0, size: 500 }),
    enabled: open,
    staleTime: 30_000,
  })

  const customersQuery = useQuery({
    queryKey: ['bulk-assign-customers', rawDepartmentType, fromEmail],
    queryFn: () =>
      getDepartmentCustomerRows({
        page: 0,
        size: 12,
        userFilter: fromEmail,
      }),
    enabled: open && Boolean(fromEmail),
  })

  const users = useMemo(() => {
    const seen = new Set<string>()
    return (usersQuery.data?.data ?? []).filter((user) => {
      const email = user.email?.trim().toLowerCase()
      if (!email || seen.has(email)) return false
      if (
        user.departmentType &&
        session?.user.departmentType &&
        user.departmentType !== session.user.departmentType
      ) {
        return false
      }
      seen.add(email)
      return true
    })
  }, [session?.user.departmentType, usersQuery.data?.data])

  const destinationUsers = useMemo(
    () => users.filter((u) => u.email.toLowerCase() !== fromEmail.toLowerCase()),
    [users, fromEmail],
  )

  const sourceUser = useMemo(
    () => users.find((u) => u.email.toLowerCase() === fromEmail.toLowerCase()),
    [users, fromEmail],
  )

  const destUser = useMemo(
    () => users.find((u) => u.email.toLowerCase() === toEmail.toLowerCase()),
    [users, toEmail],
  )

  const totalCustomers = customersQuery.data?.totalElements ?? 0

  const transferMutation = useMutation({
    mutationFn: () =>
      bulkTransferCustomers({
        fromUserEmail: fromEmail,
        toUserEmail: toEmail,
        phaseName: phaseName.trim() || 'Default',
      }),
    onSuccess: async (result) => {
      notifyCustomerTransferred(fromEmail, toEmail, totalCustomers)
      setSuccessMessage(result.message || 'Customers transferred successfully.')
      setShowConfirm(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bulk-assign-customers'] }),
        queryClient.invalidateQueries({ queryKey: ['department-users'] }),
      ])
      await onTransferred?.()
    },
  })

  // Prevent navigating away or closing window during transfer
  useEffect(() => {
    if (!transferMutation.isPending) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Transfer is currently in progress. Please do not leave or refresh the page.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [transferMutation.isPending])

  function handleClose() {
    if (transferMutation.isPending) return
    setFromEmail('')
    setToEmail('')
    setPhaseName('Default')
    setShowConfirm(false)
    setSuccessMessage('')
    transferMutation.reset()
    onClose()
  }

  function handleFromChange(email: string) {
    setFromEmail(email)
    setToEmail('')
    setShowConfirm(false)
    setSuccessMessage('')
    transferMutation.reset()
  }

  const canSubmit =
    Boolean(fromEmail && toEmail) &&
    fromEmail.toLowerCase() !== toEmail.toLowerCase() &&
    totalCustomers > 0 &&
    !transferMutation.isPending

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      closeOnEscape={!transferMutation.isPending}
      showCloseButton={!transferMutation.isPending}
      title={
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">Bulk Assign Customers</h2>
              <RefreshButton
                onRefresh={() =>
                  Promise.all([
                    usersQuery.refetch(),
                    fromEmail ? customersQuery.refetch() : undefined,
                  ])
                }
                isRefreshing={usersQuery.isFetching || customersQuery.isFetching}
                label="members and customers"
              />
            </div>
            <p className="text-xs font-normal text-slate-500">
              Transfer accounts between members in <span className="font-semibold text-slate-700">{departmentTypeFormatted}</span>
            </p>
          </div>
        </div>
      }
    >
      <div
        className={`space-y-4 pt-1 transition-opacity ${
          (usersQuery.isFetching && !usersQuery.isPending) ||
          (customersQuery.isFetching && !customersQuery.isPending)
            ? 'pointer-events-none opacity-60'
            : ''
        }`}
      >
        {/* Transfer in Progress Loader View */}
        {transferMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center animate-in fade-in duration-200">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 shadow-xs">
              <LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />
              <ArrowRightLeft className="absolute h-5 w-5 text-blue-600" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Transferring Customers...
            </h3>

            <p className="mt-1.5 max-w-sm text-xs text-slate-600 leading-relaxed font-medium">
              Reassigning <strong className="text-slate-800">{totalCustomers}</strong> customer{totalCustomers === 1 ? '' : 's'} from{' '}
              <strong className="text-slate-800">{sourceUser?.username || fromEmail}</strong> to{' '}
              <strong className="text-slate-800">{destUser?.username || toEmail}</strong>.
            </p>

            {/* Prominent Warning Message */}
            <div className="mt-5 flex items-center justify-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 shadow-xs max-w-md w-full">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 animate-pulse" />
              <span>Please do not go back, refresh, or close this window.</span>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              Processing customer reassignments and assignment audit logs. Please wait...
            </p>
          </div>
        ) : successMessage ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 mb-3.5">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Transfer Completed Successfully</h3>
            <p className="mt-1 max-w-sm text-xs text-slate-600 leading-relaxed">
              {totalCustomers} customer{totalCustomers === 1 ? '' : 's'} successfully reassigned from{' '}
              <strong className="font-semibold text-slate-800">{sourceUser?.username || fromEmail}</strong> to{' '}
              <strong className="font-semibold text-slate-800">{destUser?.username || toEmail}</strong>.
            </p>
            <div className="mt-5 w-full flex justify-center">
              <Button onClick={handleClose} className="min-w-[120px]">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Info notice banner */}
            <div className="flex items-start gap-3 rounded-xl border border-blue-100/90 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-3 text-xs text-slate-700">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Info className="h-3.5 w-3.5" />
              </div>
              <div className="leading-relaxed">
                Both users must belong to <strong className="font-semibold text-blue-900">{departmentTypeFormatted}</strong>.
                All reassigned customers will immediately show under the new owner and will be recorded in assignment audit logs.
              </div>
            </div>

            {usersQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center text-xs text-slate-500">
                <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" />
                <span>Loading department members…</span>
              </div>
            ) : usersQuery.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                {usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : 'Unable to load department users.'}
              </div>
            ) : (
              <>
                {/* Source & Destination Transfer Grid */}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
                  {/* From User */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Transfer From <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        Source
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-[13px] font-medium text-slate-800 shadow-xs transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        style={{ minHeight: '44px', lineHeight: 'normal' }}
                        value={fromEmail}
                        onChange={(e) => handleFromChange(e.target.value)}
                      >
                        <option value="">Select source user</option>
                        {users.map((user) => (
                          <option key={String(user.id ?? user.email)} value={user.email}>
                            {user.username || user.email} {user.role ? `(${user.role})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    {sourceUser && (
                      <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2 text-xs">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                          {(sourceUser.username || sourceUser.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">
                            {sourceUser.username || sourceUser.email}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{sourceUser.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Transfer Indicator */}
                  <div className="hidden sm:flex h-11 items-center justify-center pt-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-blue-600 shadow-xs">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  {/* To User */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Transfer To <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        Destination
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-[13px] font-medium text-slate-800 shadow-xs transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        style={{ minHeight: '44px', lineHeight: 'normal' }}
                        value={toEmail}
                        disabled={!fromEmail}
                        onChange={(e) => {
                          setToEmail(e.target.value)
                          setShowConfirm(false)
                        }}
                      >
                        <option value="">
                          {fromEmail ? 'Select destination user' : 'Select source user first'}
                        </option>
                        {destinationUsers.map((user) => (
                          <option key={String(user.id ?? user.email)} value={user.email}>
                            {user.username || user.email} {user.role ? `(${user.role})` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    {destUser && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2 text-xs">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                          {(destUser.username || destUser.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-800">
                            {destUser.username || destUser.email}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{destUser.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Customers Preview Box */}
                {fromEmail ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-150 bg-slate-50/80 px-3.5 py-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <UsersRound className="h-4 w-4 text-blue-600" />
                        <span>Customers to Reassign</span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                        {customersQuery.isLoading ? 'Checking…' : `${totalCustomers} total`}
                      </span>
                    </div>

                    {customersQuery.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                        <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Loading assigned customers…</span>
                      </div>
                    ) : customersQuery.isError ? (
                      <div className="p-3.5 text-xs text-red-700">
                        {customersQuery.error instanceof Error
                          ? customersQuery.error.message
                          : 'Unable to load assigned customers.'}
                      </div>
                    ) : totalCustomers === 0 ? (
                      <div className="py-7 text-center text-xs text-slate-500">
                        No active customers are assigned to this user.
                      </div>
                    ) : (
                      <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto">
                        {customersQuery.data?.customers.map((customer, index) => (
                          <div
                            key={String(customer.customerId ?? customer.id ?? index)}
                            className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-slate-50/70 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                <Building2 className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-800">
                                  {customerLabel(customer)}
                                </p>
                                <p className="truncate text-[11px] text-slate-500">
                                  {customerMeta(customer)}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-650">
                              {customer.status || customer.onboardingStatus || 'Assigned'}
                            </span>
                          </div>
                        ))}

                        {totalCustomers > (customersQuery.data?.customers.length ?? 0) ? (
                          <div className="bg-slate-50 px-3.5 py-2 text-center text-[11px] font-medium text-slate-500 border-t border-slate-150">
                            + {totalCustomers - (customersQuery.data?.customers.length ?? 0)} more customers will also be transferred
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* History Phase Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Audit Phase / Transfer Tag
                    </label>
                    <span className="text-[11px] text-slate-500">Saved to assignment logs</span>
                  </div>
                  <div className="relative">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 shadow-xs transition hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={phaseName}
                      placeholder="e.g. Default, Leave Coverage, Reorganization"
                      maxLength={80}
                      onChange={(e) => setPhaseName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Inline Confirmation Alert */}
                {showConfirm && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-950 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900">
                          Confirm Reassignment of {totalCustomers} Customer{totalCustomers === 1 ? '' : 's'}
                        </p>
                        <p className="mt-0.5 text-amber-800 leading-relaxed">
                          Are you sure you want to transfer all {totalCustomers} customers from{' '}
                          <strong className="font-semibold text-slate-900">{sourceUser?.username || fromEmail}</strong> to{' '}
                          <strong className="font-semibold text-slate-900">{destUser?.username || toEmail}</strong>?
                          This will update their active assignment immediately.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-amber-200/60">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => transferMutation.mutate()}
                        disabled={transferMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        {transferMutation.isPending ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UsersRound className="h-3.5 w-3.5" />
                        )}
                        Yes, Transfer Now
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {transferMutation.isError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {transferMutation.error instanceof Error
                      ? transferMutation.error.message
                      : 'Unable to transfer customers.'}
                  </div>
                ) : null}
              </>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-3.5 mt-2">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={transferMutation.isPending}
              >
                Cancel
              </Button>

              {!showConfirm ? (
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
                >
                  <UsersRound className="h-4 w-4" />
                  <span>
                    Transfer {totalCustomers > 0 ? `${totalCustomers} Customers` : 'Customers'}
                  </span>
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}