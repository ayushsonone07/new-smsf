import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users,
  IndianRupee,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Repeat,
} from 'lucide-react'
import { getSession } from '../../../../app/auth/session'
import { getDepartmentCustomerRows } from '../../../../api/department-users.api'
import { fetchBillingCustomers } from '../../../../api/billing.api'
import type { FeaturePermission } from '../../../permissions/types/permission.types'

interface RecurringDashboardPageProps {
  feature?: FeaturePermission
}

interface RecurringCustomerRow {
  id: string
  businessName: string
  ownerName: string
  serviceType: string
  amountPaid: number
  amountPending: number
  dueDate: string | null
  status: string
  assignedTo: string
}

interface TeamPerformance {
  name: string
  customers: number
  pending: number
}

const parseAmount = (value: unknown): number => {
  const amount = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`

const formatDate = (value: string | null | undefined): string => {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const getStatusBadgeClass = (status: string): string => {
  const normalized = status.toUpperCase()
  if (/(OVERDUE|FAILED|CANCELLED|CANCELED)/.test(normalized)) {
    return 'bg-red-50 text-red-700 border-red-200'
  }
  if (/(PAID|COMPLETED|ACTIVE|DELIVERED|APPROVED)/.test(normalized)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (/(PENDING|PROGRESS|IN_PROGRESS|WAITING)/.test(normalized)) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

export function RecurringDashboardPage({ feature }: RecurringDashboardPageProps) {
  const session = getSession()
  const isUserRole = session?.user.role === 'USER'
  const userEmail = session?.user.email || session?.user.username || ''
  const [refreshKey, setRefreshKey] = useState(0)

  // 1. Fetch recurring customer rows via department customer rows or billing API
  const recurringQuery = useQuery({
    queryKey: ['recurring-dashboard-customers', userEmail, isUserRole, refreshKey],
    queryFn: async () => {
      try {
        const res = await getDepartmentCustomerRows({
          page: 0,
          size: 50,
          compatible: true,
          userFilter: isUserRole ? userEmail : undefined,
        })
        const items = res?.customers || []
        if (items.length > 0) {
          return items.map((c: any): RecurringCustomerRow => {
            const rawDetails = typeof c.customerDetails === 'string'
              ? (() => { try { return JSON.parse(c.customerDetails) } catch { return {} } })()
              : (c.customerDetails || {})
            const billingDetails = typeof c.billingDetails === 'string'
              ? (() => { try { return JSON.parse(c.billingDetails) } catch { return {} } })()
              : (c.billingDetails || {})

            const amountPaid = parseAmount(billingDetails.amountPaid || rawDetails.amountPaid || c.amountPaid)
            const totalAmount = parseAmount(billingDetails.totalAmount || rawDetails.totalAmount || c.totalAmount)
            const amountPending = parseAmount(billingDetails.amountRemaining || rawDetails.amountRemaining || (totalAmount > amountPaid ? totalAmount - amountPaid : 0))

            return {
              id: String(c.customerId ?? c.id ?? Math.random()),
              businessName: c.businessName || rawDetails.businessName || 'Unnamed Business',
              ownerName: c.ownerName || rawDetails.ownerName || 'N/A',
              serviceType: c.serviceType || 'RECURRING',
              amountPaid,
              amountPending,
              dueDate: rawDetails.remainingAmountDueDate || c.serviceExpiration || null,
              status: String(c.onboardingStatus || c.status || 'PENDING').replace(/_/g, ' '),
              assignedTo: c.assignedUserName || c.assignedUserEmail || 'Unassigned',
            }
          })
        }
      } catch (err) {
        console.warn('Falling back to billing customers endpoint:', err)
      }

      // Fallback to billing customers (Recurring dept has full billing visibility)
      const billingRes = await fetchBillingCustomers({ page: 0, size: 50 })
      const dataObj = billingRes?.data
      const list: any[] = Array.isArray(billingRes)
        ? billingRes
        : Array.isArray(billingRes?.content)
          ? billingRes.content
          : Array.isArray(billingRes?.customers)
            ? billingRes.customers
            : Array.isArray(dataObj)
              ? dataObj
              : (dataObj && typeof dataObj === 'object' && 'content' in dataObj && Array.isArray((dataObj as any).content))
                ? (dataObj as any).content
                : []
      return list.map((b: any): RecurringCustomerRow => ({
        id: String(b.customerId ?? b.id ?? Math.random()),
        businessName: b.businessName || 'Unnamed Business',
        ownerName: b.ownerName || 'N/A',
        serviceType: b.serviceType || 'RECURRING',
        amountPaid: parseAmount(b.amountPaid),
        amountPending: parseAmount(b.amountRemaining),
        dueDate: b.remainingAmountDueDate || null,
        status: String(b.billStatus || b.status || 'PENDING').replace(/_/g, ' '),
        assignedTo: b.assignedUser || 'Unassigned',
      }))
    },
    staleTime: 30_000,
  })

  const customers: RecurringCustomerRow[] = recurringQuery.data || []
  const isLoading = recurringQuery.isLoading
  const error = recurringQuery.error ? (recurringQuery.error as Error).message : null

  // KPI calculations
  const stats = useMemo(() => {
    let totalPending = 0
    let totalCollected = 0
    let overdueCount = 0
    let paidCount = 0

    customers.forEach((c) => {
      totalPending += c.amountPending
      totalCollected += c.amountPaid
      const norm = c.status.toUpperCase()
      if (norm.includes('OVERDUE') || norm.includes('FAILED')) {
        overdueCount++
      } else if (norm.includes('PAID') || norm.includes('COMPLETED')) {
        paidCount++
      }
    })

    return {
      totalCustomers: customers.length,
      totalPending,
      totalCollected,
      overdueCount,
      paidCount,
    }
  }, [customers])

  // Chart data: Pending collections by month
  const paymentChartData = useMemo(() => {
    const totalsByMonth = new Map<string, number>()

    customers.forEach((customer) => {
      const dueDate = customer.dueDate ? new Date(customer.dueDate) : null
      const month =
        dueDate && !Number.isNaN(dueDate.getTime())
          ? dueDate.toLocaleDateString('en-IN', { month: 'short' })
          : 'Unscheduled'
      totalsByMonth.set(
        month,
        (totalsByMonth.get(month) ?? 0) + customer.amountPending,
      )
    })

    return Array.from(totalsByMonth, ([month, amount]) => ({ month, amount }))
  }, [customers])

  const maxChartAmount = useMemo(() => {
    const max = Math.max(...paymentChartData.map((d) => d.amount), 0)
    return max > 0 ? max : 10000
  }, [paymentChartData])

  // Team performance breakdown
  const teamPerformance = useMemo(() => {
    const teamByUser = new Map<string, TeamPerformance>()

    customers.forEach((customer) => {
      const user = customer.assignedTo || 'Unassigned'
      const existing = teamByUser.get(user) ?? {
        name: user,
        customers: 0,
        pending: 0,
      }

      existing.customers += 1
      existing.pending += customer.amountPending
      teamByUser.set(user, existing)
    })

    return Array.from(teamByUser.values()).sort(
      (a, b) => b.customers - a.customers,
    )
  }, [customers])

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 font-['Jost']">
      {/* Top Banner / Header */}
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
              Track subscriptions, renewal milestones, and pending recurring dues
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setRefreshKey((k) => k + 1)
            void recurringQuery.refetch()
          }}
          disabled={recurringQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {recurringQuery.isFetching ? (
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
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isUserRole ? 'My Customers' : 'Total Accounts'}
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalCustomers}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Dues
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatCurrency(stats.totalPending)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Collected Revenue
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatCurrency(stats.totalCollected)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Accounts
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.overdueCount}
          </div>
        </div>
      </div>

      {/* Collections Chart & Team Breakdown (pure Tailwind/SVG, zero external dependencies) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-blue-600" />
              Projected Collections by Month
            </h2>
          </div>
          <div className="h-64 w-full flex flex-col justify-end">
            {paymentChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No scheduled collections
              </div>
            ) : (
              <div className="h-full flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-200">
                {paymentChartData.map((item) => {
                  const barHeightPercent = Math.min(
                    100,
                    Math.max(8, Math.round((item.amount / maxChartAmount) * 100)),
                  )
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="text-[11px] font-semibold text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </div>
                      <div
                        style={{ height: `${barHeightPercent}%` }}
                        className="w-full max-w-[42px] bg-blue-500 hover:bg-blue-600 transition-all rounded-t-lg shadow-sm"
                        title={`${item.month}: ${formatCurrency(item.amount)}`}
                      />
                      <div className="text-xs text-slate-500 mt-2 font-medium">{item.month}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Team breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            {isUserRole ? 'My Workload' : 'Team Assignments'}
          </h2>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {teamPerformance.map((member) => (
              <div
                key={member.name}
                className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-800">{member.name}</div>
                  <div className="text-xs text-slate-500">{member.customers} accounts</div>
                </div>
                <div className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {formatCurrency(member.pending)}
                </div>
              </div>
            ))}
            {!isLoading && teamPerformance.length === 0 && (
              <p className="text-sm text-slate-400 py-6 text-center">No assignments available</p>
            )}
          </div>
        </div>
      </div>

      {/* Customer Quick Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Recurring Accounts & Renewals</h3>
          <span className="text-xs text-slate-500 font-medium">
            Showing top {customers.length} records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
              <tr>
                <th className="px-5 py-3">Business</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Paid</th>
                <th className="px-5 py-3">Pending</th>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No recurring accounts found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{c.businessName}</div>
                      <div className="text-xs text-slate-400">{c.ownerName}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-600">
                      {c.serviceType}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-emerald-700">
                      {formatCurrency(c.amountPaid)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-amber-700">
                      {formatCurrency(c.amountPending)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {formatDate(c.dueDate)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                          c.status,
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {c.assignedTo}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
