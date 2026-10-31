import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Copy,
  Check,
  RotateCw,
  Search,
  FileText,
  X,
  Target,
  Shield,
  History as HistoryIcon,
  Loader2,
} from 'lucide-react'
import {
  fetchAllTickets,
  fetchHelpCenterAnalytics,
  fetchTicketDetails,
  fetchTicketHistory,
} from '../../../api/help-center.api'
import { getSession } from '../../../app/auth/session'
import type {
  HelpCenterDashboardUserAnalytics,
  TicketHistoryEntry,
  TicketHistoryPageResponse,
} from '../types/help-center.types'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { LoadingState } from '../../../components/ui/LoadingState'
import { RefreshButton } from '../../../components/ui/RefreshButton'
import { TablePagination } from '../../../components/ui/TablePagination'

/**
 * SuperAdmin Help & Support view:
 * High-performance, read-only analytics, department comparison, ticket inspection,
 * and status timeline for administration.
 */

type Tab = 'overview' | 'tickets'

interface Counts {
  total: number
  open: number
  inProgress: number
  waiting: number
  escalated: number
  resolved: number
  closed: number
}

interface DepartmentSummary extends Counts {
  id: number
  name: string
  members: (Counts & { email: string; name: string })[]
}

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED']
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  OPEN: { bg: '#edf3ff', fg: '#2864db', dot: '#2864db' },
  IN_PROGRESS: { bg: '#fff7ed', fg: '#c2410c', dot: '#ea580c' },
  WAITING_ON_CUSTOMER: { bg: '#fef3c7', fg: '#b45309', dot: '#d97706' },
  ESCALATED: { bg: '#fef2f2', fg: '#b91c1c', dot: '#dc2626' },
  RESOLVED: { bg: '#ecfdf5', fg: '#047857', dot: '#10b981' },
  CLOSED: { bg: '#f1f5f9', fg: '#475569', dot: '#64748b' },
}

const PRIORITY_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  LOW: { bg: '#f1f5f9', fg: '#475569', dot: '#94a3b8' },
  MEDIUM: { bg: '#edf3ff', fg: '#2563eb', dot: '#3b82f6' },
  HIGH: { bg: '#fff0e9', fg: '#cf672e', dot: '#f97316' },
  URGENT: { bg: '#fef2f2', fg: '#dc2626', dot: '#ef4444' },
}

const EMPTY_COUNTS: Counts = { total: 0, open: 0, inProgress: 0, waiting: 0, escalated: 0, resolved: 0, closed: 0 }

function humanize(value?: string) {
  return value ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—'
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

const unresolvedOf = (c: Counts) => c.open + c.inProgress + c.waiting + c.escalated
const resolvedOf = (c: Counts) => c.resolved + c.closed
const resolutionRate = (c: Counts) => (c.total > 0 ? Math.round((resolvedOf(c) / c.total) * 100) : 0)

function addCounts(target: Counts, u: HelpCenterDashboardUserAnalytics) {
  target.total += u.totalTickets ?? 0
  target.open += u.open ?? 0
  target.inProgress += u.inProgress ?? 0
  target.waiting += u.waitingOnCustomer ?? 0
  target.escalated += u.escalated ?? 0
  target.resolved += u.resolved ?? 0
  target.closed += u.closed ?? 0
}

function summarizeDepartments(users: HelpCenterDashboardUserAnalytics[]): DepartmentSummary[] {
  const byId = new Map<number, DepartmentSummary>()
  for (const u of users) {
    let dept = byId.get(u.departmentId)
    if (!dept) {
      dept = { ...EMPTY_COUNTS, id: u.departmentId, name: u.departmentName || `Department ${u.departmentId}`, members: [] }
      byId.set(u.departmentId, dept)
    }
    addCounts(dept, u)
    const member = { ...EMPTY_COUNTS, email: u.userEmail, name: u.userName || u.userEmail }
    addCounts(member, u)
    dept.members.push(member)
  }
  return [...byId.values()].sort((a, b) => b.total - a.total)
}

function StatusBadge({ status }: { status?: string }) {
  const norm = (status || 'CLOSED').toUpperCase()
  const cfg = STATUS_COLORS[norm] ?? STATUS_COLORS.CLOSED
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {humanize(status)}
    </span>
  )
}

function PriorityBadge({ priority }: { priority?: string }) {
  const norm = (priority || 'MEDIUM').toUpperCase()
  const cfg = PRIORITY_COLORS[norm] ?? PRIORITY_COLORS.MEDIUM
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
      {humanize(priority)}
    </span>
  )
}

/** 7 Stat KPI Cards corresponding to preview (1).html & preview (2).html */
function StatKPISection({ counts }: { counts: Counts }) {
  const stats = [
    {
      label: 'TOTAL TICKETS',
      value: counts.total,
      note: 'All departments',
      icon: <FileText className="w-4 h-4 text-[#315fe8]" />,
      colorClass: 'text-[#315fe8]',
      iconBg: 'bg-[#f1f4ff]',
    },
    {
      label: 'OPEN',
      value: counts.open,
      note: 'Awaiting action',
      icon: <Clock className="w-4 h-4 text-[#315fe8]" />,
      colorClass: 'text-[#315fe8]',
      iconBg: 'bg-[#f1f4ff]',
    },
    {
      label: 'IN PROGRESS',
      value: counts.inProgress,
      note: 'Currently processing',
      icon: <ArrowUpRight className="w-4 h-4 text-[#c7771f]" />,
      colorClass: 'text-[#c7771f]',
      iconBg: 'bg-[#fff7ed]',
    },
    {
      label: 'WAITING ON CUSTOMER',
      value: counts.waiting,
      note: 'Pending customer reply',
      icon: <Clock className="w-4 h-4 text-[#71809a]" />,
      colorClass: 'text-[#17243c]',
      iconBg: 'bg-[#f1f4f9]',
    },
    {
      label: 'ESCALATED',
      value: counts.escalated,
      note: 'Requires attention',
      icon: <AlertCircle className="w-4 h-4 text-[#df4756]" />,
      colorClass: 'text-[#df4756]',
      iconBg: 'bg-[#fef2f2]',
    },
    {
      label: 'RESOLVED / CLOSED',
      value: resolvedOf(counts),
      note: 'Completed tickets',
      icon: <CheckCircle2 className="w-4 h-4 text-[#079768]" />,
      colorClass: 'text-[#079768]',
      iconBg: 'bg-[#ecfdf5]',
    },
    {
      label: 'RESOLUTION RATE',
      value: `${resolutionRate(counts)}%`,
      note: 'Overall completion',
      icon: <Target className="w-4 h-4 text-[#079768]" />,
      colorClass: 'text-[#079768]',
      iconBg: 'bg-[#ecfdf5]',
    },
  ]

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-[#e7ebf3] rounded-xl p-4 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-wider text-[#71809a] uppercase">
              {s.label}
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>
              {s.icon}
            </div>
          </div>
          <div>
            <div className={`text-2xl font-extrabold tracking-tight ${s.colorClass}`}>
              {s.value}
            </div>
            <div className="text-[10px] font-medium text-[#98a3b6] mt-1">{s.note}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

/** Horizontal stacked bar performance & donut resolution card from preview (1).html */
function PerformanceAndOverview({
  departments,
  overall,
}: {
  departments: DepartmentSummary[]
  overall: Counts
}) {
  const maxTotal = useMemo(() => {
    const highest = Math.max(...departments.map((d) => d.total), 1)
    return Math.ceil(highest / 10) * 10
  }, [departments])

  const scaleMarks = useMemo(() => {
    const step = maxTotal / 4
    return [0, Math.round(step), Math.round(step * 2), Math.round(step * 3), maxTotal]
  }, [maxTotal])

  const rate = resolutionRate(overall)
  const totalUnresolved = unresolvedOf(overall)
  const totalResolved = resolvedOf(overall)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
      {/* Department Ticket Performance Horizontal Stacked Bar Chart */}
      <div className="lg:col-span-8 bg-white border border-[#e7ebf3] rounded-2xl shadow-sm p-5 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm font-bold text-[#17243c] tracking-tight">Department Ticket Performance</h2>
            <p className="text-xs text-[#77869e] mt-1">Unresolved and resolved tickets by department</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-[#70809a]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3978e9]" /> Unresolved
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#29b28b]" /> Resolved
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {departments.map((d) => {
            const unres = unresolvedOf(d)
            const res = resolvedOf(d)
            const unresPct = (unres / maxTotal) * 100
            const resPct = (res / maxTotal) * 100
            const cleanName = d.name.replace(/_DEPARTMENT$/i, '').replace(/_/g, ' ')

            return (
              <div key={d.id} className="grid grid-cols-[130px_1fr_40px] items-center gap-3">
                <span
                  className="text-xs font-semibold text-[#53637c] truncate"
                  title={d.name}
                >
                  {cleanName}
                </span>
                <div className="h-4 bg-[#f0f3f8] rounded-md overflow-hidden flex">
                  <div
                    className="h-full bg-[#3978e9] transition-all duration-300 hover:brightness-110"
                    style={{ width: `${unresPct}%` }}
                    title={`${unres} Unresolved`}
                  />
                  <div
                    className="h-full bg-[#29b28b] transition-all duration-300 hover:brightness-110"
                    style={{ width: `${resPct}%` }}
                    title={`${res} Resolved`}
                  />
                </div>
                <span className="text-xs font-bold text-[#17243c] text-right">{d.total}</span>
              </div>
            )
          })}
        </div>

        <div className="flex justify-between ml-[142px] pt-3 mt-4 border-t border-dashed border-[#e6eaf3] text-[10px] font-semibold text-[#96a3b8]">
          {scaleMarks.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>

      {/* Resolution Overview Donut Card */}
      <div className="lg:col-span-4 bg-white border border-[#e7ebf3] rounded-2xl shadow-sm p-5 flex flex-col justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#17243c] tracking-tight">Resolution Overview</h2>
          <p className="text-xs text-[#77869e] mt-1">Overall ticket completion rate</p>
        </div>

        <div className="my-5 flex flex-col items-center">
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center shadow-inner"
            style={{
              background: `conic-gradient(#22ae87 0 ${rate}%, #eaf0f9 ${rate}% 100%)`,
            }}
          >
            <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
              <span className="text-3xl font-extrabold text-[#17243c] tracking-tight">{rate}%</span>
              <span className="text-[10px] font-medium text-[#77869e] mt-0.5">Resolution rate</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#e7ebf3] text-xs font-medium">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[#71819a]">Total Tickets</span>
            <strong className="text-[#17243c] font-bold">{overall.total}</strong>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[#71819a]">Unresolved</span>
            <strong className="text-[#17243c] font-bold">{totalUnresolved}</strong>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[#71819a]">Resolved / Closed</span>
            <strong className="text-[#079768] font-bold">{totalResolved}</strong>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[#71819a]">Escalated</span>
            <strong className={overall.escalated > 0 ? 'text-[#df4756] font-bold' : 'text-[#17243c] font-bold'}>
              {overall.escalated}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Department Comparison Table with search filter & meter bars */
function DepartmentComparisonTable({
  departments,
  attentionId,
  onViewDepartment,
}: {
  departments: DepartmentSummary[]
  attentionId?: number
  onViewDepartment: (id: number) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return departments
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.name.replace(/_/g, ' ').toLowerCase().includes(q)
    )
  }, [departments, searchTerm])

  return (
    <div className="bg-white border border-[#e7ebf3] rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7ebf3]">
        <div>
          <h2 className="text-sm font-bold text-[#17243c] tracking-tight">Department Comparison</h2>
          <p className="text-xs text-[#77869e] mt-1">
            Ticket distribution, resolution rates, and department performance
          </p>
        </div>
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#9aa6b9] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full h-9 pl-9 pr-3 bg-white border border-[#e7ebf3] rounded-lg text-xs text-[#17243c] placeholder-[#9aa6b9] focus:outline-none focus:border-[#315fe8]"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-[#f8fafe] border-b border-[#e7ebf3] text-[10px] font-bold text-[#7b89a1] tracking-wider uppercase">
              <th className="py-3 px-4">DEPARTMENT</th>
              <th className="py-3 px-4">TOTAL</th>
              <th className="py-3 px-4">OPEN</th>
              <th className="py-3 px-4">IN PROGRESS</th>
              <th className="py-3 px-4">WAITING</th>
              <th className="py-3 px-4">ESCALATED</th>
              <th className="py-3 px-4">RESOLVED / CLOSED</th>
              <th className="py-3 px-4">RESOLUTION RATE</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eff2f7]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-xs text-[#77869e]">
                  No departments found matching &ldquo;{searchTerm}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const isWorst = attentionId !== undefined && d.id === attentionId
                const rate = resolutionRate(d)
                return (
                  <tr
                    key={d.id}
                    className={`hover:bg-[#f9fbff] transition-colors ${
                      isWorst ? 'bg-[#fffaf5]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-[#17243c]">{d.name}</strong>
                        {isWorst && (
                          <span className="inline-flex items-center gap-1 bg-[#fff1e8] text-[#d77933] border border-[#fed7aa] text-[10px] font-bold px-2 py-0.5 rounded">
                            ⚠ Most unresolved
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9aa6b9] font-medium mt-0.5">
                        {d.members.length} {d.members.length === 1 ? 'member' : 'members'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#17243c]">{d.total}</td>
                    <td className="py-3.5 px-4 font-medium text-[#475569]">{d.open}</td>
                    <td className="py-3.5 px-4 font-medium text-[#c2410c]">{d.inProgress}</td>
                    <td className="py-3.5 px-4 font-medium text-[#475569]">{d.waiting}</td>
                    <td
                      className={`py-3.5 px-4 font-semibold ${
                        d.escalated > 0 ? 'text-[#b91c1c]' : 'text-[#475569]'
                      }`}
                    >
                      {d.escalated}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#047857]">{resolvedOf(d)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[#17243c] min-w-[32px]">{rate}%</span>
                        <div className="w-16 h-1.5 bg-[#e9edf5] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#22ae87] rounded-full transition-all duration-300"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onViewDepartment(d.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#dbe4f3] bg-white text-[#315fe8] font-bold text-xs hover:bg-[#315fe8] hover:text-white hover:border-[#315fe8] transition-all shadow-sm"
                      >
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Read-only Tickets list corresponding to preview (2).html */
function TicketsListSection({
  departmentId,
  departments,
  onViewTicket,
}: {
  departmentId?: number
  departments: DepartmentSummary[]
  onViewTicket: (ticketNumber: string) => void
}) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(0)
    }, 400)
    return () => clearTimeout(id)
  }, [searchInput])

  const effectiveDept = departmentId ?? (deptFilter ? Number(deptFilter) : undefined)

  const ticketsQuery = useQuery({
    queryKey: ['admin-help-tickets', { page, pageSize, status, priority, search, effectiveDept }],
    queryFn: () =>
      fetchAllTickets({
        page,
        size: pageSize,
        status: status || undefined,
        priority: priority || undefined,
        search: search || undefined,
        departmentId: effectiveDept,
      }),
    placeholderData: keepPreviousData,
  })

  const allRows = ticketsQuery.data?.rows ?? []
  const scopedName =
    departmentId !== undefined ? departments.find((d) => d.id === departmentId)?.name : undefined
  const filterIgnored = !!scopedName && allRows.some((r) => r.department !== scopedName)
  const rows = filterIgnored ? allRows.filter((r) => r.department === scopedName) : allRows
  const totalRecords = ticketsQuery.data?.totalRecords ?? 0
  const isRefreshing = ticketsQuery.isFetching && !ticketsQuery.isLoading

  return (
    <div className="bg-white border border-[#e7ebf3] rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e7ebf3]">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-[#17243c] tracking-tight">Tickets</h2>
          <span className="text-xs font-semibold text-[#73829c] bg-[#f5f7fb] px-2.5 py-1 rounded-full border border-[#e7edf5]">
            {totalRecords} total
          </span>
          <button
            onClick={() => ticketsQuery.refetch()}
            className="w-8 h-8 rounded-lg border border-[#e7ebf3] bg-white flex items-center justify-center text-[#5c6d88] hover:text-[#315fe8] hover:bg-[#f8fafe] transition-colors"
            title="Refresh tickets"
          >
            <RotateCw className={`w-3.5 h-3.5 ${ticketsQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-[#9aa6b9] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              className="w-full h-9 pl-9 pr-3 bg-white border border-[#e7ebf3] rounded-lg text-xs text-[#17243c] placeholder-[#9aa6b9] focus:outline-none focus:border-[#315fe8]"
              placeholder="Search ticket # or subject"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {departmentId === undefined && (
            <select
              className="h-9 px-3 bg-white border border-[#e7ebf3] rounded-lg text-xs text-[#17243c] font-medium focus:outline-none focus:border-[#315fe8]"
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value)
                setPage(0)
              }}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="h-9 px-3 bg-white border border-[#e7ebf3] rounded-lg text-xs text-[#17243c] font-medium focus:outline-none focus:border-[#315fe8]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>

          <select
            className="h-9 px-3 bg-white border border-[#e7ebf3] rounded-lg text-xs text-[#17243c] font-medium focus:outline-none focus:border-[#315fe8]"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {humanize(p)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filterIgnored && (
        <div className="mx-5 my-3 p-3 rounded-xl bg-[#fffbeb] text-[#92400e] border border-[#fde68a] text-xs leading-relaxed">
          The Help Center server does not support the department filter yet, so only this page&apos;s{' '}
          <strong>{scopedName}</strong> tickets are shown and the totals cover all departments. Deploy the
          updated Help Center to fix this.
        </div>
      )}

      {ticketsQuery.isLoading ? (
        <div className="p-8">
          <LoadingState message="Loading tickets..." />
        </div>
      ) : ticketsQuery.isError ? (
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-[#b91c1c] mb-3">Could not load tickets.</p>
          <Button variant="secondary" onClick={() => ticketsQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-14 text-center">
          <strong className="block text-sm font-bold text-[#1e293b]">No tickets found</strong>
          <span className="text-xs text-[#64748b] mt-1 block">Try clearing the search or filters.</span>
        </div>
      ) : (
        <div className={`transition-opacity ${isRefreshing ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-[#f8fafe] border-b border-[#e7ebf3] text-[10px] font-bold text-[#7b89a1] tracking-wider uppercase">
                  <th className="py-3 px-4">TICKET #</th>
                  <th className="py-3 px-4">SUBJECT</th>
                  <th className="py-3 px-4">DEPARTMENT</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">PRIORITY</th>
                  <th className="py-3 px-4 text-right">DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff2f7]">
                {rows.map((row) => (
                  <tr key={row.ticketNumber} className="hover:bg-[#f9fbff] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#17243c]">
                      {row.ticketNumber}
                    </td>
                    <td className="py-3.5 px-4 text-[#334155] max-w-[340px] truncate">
                      {row.subject || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block bg-[#f1f5f9] text-[#475569] font-semibold text-[11px] px-2.5 py-0.5 rounded border border-[#e2e8f0]">
                        {row.department || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={status || 'OPEN'} />
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={priority || 'MEDIUM'} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onViewTicket(row.ticketNumber)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#dbe4f3] bg-white text-[#315fe8] font-bold text-xs hover:bg-[#315fe8] hover:text-white transition-all shadow-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#e7ebf3]">
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalResults={totalRecords}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(0)
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              disabled={ticketsQuery.isFetching}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** Team Workload Table for Department View */
function TeamWorkloadSection({ dept }: { dept: DepartmentSummary }) {
  const membersSorted = useMemo(() => {
    return [...dept.members].sort((a, b) => unresolvedOf(b) - unresolvedOf(a))
  }, [dept.members])

  return (
    <div className="bg-white border border-[#e7ebf3] rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e7ebf3]">
        <div>
          <h2 className="text-sm font-bold text-[#17243c] tracking-tight">Team Workload</h2>
          <p className="text-xs text-[#77869e] mt-1">
            Department members with ticket counts by status
          </p>
        </div>
        <div className="text-xs font-semibold text-[#5c6d88]">
          Tickets assigned to each member of {dept.name}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-[#f8fafe] border-b border-[#e7ebf3] text-[10px] font-bold text-[#7b89a1] tracking-wider uppercase">
              <th className="py-3 px-4">MEMBER</th>
              <th className="py-3 px-4">TOTAL</th>
              <th className="py-3 px-4">OPEN</th>
              <th className="py-3 px-4">IN PROGRESS</th>
              <th className="py-3 px-4">WAITING</th>
              <th className="py-3 px-4">ESCALATED</th>
              <th className="py-3 px-4">RESOLVED / CLOSED</th>
              <th className="py-3 px-4">RESOLUTION %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eff2f7]">
            {membersSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-[#77869e]">
                  No members with assigned tickets found for this department.
                </td>
              </tr>
            ) : (
              membersSorted.map((m) => {
                const rate = resolutionRate(m)
                return (
                  <tr key={m.email} className="hover:bg-[#f9fbff] transition-colors">
                    <td className="py-3.5 px-4">
                      <strong className="block text-xs font-bold text-[#17243c]">
                        {m.name || m.email}
                      </strong>
                      {m.name !== m.email && (
                        <span className="block text-[11px] text-[#9aa6b9] font-medium mt-0.5">
                          {m.email}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#17243c]">{m.total}</td>
                    <td className="py-3.5 px-4 font-medium text-[#475569]">{m.open}</td>
                    <td className="py-3.5 px-4 font-medium text-[#c2410c]">{m.inProgress}</td>
                    <td className="py-3.5 px-4 font-medium text-[#475569]">{m.waiting}</td>
                    <td
                      className={`py-3.5 px-4 font-semibold ${
                        m.escalated > 0 ? 'text-[#b91c1c]' : 'text-[#475569]'
                      }`}
                    >
                      {m.escalated}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#047857]">{resolvedOf(m)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-[#17243c] min-w-[32px]">{rate}%</span>
                        <div className="w-16 h-1.5 bg-[#e9edf5] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#22ae87] rounded-full transition-all duration-300"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Complete Ticket Details & History Modal from preview (3).html */
function TicketDetailsModal({
  ticketNumber,
  onClose,
}: {
  ticketNumber: string | null
  onClose: () => void
}) {
  const [modalTab, setModalTab] = useState<'details' | 'history'>('details')
  const [copied, setCopied] = useState(false)

  const detailsQuery = useQuery({
    queryKey: ['admin-help-ticket', ticketNumber],
    queryFn: () => fetchTicketDetails(ticketNumber as string),
    enabled: !!ticketNumber,
  })

  const historyQuery = useQuery({
    queryKey: ['admin-help-ticket-history', ticketNumber],
    queryFn: () => fetchTicketHistory(ticketNumber as string, 0, 50),
    enabled: !!ticketNumber && modalTab === 'history',
  })

  const details = detailsQuery.data

  const handleCopy = useCallback(() => {
    if (!ticketNumber) return
    navigator.clipboard.writeText(ticketNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [ticketNumber])

  if (!ticketNumber) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121c30]/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#e8edf5] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#e8edf5] flex items-start justify-between gap-4 bg-white">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#7c8ba4] mb-1.5">
              HELP CENTER / TICKET DETAILS
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-extrabold text-[#17233c] tracking-tight">{ticketNumber}</h2>
              <button
                onClick={handleCopy}
                className="w-7 h-7 rounded-lg border border-[#e8edf5] bg-white flex items-center justify-center text-[#5c6b85] hover:text-[#315ff4] hover:bg-[#f2f5fb] transition-colors"
                title="Copy Ticket ID"
                aria-label="Copy Ticket ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {copied && <span className="text-xs font-semibold text-emerald-600">Copied!</span>}
            </div>

            <p className="text-xs font-medium text-[#677893] mt-2 mb-3 line-clamp-2">
              {details?.subject || 'Ticket Details'}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={details?.status || 'OPEN'} />
              <PriorityBadge priority={details?.priority || 'MEDIUM'} />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#f2f4f8] text-[#64758d]">
                <Shield className="w-3 h-3 text-[#64758d]" /> Read Only
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                detailsQuery.refetch()
                if (modalTab === 'history') historyQuery.refetch()
              }}
              className="w-8 h-8 rounded-lg border border-[#e8edf5] bg-white flex items-center justify-center text-[#5c6b85] hover:text-[#315ff4] hover:bg-[#f2f5fb] transition-colors"
              title="Refresh"
            >
              <RotateCw className={`w-3.5 h-3.5 ${detailsQuery.isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-[#e8edf5] bg-white flex items-center justify-center text-[#5c6b85] hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-[#e8edf5] bg-white">
          <button
            onClick={() => setModalTab('details')}
            className={`py-3.5 px-4 text-xs font-bold relative transition-colors ${
              modalTab === 'details'
                ? 'text-[#315ff4]'
                : 'text-[#8290a5] hover:text-[#17233c]'
            }`}
          >
            Ticket Details
            {modalTab === 'details' && (
              <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-[#315ff4] rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setModalTab('history')}
            className={`py-3.5 px-4 text-xs font-bold relative transition-colors ${
              modalTab === 'history'
                ? 'text-[#315ff4]'
                : 'text-[#8290a5] hover:text-[#17233c]'
            }`}
          >
            Status History
            {modalTab === 'history' && (
              <span className="absolute bottom-0 left-3 right-3 h-[3px] bg-[#315ff4] rounded-t-full" />
            )}
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 overflow-y-auto flex-1 overscroll-contain">
          {detailsQuery.isLoading ? (
            <div className="py-12">
              <LoadingState message="Loading ticket details..." />
            </div>
          ) : !details ? (
            <div className="py-12 text-center text-sm font-semibold text-red-600">
              Could not load ticket details.
            </div>
          ) : modalTab === 'details' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-extrabold text-[#17233c]">Ticket Information</h3>
                <span className="text-[11px] font-medium text-[#7c8ba4]">General details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                <div className="border border-[#e8edf5] rounded-xl p-3.5 bg-white">
                  <div className="text-[10px] font-bold text-[#8390a6] uppercase tracking-wider mb-1.5">
                    Department
                  </div>
                  <div className="text-xs font-bold text-[#17233c]">
                    {details.departmentName || details.department?.name || '—'}
                  </div>
                </div>

                <div className="border border-[#e8edf5] rounded-xl p-3.5 bg-white">
                  <div className="text-[10px] font-bold text-[#8390a6] uppercase tracking-wider mb-1.5">
                    Raised By
                  </div>
                  <div className="text-xs font-bold text-[#17233c]">
                    {details.userDto?.name || details.userDto?.email || '—'}
                  </div>
                </div>

                <div className="border border-[#e8edf5] rounded-xl p-3.5 bg-white">
                  <div className="text-[10px] font-bold text-[#8390a6] uppercase tracking-wider mb-1.5">
                    Assigned To
                  </div>
                  <div className="text-xs font-bold text-[#17233c]">
                    {details.assignedToName || details.assignedTo || 'Unassigned'}
                  </div>
                </div>

                <div className="border border-[#e8edf5] rounded-xl p-3.5 bg-white">
                  <div className="text-[10px] font-bold text-[#8390a6] uppercase tracking-wider mb-1.5">
                    Created At
                  </div>
                  <div className="text-xs font-bold text-[#17233c]">
                    {formatDate(details.createdAt)}
                  </div>
                </div>

                <div className="border border-[#e8edf5] rounded-xl p-3.5 bg-white">
                  <div className="text-[10px] font-bold text-[#8390a6] uppercase tracking-wider mb-1.5">
                    Last Updated
                  </div>
                  <div className="text-xs font-bold text-[#17233c]">
                    {formatDate(details.updatedAt)}
                  </div>
                </div>

                <div className="border border-[#e8edf5] rounded-xl p-3.5 bg-white">
                  <div className="text-[10px] font-bold text-[#8390a6] uppercase tracking-wider mb-1.5">
                    Resolved At
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      details.resolvedAt ? 'text-[#079768]' : 'text-[#a3aebe]'
                    }`}
                  >
                    {details.resolvedAt ? formatDate(details.resolvedAt) : 'Not resolved'}
                  </div>
                </div>
              </div>

              {details.description && (
                <div className="mb-5">
                  <div className="text-xs font-extrabold text-[#17233c] mb-2">Description</div>
                  <div className="p-4 border border-[#e9edf5] rounded-xl bg-[#f8faff] text-xs text-[#475873] leading-relaxed whitespace-pre-wrap">
                    {details.description}
                  </div>
                </div>
              )}

              {details.latestRemark && (
                <div>
                  <div className="text-xs font-extrabold text-[#17233c] mb-2">Latest Remark</div>
                  <div className="p-4 border border-[#fed7aa] rounded-xl bg-[#fffbeb] text-xs text-[#92400e] leading-relaxed whitespace-pre-wrap">
                    {details.latestRemark}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-extrabold text-[#17233c]">Status History</h3>
                  <p className="text-[11px] font-medium text-[#7c8ba4] mt-0.5">
                    Timeline of changes for this ticket
                  </p>
                </div>
                <StatusBadge status={details.status} />
              </div>

              {historyQuery.isLoading ? (
                <div className="py-8">
                  <LoadingState message="Loading status history..." />
                </div>
              ) : historyQuery.isError ? (
                <div className="py-8 text-center text-xs font-semibold text-red-600">
                  Could not load status transitions.
                </div>
              ) : !historyQuery.data?.entries || historyQuery.data.entries.length === 0 ? (
                <div className="py-10 text-center">
                  <HistoryIcon className="w-8 h-8 text-[#9aa6b9] mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium text-[#7c8ba4]">
                    No status transitions recorded yet for this ticket.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-[#e5eaf5]">
                  {historyQuery.data.entries.map((entry: TicketHistoryEntry, index: number) => {
                    const isLatest = index === 0
                    return (
                      <div key={entry.id ?? index} className="relative">
                        <div
                          className={`absolute -left-[27px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                            isLatest
                              ? 'bg-[#315ff4] ring-2 ring-[#d5e1ff]'
                              : 'bg-[#94a3b8] ring-2 ring-slate-100'
                          }`}
                        />
                        <div className="border border-[#e8edf5] rounded-xl p-4 bg-white shadow-sm">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={entry.status} />
                              {entry.previousStatus && (
                                <span className="text-[11px] text-[#7c8ba4]">
                                  (from {humanize(entry.previousStatus)})
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-medium text-[#7c8ba4]">
                              {formatDate(entry.updatedAt)}
                            </span>
                          </div>

                          <div className="text-xs text-[#5c6b85] leading-relaxed">
                            {entry.updatedBy && (
                              <span className="font-semibold text-[#17233c] mr-2">
                                Updated by {entry.updatedBy}
                              </span>
                            )}
                            {entry.remark && (
                              <p className="mt-1.5 p-2.5 rounded-lg bg-[#f8faff] border border-[#e9edf5] text-xs text-[#475873]">
                                {entry.remark}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-[#e8edf5] bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-[#8996a9] font-medium">
            <Shield className="w-3.5 h-3.5 text-[#8996a9]" />
            <span>View-only administrative access. Ticket operations are handled by the assigned department.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#dce4f1] bg-white text-xs font-bold text-[#41526e] hover:bg-[#f5f7fc] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminHelpSupportPage() {
  const email = getSession()?.user?.email || ''

  const [tab, setTab] = useState<Tab>('overview')
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null)

  const analyticsQuery = useQuery({
    queryKey: ['admin-help-analytics', email],
    queryFn: () => fetchHelpCenterAnalytics(email, 'SUPERADMIN'),
  })

  const departments = useMemo(
    () => summarizeDepartments(analyticsQuery.data?.users ?? []),
    [analyticsQuery.data]
  )

  const overall = useMemo<Counts>(() => {
    const a = analyticsQuery.data
    if (!a) return EMPTY_COUNTS
    return {
      total: a.overallTotalTickets ?? 0,
      open: a.overallOpen ?? 0,
      inProgress: a.overallInProgress ?? 0,
      waiting: a.overallWaitingOnCustomer ?? 0,
      escalated: a.overallEscalated ?? 0,
      resolved: a.overallResolved ?? 0,
      closed: a.overallClosed ?? 0,
    }
  }, [analyticsQuery.data])

  const attentionDeptId = useMemo(() => {
    const worst = [...departments].sort((a, b) => unresolvedOf(b) - unresolvedOf(a))[0]
    return worst && unresolvedOf(worst) > 0 ? worst.id : undefined
  }, [departments])

  const selectedDept = departments.find((d) => d.id === selectedDeptId) ?? null
  const isRefreshingAnalytics = analyticsQuery.isFetching && !analyticsQuery.isLoading

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            {selectedDept && tab === 'overview' ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedDeptId(null)}
                  className="text-[#315fe8] hover:underline font-semibold"
                >
                  Help &amp; Support
                </button>
                {' / '}
                <span className="text-[#17243c] font-bold">{selectedDept.name}</span>
              </>
            ) : (
              <span className="text-[#17243c] font-bold">Help &amp; Support</span>
            )}
          </>
        }
        title={
          selectedDept && tab === 'overview'
            ? `${selectedDept.name} — Help & Support`
            : 'Help & Support'
        }
        description={
          selectedDept && tab === 'overview'
            ? 'View-only: how every department is handling its customer support tickets.'
            : 'Monitor ticket activity and department performance in one place.'
        }
        actions={
          <div className="flex items-center gap-3">
            <RefreshButton
              onRefresh={() => analyticsQuery.refetch()}
              isRefreshing={analyticsQuery.isFetching}
              label="overview"
            />
            <ProfileChip />
          </div>
        }
      />

      {/* Navigation Tabs corresponding to preview (1).html & preview (2).html */}
      <div className="flex items-center gap-2 border-b border-[#e7ebf3] mb-6">
        <button
          onClick={() => {
            setTab('overview')
            setSelectedDeptId(null)
          }}
          className={`py-3 px-4 text-xs font-bold relative transition-colors ${
            tab === 'overview' && !selectedDept
              ? 'text-[#315fe8]'
              : 'text-[#687a96] hover:text-[#17243c]'
          }`}
        >
          Overview
          {tab === 'overview' && !selectedDept && (
            <span className="absolute bottom-[-1px] left-3 right-3 h-[3px] bg-[#315fe8] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => {
            setTab('tickets')
            setSelectedDeptId(null)
          }}
          className={`py-3 px-4 text-xs font-bold relative transition-colors ${
            tab === 'tickets'
              ? 'text-[#315fe8]'
              : 'text-[#687a96] hover:text-[#17243c]'
          }`}
        >
          All Tickets
          {tab === 'tickets' && (
            <span className="absolute bottom-[-1px] left-3 right-3 h-[3px] bg-[#315fe8] rounded-t-full" />
          )}
        </button>
      </div>

      {tab === 'overview' &&
        (analyticsQuery.isLoading ? (
          <div className="py-12">
            <LoadingState message="Loading Help & Support overview..." />
          </div>
        ) : analyticsQuery.isError || !analyticsQuery.data ? (
          <Card>
            <div className="py-10 text-center text-[#b91c1c]">
              <p className="text-sm font-semibold mb-3">Could not load the Help Center overview.</p>
              <Button variant="secondary" onClick={() => analyticsQuery.refetch()}>
                Try again
              </Button>
            </div>
          </Card>
        ) : selectedDept ? (
          // ── Department Drill-Down View corresponding to preview (2).html ──
          <div
            className={`transition-opacity ${isRefreshingAnalytics ? 'opacity-60 pointer-events-none' : ''}`}
            aria-busy={isRefreshingAnalytics}
          >
            <div className="mb-4">
              <button
                onClick={() => setSelectedDeptId(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#e7ebf3] bg-white text-xs font-bold text-[#3f4f6d] hover:bg-[#f8fafe] transition-colors shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> All departments
              </button>
            </div>

            <StatKPISection counts={selectedDept} />

            <TeamWorkloadSection dept={selectedDept} />

            <TicketsListSection
              departmentId={selectedDept.id}
              departments={departments}
              onViewTicket={setSelectedTicket}
            />
          </div>
        ) : (
          // ── Overall SuperAdmin Overview corresponding to preview (1).html ──
          <div
            className={`transition-opacity ${isRefreshingAnalytics ? 'opacity-60 pointer-events-none' : ''}`}
            aria-busy={isRefreshingAnalytics}
          >
            <StatKPISection counts={overall} />

            {departments.length === 0 ? (
              <div className="bg-white border border-[#e7ebf3] rounded-2xl p-12 text-center shadow-sm">
                <strong className="block text-base font-bold text-[#1e293b]">
                  No assigned tickets yet
                </strong>
                <span className="text-xs text-[#64748b] mt-1 block">
                  Department figures appear once tickets are assigned.
                </span>
              </div>
            ) : (
              <>
                <PerformanceAndOverview departments={departments} overall={overall} />

                <DepartmentComparisonTable
                  departments={departments}
                  attentionId={attentionDeptId}
                  onViewDepartment={(id) => setSelectedDeptId(id)}
                />
              </>
            )}
          </div>
        ))}

      {tab === 'tickets' && (
        <TicketsListSection departments={departments} onViewTicket={setSelectedTicket} />
      )}

      {/* Modern Ticket Details & Status History Modal from preview (3).html */}
      <TicketDetailsModal
        ticketNumber={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </PageLayout>
  )
}
