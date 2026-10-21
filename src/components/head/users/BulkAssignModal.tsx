import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  UsersRound,
} from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
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
    customer.customerDetails?.email ||
    customer.email ||
    customer.customerDetails?.phoneNumber ||
    customer.phoneNumber ||
    customer.status ||
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
  const departmentType = session?.user.departmentType || 'Current department'
  const [fromEmail, setFromEmail] = useState('')
  const [toEmail, setToEmail] = useState('')
  const [phaseName, setPhaseName] = useState('Default')
  const [successMessage, setSuccessMessage] = useState('')

  const usersQuery = useQuery({
    queryKey: ['bulk-assign-department-users', departmentType],
    queryFn: () => getDepartmentUsers({ page: 0, size: 500 }),
    enabled: open,
    staleTime: 30_000,
  })

  const customersQuery = useQuery({
    queryKey: ['bulk-assign-customers', departmentType, fromEmail],
    queryFn: () =>
      getDepartmentCustomerRows({
        page: 0,
        size: 8,
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

  const destinationUsers = users.filter(
    (user) => user.email.toLowerCase() !== fromEmail.toLowerCase(),
  )

  const transferMutation = useMutation({
    mutationFn: () =>
      bulkTransferCustomers({
        fromUserEmail: fromEmail,
        toUserEmail: toEmail,
        phaseName,
      }),
    onSuccess: async (result) => {
      notifyCustomerTransferred(fromEmail, toEmail, totalCustomers)
      setSuccessMessage(result.message)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bulk-assign-customers'] }),
        queryClient.invalidateQueries({ queryKey: ['department-users'] }),
      ])
      await onTransferred?.()
    },
  })

  function handleClose() {
    if (transferMutation.isPending) return
    setFromEmail('')
    setToEmail('')
    setPhaseName('Default')
    setSuccessMessage('')
    transferMutation.reset()
    onClose()
  }

  function handleFromChange(email: string) {
    setFromEmail(email)
    setToEmail('')
    setSuccessMessage('')
    transferMutation.reset()
  }

  function handleTransfer() {
    const source = users.find((user) => user.email === fromEmail)
    const destination = users.find((user) => user.email === toEmail)
    const confirmed = window.confirm(
      `Transfer all ${totalCustomers} customers from ${source?.username || fromEmail} to ${destination?.username || toEmail}? This action will update every matching assignment.`,
    )

    if (confirmed) {
      transferMutation.mutate()
    }
  }

  const totalCustomers = customersQuery.data?.totalElements ?? 0
  const canSubmit =
    Boolean(fromEmail && toEmail) &&
    fromEmail.toLowerCase() !== toEmail.toLowerCase() &&
    totalCustomers > 0 &&
    !transferMutation.isPending

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk assign customers"
      description={`Transfer all assigned customers between users in ${departmentType}.`}
      size="lg"
      closeOnEscape={!transferMutation.isPending}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Both users are loaded from your current department. The transfer is recorded by the backend assignment-history flow.
        </div>

        {usersQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Loading department users…
          </div>
        ) : usersQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : 'Unable to load department users.'}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Transfer from
                <select
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  value={fromEmail}
                  onChange={(event) => handleFromChange(event.target.value)}
                >
                  <option value="">Select source user</option>
                  {users.map((user) => (
                    <option key={String(user.id ?? user.email)} value={user.email}>
                      {user.username || user.email} — {user.email}
                    </option>
                  ))}
                </select>
              </label>

              <div className="hidden h-11 items-center justify-center text-blue-600 md:flex">
                <ArrowRight className="h-5 w-5" />
              </div>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Transfer to
                <select
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                  value={toEmail}
                  disabled={!fromEmail}
                  onChange={(event) => setToEmail(event.target.value)}
                >
                  <option value="">Select destination user</option>
                  {destinationUsers.map((user) => (
                    <option key={String(user.id ?? user.email)} value={user.email}>
                      {user.username || user.email} — {user.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              History phase
              <input
                className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={phaseName}
                maxLength={80}
                onChange={(event) => setPhaseName(event.target.value)}
              />
            </label>

            {fromEmail ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <UsersRound className="h-4 w-4 text-blue-600" /> Assigned customers
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                    {customersQuery.isLoading ? 'Loading…' : `${totalCustomers} total`}
                  </span>
                </div>

                {customersQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-9 text-sm text-slate-500">
                    <LoaderCircle className="h-5 w-5 animate-spin" /> Loading customers…
                  </div>
                ) : customersQuery.isError ? (
                  <div className="p-4 text-sm text-red-700">
                    {customersQuery.error instanceof Error
                      ? customersQuery.error.message
                      : 'Unable to load assigned customers.'}
                  </div>
                ) : totalCustomers === 0 ? (
                  <div className="py-9 text-center text-sm text-slate-500">
                    No customers are assigned to this user.
                  </div>
                ) : (
                  <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                    {customersQuery.data?.customers.map((customer, index) => (
                      <div
                        key={String(customer.customerId ?? customer.id ?? index)}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {customerLabel(customer)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {customerMeta(customer)}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-500">
                          {customer.status || customer.onboardingStatus || 'Assigned'}
                        </span>
                      </div>
                    ))}
                    {totalCustomers > (customersQuery.data?.customers.length ?? 0) ? (
                      <div className="bg-slate-50 px-4 py-2 text-center text-xs text-slate-500">
                        Showing first {customersQuery.data?.customers.length} of {totalCustomers}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}

        {transferMutation.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {transferMutation.error instanceof Error
              ? transferMutation.error.message
              : 'Unable to transfer customers.'}
          </div>
        ) : null}

        {successMessage ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {successMessage}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={handleClose} disabled={transferMutation.isPending}>
            {successMessage ? 'Close' : 'Cancel'}
          </Button>
          {!successMessage ? (
            <Button
              onClick={handleTransfer}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {transferMutation.isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <UsersRound className="h-4 w-4" />
              )}
              Transfer {totalCustomers || ''} customers
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
