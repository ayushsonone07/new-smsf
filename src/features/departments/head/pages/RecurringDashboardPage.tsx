import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  History,
  IndianRupee,
  Loader2,
  Pencil,
  RefreshCw,
  Repeat,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { getSession } from '../../../../app/auth/session'
import { useDebounce } from '../../../../hooks/useDebounce'
import { TablePagination } from '../../../../components/ui/TablePagination'
import {
  RECURRING_STAGES,
  getRecurringDues,
  getRecurringSummary,
  type RecurringDue,
  type RecurringStage,
} from '../../../../api/recurring.api'
import {
  RecordPaymentModal,
  RecurringHistoryModal,
  RecurringUpdateModal,
} from '../components/recurring/RecurringModals'
import { formatCurrency, formatDate } from '../components/recurring/recurringFormat'
import type { FeaturePermission } from '../../../permissions/types/permission.types'

interface RecurringDashboardPageProps {
  feature?: FeaturePermission
}

const STAGE_LABEL: Record<RecurringStage, string> = {
  OVERDUE: 'Overdue',
  DUE_TODAY: 'Due today',
  UPCOMING: 'Upcoming',
  NO_DUE_DATE: 'No due date',
  PAID: 'Paid',
  WRITTEN_OFF: 'Written off',
}

const STAGE_BADGE: Record<RecurringStage, string> = {
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  DUE_TODAY: 'bg-orange-50 text-orange-700 border-orange-200',
  UPCOMING: 'bg-amber-50 text-amber-700 border-amber-200',
  NO_DUE_DATE: 'bg-slate-50 text-slate-600 border-slate-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WRITTEN_OFF: 'bg-slate-100 text-slate-500 border-slate-200',
}

type ModalState = { kind: 'pay' | 'update' | 'history'; due: RecurringDue } | null

/**
 * Recurring department dashboard (payments follow-up).
 * - Totals: GET /api/recurring/summary (all accounts, computed on the server)
 * - Table:  GET /api/recurring/dues (paginated, most urgent first)
 * - Actions: record payment, update due / follow-up / promise to pay, view history
 */
export function RecurringDashboardPage({ feature }: RecurringDashboardPageProps) {
  const session = getSession()
  const isUserRole = session?.user.role === 'USER'

  const [stage, setStage] = useState<RecurringStage | ''>('')
  const [followUpDue, setFollowUpDue] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [modal, setModal] = useState<ModalState>(null)

  const summaryQuery = useQuery({
    queryKey: ['recurring-summary'],
    queryFn: getRecurringSummary,
    staleTime: 30_000,
  })

  const duesQuery = useQuery({
    queryKey: ['recurring-dues', { stage, followUpDue, search: debouncedSearch, page, size }],
    queryFn: () => getRecurringDues({ stage, followUpDue, searchParam: debouncedSearch, page, size }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const summary = summaryQuery.data
  const dues = duesQuery.data?.items ?? []
  const error = summaryQuery.error ?? duesQuery.error
  const isRefreshing = summaryQuery.isFetching || duesQuery.isFetching

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(0)
  }

  const maxAging = Math.max(
    summary?.overdueAging['0-30'] ?? 0,
    summary?.overdueAging['31-60'] ?? 0,
    summary?.overdueAging['60+'] ?? 0,
    1,
  )

  const kpis = [
    {
      label: 'Outstanding Dues',
      value: formatCurrency(summary?.totalPending ?? 0),
      hint: `${summary?.totalAccounts ?? 0} accounts`,
      icon: <IndianRupee className="w-4 h-4" />,
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Overdue',
      value: formatCurrency(summary?.overdueAmount ?? 0),
      hint: `${summary?.overdueCount ?? 0} accounts`,
      icon: <AlertTriangle className="w-4 h-4" />,
      tone: 'bg-red-50 text-red-600',
      valueClass: 'text-red-600',
    },
    {
      label: 'Due in Next 7 Days',
      value: formatCurrency(summary?.dueNext7DaysAmount ?? 0),
      hint: `${summary?.dueTodayCount ?? 0} due today`,
      icon: <CalendarClock className="w-4 h-4" />,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Collected This Month',
      value: formatCurrency(summary?.collectedThisMonth ?? 0),
      hint: 'Payments recorded in Recurring',
      icon: <CheckCircle2 className="w-4 h-4" />,
      tone: 'bg-emerald-50 text-emerald-600',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 font-['Jost']">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {feature?.name || (isUserRole ? 'My Recurring Dashboard' : 'Recurring Head Dashboard')}
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Pending payments, overdue follow-ups and renewals
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void summaryQuery.refetch()
            void duesQuery.refetch()
          }}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : (
            <RefreshCw className="w-4 h-4 text-slate-600" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error instanceof Error ? error.message : 'Could not load recurring data'}</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-2 rounded-lg ${kpi.tone}`}>{kpi.icon}</div>
            </div>
            <div className={`text-2xl font-bold ${kpi.valueClass ?? 'text-slate-900'}`}>
              {summaryQuery.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : kpi.value}
            </div>
            <div className="text-xs text-slate-500 mt-1">{kpi.hint}</div>
          </div>
        ))}
      </div>

      {/* Aging, today, team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Overdue by Age
          </h2>
          {(['0-30', '31-60', '60+'] as const).map((bucket) => {
            const amount = summary?.overdueAging[bucket] ?? 0
            return (
              <div key={bucket} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-600">{bucket} days</span>
                  <span className="font-bold text-slate-900">{formatCurrency(amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${bucket === '60+' ? 'bg-red-600' : bucket === '31-60' ? 'bg-red-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.round((amount / maxAging) * 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-blue-600" />
            Today
          </h2>
          <button
            type="button"
            onClick={() => {
              setFollowUpDue(true)
              setStage('')
              setPage(0)
            }}
            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-blue-50"
          >
            <span className="text-sm font-semibold text-slate-800">Follow-ups due</span>
            <span className="text-sm font-bold text-blue-700">{summary?.followUpsDue ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStage('DUE_TODAY')
              setFollowUpDue(false)
              setPage(0)
            }}
            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-blue-50"
          >
            <span className="text-sm font-semibold text-slate-800">Payments due today</span>
            <span className="text-sm font-bold text-orange-700">{summary?.dueTodayCount ?? 0}</span>
          </button>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Renewals in next 7 days</span>
            <span className="text-sm font-bold text-slate-900">{summary?.renewalsNext7Days ?? 0}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Team Assignments
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {(summary?.byAssignee ?? []).map((member) => (
              <div
                key={member.name}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-800">{member.name}</div>
                  <div className="text-xs text-slate-500">
                    {member.accounts} accounts · {member.overdue} overdue
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {formatCurrency(member.pending)}
                </div>
              </div>
            ))}
            {!summaryQuery.isLoading && (summary?.byAssignee.length ?? 0) === 0 && (
              <p className="text-sm text-slate-400 py-6 text-center">No assignments available</p>
            )}
          </div>
        </div>
      </div>

      {/* Accounts table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h3 className="font-bold text-slate-900 text-base">Recurring Accounts</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={followUpDue}
                  onChange={(e) => resetPage(setFollowUpDue)(e.target.checked)}
                />
                Follow-ups due
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => resetPage(setSearch)(e.target.value)}
                  placeholder="Search name, business, phone"
                  className="w-56 rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['', ...RECURRING_STAGES] as const).map((value) => {
              const count = value ? summary?.stageCounts[value] : summary?.totalAccounts
              const active = stage === value
              return (
                <button
                  key={value || 'ALL'}
                  type="button"
                  onClick={() => resetPage(setStage)(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {value ? STAGE_LABEL[value] : 'All'}
                  {count !== undefined && <span className="ml-1 opacity-75">{count}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
              <tr>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Follow-up</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {duesQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading accounts...
                  </td>
                </tr>
              ) : dues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No recurring accounts found.
                  </td>
                </tr>
              ) : (
                dues.map((due) => (
                  <tr key={`${due.customerId}-${due.serviceType}`} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{due.businessName || 'Unnamed Business'}</div>
                      <div className="text-xs text-slate-400">
                        {due.ownerName || '—'} · {due.phoneNumber || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {due.serviceType}
                        {due.billingCycle && ` · ${due.billingCycle.replace(/_/g, ' ').toLowerCase()}`}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-amber-700">{formatCurrency(due.amountPending)} pending</div>
                      <div className="text-xs text-emerald-700">{formatCurrency(due.amountPaid)} paid</div>
                      {due.totalAmount !== null && (
                        <div className="text-[11px] text-slate-400">of {formatCurrency(due.totalAmount)}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <div className="text-slate-700">{formatDate(due.dueDate)}</div>
                      {due.overdueDays > 0 && (
                        <div className="font-semibold text-red-600">{due.overdueDays} days late</div>
                      )}
                      {due.renewalDate && <div className="text-slate-400">Renews {formatDate(due.renewalDate)}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STAGE_BADGE[due.stage]}`}
                      >
                        {STAGE_LABEL[due.stage]}
                      </span>
                      {due.partiallyPaid && <div className="text-[11px] text-slate-500 mt-1">Partially paid</div>}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div>{due.nextFollowUpDate ? formatDate(due.nextFollowUpDate) : '—'}</div>
                      {due.promiseToPayDate && (
                        <div className="text-blue-700">
                          Promised {formatCurrency(due.promiseAmount)} on {formatDate(due.promiseToPayDate)}
                        </div>
                      )}
                      {due.nonPaymentReason && (
                        <div className="text-slate-500 max-w-[180px] truncate" title={due.nonPaymentReason}>
                          {due.nonPaymentReason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {due.assignedUserName || due.assignedUserEmail || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModal({ kind: 'pay', due })}
                          disabled={due.stage === 'WRITTEN_OFF'}
                          title="Record payment"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Pay
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ kind: 'update', due })}
                          title="Update due date, follow-up, promise to pay"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ kind: 'history', due })}
                          title="Payments & history"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          pageSize={size}
          totalResults={duesQuery.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setSize(newSize)
            setPage(0)
          }}
          pageSizeOptions={[10, 20, 50]}
          disabled={duesQuery.isFetching}
        />
      </div>

      {modal?.kind === 'pay' && <RecordPaymentModal due={modal.due} onClose={() => setModal(null)} />}
      {modal?.kind === 'update' && <RecurringUpdateModal due={modal.due} onClose={() => setModal(null)} />}
      {modal?.kind === 'history' && <RecurringHistoryModal due={modal.due} onClose={() => setModal(null)} />}
    </div>
  )
}
