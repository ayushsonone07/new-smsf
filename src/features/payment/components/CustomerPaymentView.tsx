import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Copy,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Calendar,
  Phone,
  Mail,
  User,
  AlertCircle,
} from 'lucide-react'
import {
  fetchPayments,
  type PaymentInfoItem,
  type PaymentFetchResponse,
} from '../../../api/payment.api'

function formatRupees(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num)
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function getStatusBadge(status?: string) {
  const s = (status || '').toUpperCase()
  switch (s) {
    case 'PAID':
      return {
        label: 'Paid',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
      }
    case 'PENDING':
      return {
        label: 'Pending',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        icon: Clock,
      }
    case 'CREATED':
      return {
        label: 'Created',
        bg: 'bg-sky-50 text-sky-700 border-sky-200',
        dot: 'bg-sky-500',
        icon: Plus,
      }
    case 'EXPIRED':
      return {
        label: 'Expired',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        icon: XCircle,
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        bg: 'bg-slate-50 text-slate-700 border-slate-200',
        dot: 'bg-slate-500',
        icon: XCircle,
      }
    default:
      return {
        label: s || 'Unknown',
        bg: 'bg-slate-50 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        icon: AlertCircle,
      }
  }
}

export function CustomerPaymentView() {
  const [data, setData] = useState<PaymentFetchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Details Modal & Clipboard
  const [selectedPayment, setSelectedPayment] = useState<PaymentInfoItem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchPayments({
        search: debouncedSearch.trim(),
        status: statusFilter,
        page,
        pageSize,
      })
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment records')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCopyLink = (link?: string, id?: string) => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopiedId(id || link)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const payments = data?.payments ?? []
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 1

  const stats = [
    {
      label: 'TOTAL PAYMENTS',
      value: data?.totalPayments ?? 0,
      icon: CreditCard,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      desc: 'All tracked transactions',
    },
    {
      label: 'PAID',
      value: data?.totalPaid ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      desc: 'Successfully verified payments',
    },
    {
      label: 'PENDING',
      value: data?.totalPending ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      desc: 'Awaiting customer completion',
    },
    {
      label: 'CREATED',
      value: data?.totalCreated ?? 0,
      icon: Plus,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-100',
      desc: 'Generated payment links',
    },
    {
      label: 'EXPIRED',
      value: data?.totalExpired ?? 0,
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
      desc: 'Past expiry timeframe',
    },
  ]

  const statusTabs = [
    { key: 'all', label: 'All Payments' },
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
    { key: 'created', label: 'Created' },
    { key: 'expired', label: 'Expired' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CreditCard className="w-5 h-5" />
            </span>
            Payment Transactions
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time payments directory, links status and revenue tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
          Refresh
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {stats.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`p-4 rounded-2xl border ${card.bg} bg-white/70 backdrop-blur-sm shadow-sm transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  {card.label}
                </span>
                <span className={`p-1.5 rounded-lg ${card.color} bg-white shadow-xs`}>
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {card.value.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{card.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {statusTabs.map((tab) => {
              const active = statusFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key)
                    setPage(0)
                  }}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4">Payment Link</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-32 bg-slate-200 rounded mb-1.5" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
                      <div className="h-3 w-20 bg-slate-100 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-16 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 w-16 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-7 w-7 bg-slate-200 rounded-lg mx-auto" />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No payment records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {debouncedSearch
                        ? `No results matching "${debouncedSearch}"`
                        : 'No transactions match the selected filter'}
                    </p>
                  </td>
                </tr>
              ) : (
                payments.map((p, idx) => {
                  const badge = getStatusBadge(p.paymentStatus)
                  const rowNum = page * pageSize + idx + 1
                  const isCopied = copiedId === (p.paymentsInfoId || p.paymentLink)

                  return (
                    <tr
                      key={p.paymentsInfoId || p.referenceId || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {rowNum}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {p.customerName || 'Unnamed Customer'}
                        </div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs" title={p.description}>
                            {p.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-mono text-[11.5px]">
                          {p.customerPhone || '—'}
                        </div>
                        <div className="text-slate-400 text-[11px] truncate max-w-[180px]">
                          {p.customerEmail || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 font-mono text-xs">
                          {formatRupees(p.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDate(p.linkExpireAt)}
                      </td>

                      <td className="py-3 px-4">
                        {p.paymentLink ? (
                          <div className="inline-flex items-center gap-1 max-w-[190px]">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(p.paymentLink, p.paymentsInfoId)}
                              title={isCopied ? 'Copied!' : 'Copy payment link'}
                              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                                isCopied
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={p.paymentLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 font-mono text-[11px] truncate underline hover:no-underline"
                            >
                              {p.paymentLink.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(p)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                          title="View complete transaction details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-3 px-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
              className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              {[10, 20, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
            <span>
              Showing {payments.length > 0 ? page * pageSize + 1 : 0}–
              {Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="px-2 text-slate-700 font-medium">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <CreditCard className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">Payment Details</h3>
                  <p className="text-xs text-slate-400">Ref: {selectedPayment.referenceId || selectedPayment.paymentsInfoId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Customer</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedPayment.customerName || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Amount</span>
                <p className="font-bold text-emerald-600 mt-0.5">{formatRupees(selectedPayment.amount)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Phone</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedPayment.customerPhone || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Email</span>
                <p className="font-semibold text-slate-800 mt-0.5 truncate">{selectedPayment.customerEmail || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Status</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedPayment.paymentStatus || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Payment ID</span>
                <p className="font-mono text-[11px] text-slate-700 mt-0.5 truncate">{selectedPayment.paymentId || '—'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Created Date</span>
                <p className="text-slate-700 mt-0.5">{formatDate(selectedPayment.createdAt)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-[11px] text-slate-400 font-medium">Paid Date</span>
                <p className="text-slate-700 mt-0.5">{formatDate(selectedPayment.paidAt)}</p>
              </div>
            </div>

            {selectedPayment.paymentLink && (
              <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Payment Link</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedPayment.paymentLink}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-mono text-slate-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(selectedPayment.paymentLink)}
                    className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

