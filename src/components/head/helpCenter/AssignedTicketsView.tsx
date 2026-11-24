import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  RefreshCw,
  UserCheck,
  AlertCircle,
  X,
  Loader2,
  Ticket as TicketIcon,
  History,
  Clock,
  Activity,
  CheckCircle2,
  Phone,
  PhoneCall,
  Repeat,
  Layers,
  Eye,
  Mail,
  Building2,
  FileText,
  UserRound,
  Info,
  CalendarDays,
  Paperclip,
  ShieldCheck,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  EmployeeTicketWithCreator,
  TicketStatus,
  TicketPriority,
  AssignableUser,
} from '../../../features/departments/types/help-center.types'
import {
  updateTicketStatus,
  assignTickets,
  fetchAssignableDepartmentUsers,
} from '../../../api/help-center.api'
import { TicketStatusHistoryModal } from './TicketStatusHistoryModal'
import { CustomerTicketHistoryModal } from './CustomerTicketHistoryModal'
import { CallsHistoryModal } from './CallsHistoryModal'
import { useTicketCall } from './useTicketCall'
import { TicketAttachmentsView } from '../../customers-dashboard/TicketAttachmentsView'
import { fetchActiveStatuses } from '../../customers-dashboard/api/customer-features.api'
import { RefreshButton } from '../../ui/RefreshButton'

/** A ticket row, optionally tagged with who it is assigned to (All Tickets view). */
export type TicketWithAssignee = EmployeeTicketWithCreator & {
  assigneeEmail?: string | null
  assigneeName?: string | null
  /** Still with the department head — not given to a department user yet */
  isUnassigned?: boolean
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

/** Re-assign picker: show 6 members, load 6 more on scroll */
const USERS_PAGE = 6

interface AssignedTicketsViewProps {
  tickets: TicketWithAssignee[]
  email: string
  departmentType?: string
  isLoading: boolean
  isRefreshing?: boolean
  onRefresh: () => void
  onTicketUpdated?: () => void
  statusCounts?: Record<string, number>
  canViewHistory?: boolean
  /** Department Heads may view/reassign tickets but cannot change their status. */
  canUpdateStatus?: boolean
  /** Department Users may update their assigned tickets but cannot reassign them. */
  canReassignTickets?: boolean
  /** Only department users call customers; heads get no 📞 button. */
  canCall?: boolean
  /** Show "→ assignee" under the department (All Tickets view). */
  showAssignee?: boolean
  /** Text for the empty state when there are no tickets at all. */
  emptyText?: string
  /** Show "Assign all · Round robin" (defaults to canReassignTickets). */
  showRoundRobin?: boolean
  /** Optional note shown above the list. */
  introText?: string
}

const STATUS_TABS: { key: string; label: string; status?: TicketStatus }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open', status: 'OPEN' },
  { key: 'IN_PROGRESS', label: 'In Progress', status: 'IN_PROGRESS' },
  { key: 'WAITING_ON_CUSTOMER', label: 'Waiting On Customer', status: 'WAITING_ON_CUSTOMER' },
  { key: 'ESCALATED', label: 'Escalated', status: 'ESCALATED' },
  { key: 'RESOLVED', label: 'Resolved', status: 'RESOLVED' },
  { key: 'CLOSED', label: 'Closed', status: 'CLOSED' },
]

const ALL_STATUS_OPTIONS: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
]

const PRIORITY_OPTIONS: TicketPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const STATUS_DISPLAY_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_ON_CUSTOMER: 'Waiting On Customer',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

// Badge colours — new-smsf tokens (amber / blue / purple / rose / green / slate)
function getPriorityBadgeClass(priority?: TicketPriority) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-[#aa3655] text-white'
    case 'HIGH':
      return 'bg-[#fce8ed] text-[#aa3655]'
    case 'MEDIUM':
      return 'bg-[#fbf0d6] text-[#8b5f09]'
    case 'LOW':
    default:
      return 'bg-[#e6f5fc] text-[#0b6f9c]'
  }
}

function getStatusBadgeClass(status?: TicketStatus) {
  switch (status) {
    case 'OPEN':
      return 'bg-[#fbf0d6] text-[#8b5f09]'
    case 'IN_PROGRESS':
      return 'bg-[#e8f0fe] text-[#1550ad]'
    case 'WAITING_ON_CUSTOMER':
      return 'bg-[#f3e8ff] text-[#7e3bc9]'
    case 'ESCALATED':
      return 'bg-[#fce8ed] text-[#aa3655]'
    case 'RESOLVED':
      return 'bg-[#e0f6ec] text-[#127756]'
    case 'CLOSED':
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function formatPriority(priority?: TicketPriority) {
  if (!priority) return 'Low'
  return priority.charAt(0) + priority.slice(1).toLowerCase()
}

function formatStatus(status?: TicketStatus) {
  if (!status) return 'Open'
  return status
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

function formatFullDate(dateStr?: string | null) {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(d)
      .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase())
  } catch {
    return '—'
  }
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** "3 days 4 hrs" between two dates (to = now when not resolved) */
function formatDuration(from?: string | null, to?: string | null) {
  if (!from) return '—'
  const start = new Date(from).getTime()
  const end = to ? new Date(to).getTime() : Date.now()
  if (isNaN(start) || isNaN(end) || end < start) return '—'
  const mins = Math.floor((end - start) / 60000)
  const days = Math.floor(mins / 1440)
  const hrs = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}${hrs ? ` ${hrs} hr${hrs === 1 ? '' : 's'}` : ''}`
  if (hrs > 0) return `${hrs} hr${hrs === 1 ? '' : 's'}${m ? ` ${m} min` : ''}`
  return `${Math.max(m, 1)} min`
}

// ── Drawer building blocks ──
function DrawerSection({
  step,
  icon: Icon,
  title,
  tone,
  action,
  children,
}: {
  step: number
  icon: LucideIcon
  title: string
  tone: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-[#e6e9f0] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-[14px] font-bold text-slate-900">
            <span className="mr-1 text-slate-400">{step}.</span>
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function DetailRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
      <dt className="flex flex-shrink-0 items-center gap-2 text-[13px] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {label}
      </dt>
      <dd className="min-w-0 text-right text-[13px] font-semibold text-slate-800">{children}</dd>
    </div>
  )
}

function InfoTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[#e6e9f0] bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 break-words text-[13px] font-semibold text-slate-800">{children}</div>
    </div>
  )
}

function hasOtherTickets(t: EmployeeTicketWithCreator) {
  return Boolean(t.creatorId) && (t.hasMultipleTickets || (t.previousTicketCount ?? 0) > 0)
}

const ICON_BTN =
  'grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] border border-[#e2e6ee] bg-white text-slate-500 transition-colors hover:border-[#c7d6fb] hover:bg-[#eaf0ff] hover:text-[#2459e0] disabled:opacity-60'
const CALL_BTN =
  'grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] border border-[#b9e8d2] bg-[#e0f6ec] text-[#127756] transition-colors hover:bg-[#cdf0df] disabled:opacity-60'
const BTN =
  'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#e2e6ee] bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60'
const BTN_PRIMARY =
  'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#2459e0] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a45b8] disabled:opacity-60'

export function AssignedTicketsView({
  tickets,
  departmentType,
  isLoading,
  isRefreshing,
  onRefresh,
  onTicketUpdated,
  statusCounts: externalStatusCounts,
  canViewHistory = true,
  canUpdateStatus = true,
  canReassignTickets = true,
  canCall = true,
  showAssignee = false,
  emptyText = 'No tickets are assigned to you yet.',
  showRoundRobin,
  introText,
}: AssignedTicketsViewProps) {
  const roundRobinVisible = showRoundRobin ?? canReassignTickets
  const [activeTab, setActiveTabState] = useState('ALL')
  const [searchQuery, setSearchQueryState] = useState('')
  const [priorityFilter, setPriorityFilterState] = useState<TicketPriority | ''>('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(10)

  // Any filter change goes back to page 1
  function setActiveTab(tab: string) {
    setActiveTabState(tab)
    setPage(0)
  }
  function setSearchQuery(q: string) {
    setSearchQueryState(q)
    setPage(0)
  }
  function setPriorityFilter(p: TicketPriority | '') {
    setPriorityFilterState(p)
    setPage(0)
  }
  /** Ticket open in the details drawer (null = drawer closed) */
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null)
  // Calls View: null = closed; otherwise the filters it opens with
  const [callsView, setCallsView] = useState<{ ticketNumber?: string; customer?: string } | null>(null)

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<TicketStatus>('OPEN')
  const [statusRemark, setStatusRemark] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [activeStatusesList, setActiveStatusesList] = useState<string[] | null>(null)

  useEffect(() => {
    let active = true
    fetchActiveStatuses()
      .then((list) => {
        if (active && list && list.length > 0) {
          setActiveStatusesList(list.map((s) => s.code.toUpperCase()))
        }
      })
      .catch((err) => {
        console.warn('Could not load active statuses in AssignedTicketsView:', err)
      })
    return () => {
      active = false
    }
  }, [])

  const effectiveStatusOptions = useMemo(() => {
    if (!activeStatusesList || activeStatusesList.length === 0) return ALL_STATUS_OPTIONS
    const set = new Set(activeStatusesList)
    return ALL_STATUS_OPTIONS.filter((s) => set.has(s))
  }, [activeStatusesList])

  // History modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyTicketNumber, setHistoryTicketNumber] = useState<string>('')
  const [historyCurrentStatus, setHistoryCurrentStatus] = useState<string | undefined>(undefined)

  function handleOpenHistoryModal(ticketNumber: string, status?: string) {
    setHistoryTicketNumber(ticketNumber)
    setHistoryCurrentStatus(status)
    setIsHistoryModalOpen(true)
  }

  const [isCustomerHistoryModalOpen, setIsCustomerHistoryModalOpen] = useState(false)
  const [customerHistoryTarget, setCustomerHistoryTarget] = useState<{
    creatorId: number
    creatorName?: string | null
    creatorEmail?: string | null
    creatorPhone?: string | null
    currentTicketNumber?: string
  } | null>(null)

  function handleOpenCustomerHistoryModal(ticket: EmployeeTicketWithCreator) {
    if (!ticket.creatorId) return
    setCustomerHistoryTarget({
      creatorId: ticket.creatorId,
      creatorName: ticket.creatorName,
      creatorEmail: ticket.creatorEmail,
      creatorPhone: ticket.creatorPhone,
      currentTicketNumber: ticket.ticketNumber,
    })
    setIsCustomerHistoryModalOpen(true)
  }

  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [targetAssigneeEmail, setTargetAssigneeEmail] = useState('')
  const [isReassigning, setIsReassigning] = useState(false)
  const [reassignError, setReassignError] = useState<string | null>(null)

  const [isAssignAllModalOpen, setIsAssignAllModalOpen] = useState(false)
  const [isAssigningAll, setIsAssigningAll] = useState(false)
  const [assignAllError, setAssignAllError] = useState<string | null>(null)

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  // Bumped by the refresh icon in the re-assign / assign-all modals to re-run the users load
  const [usersReloadKey, setUsersReloadKey] = useState(0)

  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [visibleUsersCount, setVisibleUsersCount] = useState(8)

  /** Ticket being re-assigned (row action or drawer footer) */
  const [reassignTicketNumber, setReassignTicketNumber] = useState<string | null>(null)

  function openReassignModal(ticketNumber: string) {
    setReassignTicketNumber(ticketNumber)
    setReassignError(null)
    setUserSearchQuery('')
    setVisibleUsersCount(USERS_PAGE)
    setIsReassignModalOpen(true)
  }

  // Fetch assignable users for re-assignment / round robin (only for Heads/Admins who can reassign)
  useEffect(() => {
    if (!canReassignTickets) {
      return
    }

    let cancelled = false
    async function loadUsers() {
      setIsLoadingUsers(true)
      try {
        // Refresh icon in the modals (usersReloadKey > 0) forces a fresh list
        const users = await fetchAssignableDepartmentUsers(departmentType, { force: usersReloadKey > 0 })
        if (!cancelled) {
          setAssignableUsers(users)
          if (users.length > 0 && !targetAssigneeEmail) {
            setTargetAssigneeEmail(users[0].email)
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoadingUsers(false)
      }
    }
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [canReassignTickets, departmentType, usersReloadKey])

  // Tickets after search + priority (status tabs count from this)
  const searchedTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return tickets.filter((t) => {
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (!q) return true
      return [
        t.ticketNumber,
        t.subject,
        t.creatorName,
        t.creatorEmail,
        t.creatorPhone,
        t.businessName,
        t.departmentName,
        t.assigneeName,
        t.assigneeEmail,
      ].some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [tickets, searchQuery, priorityFilter])

  const isFiltering = Boolean(searchQuery.trim() || priorityFilter)

  // Compute status counts
  const computedStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: searchedTickets.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_ON_CUSTOMER: 0,
      ESCALATED: 0,
      RESOLVED: 0,
      CLOSED: 0,
    }
    searchedTickets.forEach((t) => {
      const s = t.ticketStatus?.toUpperCase()
      if (s && counts[s] !== undefined) {
        counts[s] += 1
      }
    })
    return counts
  }, [searchedTickets])

  // Server-side counts are only correct while nothing is filtered on the client
  const statusCounts =
    externalStatusCounts && !isFiltering
      ? {
          ALL: externalStatusCounts.ALL ?? computedStatusCounts.ALL,
          OPEN: externalStatusCounts.OPEN ?? computedStatusCounts.OPEN,
          IN_PROGRESS: externalStatusCounts.IN_PROGRESS ?? computedStatusCounts.IN_PROGRESS,
          WAITING_ON_CUSTOMER:
            externalStatusCounts.WAITING_ON_CUSTOMER ?? computedStatusCounts.WAITING_ON_CUSTOMER,
          ESCALATED: externalStatusCounts.ESCALATED ?? computedStatusCounts.ESCALATED,
          RESOLVED: externalStatusCounts.RESOLVED ?? computedStatusCounts.RESOLVED,
          CLOSED: externalStatusCounts.CLOSED ?? computedStatusCounts.CLOSED,
        }
      : computedStatusCounts

  const visibleStatusTabs = useMemo(() => {
    if (!activeStatusesList || activeStatusesList.length === 0) return STATUS_TABS
    const set = new Set(activeStatusesList)
    return STATUS_TABS.filter((tab) => tab.key === 'ALL' || (tab.status && set.has(tab.status)) || (statusCounts[tab.key] ?? 0) > 0)
  }, [activeStatusesList, statusCounts])

  const filteredTickets = useMemo(
    () =>
      activeTab === 'ALL'
        ? searchedTickets
        : searchedTickets.filter((t) => (t.ticketStatus?.toUpperCase() || '') === activeTab),
    [searchedTickets, activeTab]
  )

  // Pagination (client side — the list is already loaded)
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const pageStart = currentPage * pageSize
  const pagedTickets = filteredTickets.slice(pageStart, pageStart + pageSize)
  const pageNumbers = useMemo(() => {
    const pages: (number | '…')[] = []
    for (let i = 0; i < totalPages; i++) {
      if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) pages.push(i)
      else if (pages[pages.length - 1] !== '…') pages.push('…')
    }
    return pages
  }, [totalPages, currentPage])

  // Ticket open in the drawer (from the full list so filters never close it)
  const selectedTicket = useMemo(
    () => (selectedTicketNumber ? tickets.find((t) => t.ticketNumber === selectedTicketNumber) ?? null : null),
    [tickets, selectedTicketNumber]
  )

  /** Ticket in the "Update status" popup (separate from the drawer) */
  const [statusTicketNumber, setStatusTicketNumber] = useState<string | null>(null)
  const statusTicket = useMemo(
    () => (statusTicketNumber ? tickets.find((t) => t.ticketNumber === statusTicketNumber) ?? null : null),
    [tickets, statusTicketNumber]
  )

  // Click-to-call → tagged TICKET so the recording lands on this ticket
  const ticketCall = useTicketCall({
    ticketNumber: selectedTicket?.ticketNumber ?? '',
    customerPhone: selectedTicket?.creatorPhone,
    customerId: selectedTicket?.smsbCustomerId ?? null,
    customerName: selectedTicket?.businessName || selectedTicket?.creatorName,
    departmentType,
  })

  const reassignTicket = useMemo(
    () => (reassignTicketNumber ? tickets.find((t) => t.ticketNumber === reassignTicketNumber) ?? null : null),
    [tickets, reassignTicketNumber]
  )

  const anyModalOpen =
    isStatusModalOpen ||
    isReassignModalOpen ||
    isAssignAllModalOpen ||
    isHistoryModalOpen ||
    isCustomerHistoryModalOpen ||
    Boolean(callsView)

  // Esc closes the drawer (modals handle their own Esc)
  useEffect(() => {
    if (!selectedTicketNumber || anyModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTicketNumber(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedTicketNumber, anyModalOpen])

  // Open "Update status" (from the drawer, or from a status badge in the table).
  // It has its own ticket, so opening it never opens the details drawer.
  function handleOpenStatusModal(ticket?: TicketWithAssignee) {
    const target = ticket ?? selectedTicket
    if (!target || !canUpdateStatus) return
    setStatusTicketNumber(target.ticketNumber)
    const curStatus = (target.ticketStatus || 'OPEN') as TicketStatus
    const curIndex = effectiveStatusOptions.indexOf(curStatus)
    const nextOptions = curIndex < 0 ? effectiveStatusOptions : effectiveStatusOptions.slice(curIndex + 1)

    setNewStatus(nextOptions.length > 0 ? nextOptions[0] : curStatus)
    setStatusRemark('')
    setStatusError(null)
    setIsStatusModalOpen(true)
  }

  // Handle status update submission
  async function handleUpdateStatusSubmit() {
    if (!statusTicket || !canUpdateStatus) return
    if (!statusRemark.trim()) {
      setStatusError('Remark is required by backend.')
      return
    }

    setIsUpdatingStatus(true)
    setStatusError(null)
    try {
      await updateTicketStatus(statusTicket.ticketNumber, newStatus, statusRemark.trim())
      setIsStatusModalOpen(false)
      onTicketUpdated?.()
    } catch (err: unknown) {
      let msg = 'Failed to update ticket status'
      if (err instanceof Error && err.message) {
        msg = err.message
        // If error message is JSON string, extract message field
        try {
          const parsed = JSON.parse(msg)
          if (parsed?.message) msg = parsed.message
        } catch {
          // not JSON
        }
      }
      setStatusError(msg)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle single ticket re-assign
  async function handleReassignSubmit() {
    if (!canReassignTickets || !reassignTicket || !targetAssigneeEmail) return
    setIsReassigning(true)
    setReassignError(null)
    try {
      await assignTickets([
        {
          ticketNumber: reassignTicket.ticketNumber,
          email: targetAssigneeEmail,
        },
      ])
      setIsReassignModalOpen(false)
      onTicketUpdated?.()
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : 'Failed to re-assign ticket')
    } finally {
      setIsReassigning(false)
    }
  }

  // Handle Assign All (Round-Robin distribution across assignable users)
  async function handleAssignAllSubmit() {
    if (!canReassignTickets) return
    if (assignableUsers.length === 0) {
      setAssignAllError('No department members available to assign.')
      return
    }

    // Filter tickets that are not resolved or closed
    const pendingTickets = tickets.filter(
      (t) => t.ticketStatus !== 'RESOLVED' && t.ticketStatus !== 'CLOSED'
    )

    if (pendingTickets.length === 0) {
      setAssignAllError('No pending tickets to assign.')
      return
    }

    setIsAssigningAll(true)
    setAssignAllError(null)

    try {
      const assignments = pendingTickets.map((t, idx) => ({
        ticketNumber: t.ticketNumber,
        email: assignableUsers[idx % assignableUsers.length].email,
      }))

      await assignTickets(assignments)
      setIsAssignAllModalOpen(false)
      onTicketUpdated?.()
    } catch (err) {
      setAssignAllError(err instanceof Error ? err.message : 'Failed to assign all tickets')
    } finally {
      setIsAssigningAll(false)
    }
  }

  const resolvedCount = (statusCounts.RESOLVED ?? 0) + (statusCounts.CLOSED ?? 0)
  const summaryCards = [
    { key: 'ALL', label: 'Total tickets', value: statusCounts.ALL ?? 0, icon: TicketIcon, tone: 'bg-[#eaf0ff] text-[#2459e0]' },
    { key: 'OPEN', label: 'Open', value: statusCounts.OPEN ?? 0, icon: Clock, tone: 'bg-[#fbf0d6] text-[#8b5f09]' },
    { key: 'IN_PROGRESS', label: 'In progress', value: statusCounts.IN_PROGRESS ?? 0, icon: Activity, tone: 'bg-[#e8f0fe] text-[#1550ad]' },
    { key: 'RESOLVED', label: 'Resolved', value: resolvedCount, icon: CheckCircle2, tone: 'bg-[#e0f6ec] text-[#127756]' },
  ]

  /**
   * Ticket status badge. For department users it's a button that opens
   * "Update status"; heads (who can't change status) see a plain badge.
   */
  function renderStatusBadge(t: TicketWithAssignee, size = 'text-xs px-2.5') {
    const cls = `inline-flex items-center gap-1 whitespace-nowrap rounded-full py-0.5 font-semibold ${size} ${getStatusBadgeClass(t.ticketStatus)}`
    if (!canUpdateStatus) return <span className={cls}>{formatStatus(t.ticketStatus)}</span>
    return (
      <button
        type="button"
        title="Click to update status"
        aria-label={`Update status of ${t.ticketNumber} (currently ${formatStatus(t.ticketStatus)})`}
        onClick={(e) => {
          e.stopPropagation()
          handleOpenStatusModal(t)
        }}
        className={`${cls} cursor-pointer ring-1 ring-inset ring-current/20 transition hover:ring-current/50 hover:brightness-95`}
      >
        {formatStatus(t.ticketStatus)}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
    )
  }

  // ── Row pieces shared by the desktop table and the mobile cards ──
  function renderDepartmentCell(t: TicketWithAssignee) {
    return (
      <>
        <div className="break-words text-xs font-semibold text-slate-700">{t.departmentName || departmentType || '—'}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPriorityBadgeClass(t.priority)}`}>
            {formatPriority(t.priority)}
          </span>
          {renderStatusBadge(t, 'text-[11px] px-2')}
        </div>
        {showAssignee &&
          (t.isUnassigned ? (
            <span className="mt-1.5 inline-block whitespace-nowrap rounded-full bg-[#fbf0d6] px-2 py-0.5 text-[11px] font-semibold text-[#8b5f09]">
              Not assigned yet
            </span>
          ) : (
            <div className="mt-1.5 truncate text-[11px] text-slate-500" title={t.assigneeEmail || undefined}>
              → {t.assigneeName || t.assigneeEmail || 'Unassigned'}
            </div>
          ))}
      </>
    )
  }

  function callTicket(t: EmployeeTicketWithCreator) {
    ticketCall.call({
      ticketNumber: t.ticketNumber,
      customerPhone: t.creatorPhone,
      customerId: t.smsbCustomerId ?? null,
      customerName: t.businessName || t.creatorName,
      departmentType,
    })
  }

  // Contact cell: phone + email, with click-to-call for department users
  function renderContact(t: TicketWithAssignee, mobile = false) {
    const callingThis = ticketCall.callingTicket === t.ticketNumber
    return (
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className={`${mobile ? '' : 'truncate'} font-semibold text-slate-800`}>{t.creatorPhone || '—'}</div>
          <div className={`mt-0.5 ${mobile ? 'break-all' : 'truncate'} text-[11px] text-slate-500`}>{t.creatorEmail || '—'}</div>
        </div>
        {canCall && t.creatorPhone && (
          <button
            type="button"
            className={CALL_BTN}
            title={`Call ${t.creatorPhone} (recording is saved on this ticket)`}
            aria-label={`Call ${t.creatorName || 'customer'}`}
            disabled={ticketCall.isCalling}
            onClick={(e) => {
              e.stopPropagation()
              callTicket(t)
            }}
          >
            {callingThis ? <Loader2 className="h-[15px] w-[15px] animate-spin" /> : <Phone className="h-[15px] w-[15px]" />}
          </button>
        )}
      </div>
    )
  }

  // Row actions
  function renderActions(t: TicketWithAssignee) {
    return (
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={ICON_BTN}
          title="View details"
          aria-label={`View ${t.ticketNumber}`}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedTicketNumber(t.ticketNumber)
          }}
        >
          <Eye className="h-[15px] w-[15px]" />
        </button>
        {canReassignTickets && (
          <button
            type="button"
            className={ICON_BTN}
            title="Re-assign"
            aria-label={`Re-assign ${t.ticketNumber}`}
            onClick={(e) => {
              e.stopPropagation()
              openReassignModal(t.ticketNumber)
            }}
          >
            <UserCheck className="h-[15px] w-[15px]" />
          </button>
        )}
        {hasOtherTickets(t) && (
          <button
            type="button"
            className="whitespace-nowrap rounded-[7px] border border-[#c7d6fb] bg-[#eaf0ff] px-2 py-1 text-[11px] font-semibold text-[#2459e0] transition-colors hover:bg-[#dbe6ff]"
            title="Customer's other tickets in this department"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenCustomerHistoryModal(t)
            }}
          >
            View All{t.previousTicketCount ? ` (${t.previousTicketCount})` : ''}
          </button>
        )}
      </div>
    )
  }

  const emptyMessage = searchQuery.trim()
    ? `No tickets matching "${searchQuery.trim()}".`
    : tickets.length === 0
      ? emptyText
      : 'There are no tickets matching these filters.'

  return (
    <div className="space-y-4">
      {/* ── Call result banner ── */}
      {ticketCall.message && !selectedTicket && (
        <div
          className={`flex items-start justify-between gap-2 rounded-[10px] border px-3.5 py-2.5 text-xs font-medium ${
            ticketCall.message.type === 'success'
              ? 'border-[#b9e8d2] bg-[#e0f6ec] text-[#127756]'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <span>{ticketCall.message.text}</span>
          <button type="button" onClick={ticketCall.clearMessage} aria-label="Dismiss" className="flex-shrink-0 opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {introText && (
        <div className="rounded-[10px] border border-[#c7d6fb] bg-[#eaf0ff] px-3.5 py-2.5 text-xs font-medium text-[#1a45b8]">
          {introText}
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const CardIcon = card.icon
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveTab(card.key)}
              className={`flex items-center gap-3.5 rounded-2xl border bg-white p-4 text-left transition-all ${
                activeTab === card.key
                  ? 'border-[#93b4fb] shadow-[0_1px_3px_rgba(36,89,224,0.12)]'
                  : 'border-[#e6e9f0] hover:border-slate-300'
              }`}
            >
              <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
                <CardIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-bold leading-none text-slate-900">
                  {isLoading && tickets.length === 0 ? '–' : card.value}
                </span>
                <span className="mt-1 block text-xs text-slate-500">{card.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Tickets panel ── */}
      <div className="overflow-hidden rounded-2xl border border-[#e6e9f0] bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e6e9f0] px-3.5 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket, customer, business or contact"
              aria-label="Search tickets"
              className="h-9 w-full rounded-[10px] border border-[#e2e6ee] bg-white pl-9 pr-8 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#2459e0] focus:outline-none focus:ring-[3px] focus:ring-[#2459e0]/15"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
            aria-label="Filter priority"
            className="h-9 rounded-[10px] border border-[#e2e6ee] bg-white px-3 text-xs font-medium text-slate-700 focus:border-[#2459e0] focus:outline-none"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {formatPriority(p)}
              </option>
            ))}
          </select>

          <button type="button" onClick={onRefresh} disabled={isLoading || isRefreshing} title="Refresh tickets" className={BTN}>
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canReassignTickets && roundRobinVisible && (
            <button
              type="button"
              onClick={() => {
                setAssignAllError(null)
                setIsAssignAllModalOpen(true)
              }}
              disabled={isLoading || tickets.length === 0}
              title="Distribute open tickets across department members"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#b9e8d2] bg-[#e0f6ec] px-3.5 text-xs font-semibold text-[#127756] transition-colors hover:bg-[#cdf0df] disabled:opacity-60"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Assign all · Round robin</span>
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-[#e6e9f0] px-3.5 py-2">
          {visibleStatusTabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive ? 'bg-[#2459e0] text-white shadow-[0_1px_2px_rgba(36,89,224,0.25)]' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {statusCounts[tab.key] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        {/* Body */}
        {isLoading && tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#2459e0]" />
            <p className="text-sm font-medium text-slate-700">Loading tickets…</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <TicketIcon className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900">No tickets found</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">{emptyMessage}</p>
            {isFiltering && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setPriorityFilter('')
                }}
                className="mt-3 text-xs font-medium text-[#2459e0] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={`transition-opacity ${isRefreshing ? 'opacity-60' : ''}`}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] table-fixed border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
                    <th className="w-[6%] px-3.5 py-3">S. No.</th>
                    <th className="w-[23%] px-3.5 py-3">Tickets</th>
                    <th className="w-[16%] px-3.5 py-3">Customer</th>
                    <th className="w-[18%] px-3.5 py-3">Contact</th>
                    <th className="w-[16%] px-3.5 py-3">Department</th>
                    <th className="w-[21%] px-3.5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedTickets.map((t, idx) => (
                    <tr
                      key={t.ticketNumber}
                      onClick={() => setSelectedTicketNumber(t.ticketNumber)}
                      className={`group cursor-pointer border-t border-slate-100 align-middle transition-colors hover:bg-[#f8faff] ${
                        selectedTicketNumber === t.ticketNumber ? 'bg-[#f1f5ff]' : ''
                      }`}
                    >
                      <td className="px-3.5 py-3 text-xs font-semibold text-slate-400">{pageStart + idx + 1}</td>
                      <td className="px-3.5 py-3">
                        <div className="break-all font-mono text-[11.5px] font-bold text-[#2459e0] group-hover:underline">{t.ticketNumber}</div>
                        <div className="mt-1 text-[13px] font-semibold leading-snug text-slate-900">{t.subject || 'No Subject'}</div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="truncate font-semibold text-slate-800">{t.creatorName || 'Customer'}</div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">{t.businessName || '—'}</div>
                      </td>
                      <td className="px-3.5 py-3">{renderContact(t)}</td>
                      <td className="px-3.5 py-3">{renderDepartmentCell(t)}</td>
                      <td className="px-3.5 py-3">
                        {renderActions(t)}
                        <div className="mt-1.5 text-[11px] text-slate-400">{formatFullDate(t.ticketCreatedAt)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {pagedTickets.map((t, idx) => (
                <div
                  key={t.ticketNumber}
                  onClick={() => setSelectedTicketNumber(t.ticketNumber)}
                  className={`cursor-pointer space-y-2 px-3.5 py-3 transition-colors hover:bg-slate-50 ${
                    selectedTicketNumber === t.ticketNumber ? 'bg-[#f1f5ff]' : ''
                  }`}
                >
                  {[
                    {
                      label: 'S. No.',
                      body: <span className="text-xs font-semibold text-slate-500">{pageStart + idx + 1}</span>,
                    },
                    {
                      label: 'Tickets',
                      body: (
                        <>
                          <div className="break-all font-mono text-[11.5px] font-bold text-[#2459e0]">{t.ticketNumber}</div>
                          <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{t.subject || 'No Subject'}</div>
                        </>
                      ),
                    },
                    {
                      label: 'Customer',
                      body: (
                        <>
                          <div className="font-semibold text-slate-800">{t.creatorName || 'Customer'}</div>
                          <div className="text-[11px] text-slate-500">{t.businessName || '—'}</div>
                        </>
                      ),
                    },
                    {
                      label: 'Contact',
                      body: renderContact(t, true),
                    },
                    { label: 'Department', body: renderDepartmentCell(t) },
                    {
                      label: 'Action',
                      body: (
                        <>
                          {renderActions(t)}
                          <div className="mt-1.5 text-[11px] text-slate-400">{formatFullDate(t.ticketCreatedAt)}</div>
                        </>
                      ),
                    },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                      <span className="pt-0.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-400">{row.label}</span>
                      <div className="min-w-0">{row.body}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e9f0] px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              {filteredTickets.length === 0
                ? 'No tickets'
                : `Showing ${pageStart + 1}–${pageStart + pagedTickets.length} of ${filteredTickets.length}`}
              {filteredTickets.length !== tickets.length ? ` (filtered from ${tickets.length})` : ''}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
              aria-label="Rows per page"
              className="h-7 rounded-lg border border-[#e2e6ee] bg-white px-1.5 text-[11px] font-medium text-slate-700 focus:border-[#2459e0] focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="h-8 rounded-lg border border-[#e2e6ee] bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Prev
              </button>
              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === currentPage ? 'page' : undefined}
                    className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors ${
                      p === currentPage
                        ? 'bg-[#2459e0] text-white'
                        : 'border border-[#e2e6ee] bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="h-8 rounded-lg border border-[#e2e6ee] bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* ── Ticket details drawer ── */}
      {selectedTicket && (
        <>
          <div className="fixed inset-0 z-[45] bg-slate-900/55" onClick={() => setSelectedTicketNumber(null)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Ticket details"
            className="fixed bottom-0 right-0 top-0 z-[46] flex w-full max-w-[560px] flex-col bg-white shadow-[-15px_0_45px_rgba(15,23,42,0.14)] animate-in slide-in-from-right duration-200"
          >
            {/* Header */}
            <div className="border-b border-[#e6e9f0] px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10.5px] font-bold tracking-[0.08em] text-slate-400">TICKET DETAILS</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCallsView({ ticketNumber: selectedTicket.ticketNumber })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#c7d6fb] bg-[#eaf0ff] px-2.5 py-1 text-xs font-semibold text-[#2459e0] transition hover:bg-[#dbe6ff]"
                    title={`Call history for ${selectedTicket.ticketNumber}`}
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Call History</span>
                  </button>
                  {canViewHistory && (
                    <button
                      type="button"
                      onClick={() => handleOpenHistoryModal(selectedTicket.ticketNumber, selectedTicket.ticketStatus)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
                      title={`Status history for ${selectedTicket.ticketNumber}`}
                    >
                      <History className="h-3.5 w-3.5 text-slate-500" />
                      <span>History</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedTicketNumber(null)}
                    aria-label="Close details"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[#e6e9f0] text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h2 className="mb-2.5 mt-3 text-xl font-bold leading-snug text-slate-900">{selectedTicket.subject || 'No Subject'}</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11.5px] font-bold text-[#2459e0]">{selectedTicket.ticketNumber}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                  {formatPriority(selectedTicket.priority)} priority
                </span>
                {renderStatusBadge(selectedTicket, 'text-[11px] px-2')}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4 sm:px-5">
              {ticketCall.message && (
                <div
                  className={`flex items-start justify-between gap-2 rounded-[10px] border px-3 py-2 text-xs ${
                    ticketCall.message.type === 'success'
                      ? 'border-[#b9e8d2] bg-[#e0f6ec] text-[#127756]'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  <span>{ticketCall.message.text}</span>
                  <button type="button" onClick={ticketCall.clearMessage} aria-label="Dismiss" className="flex-shrink-0 opacity-70 hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* 1. Reported Issue */}
              <DrawerSection step={1} icon={FileText} title="Reported Issue" tone="bg-[#eaf0ff] text-[#2459e0]">
                <div className="whitespace-pre-wrap rounded-[10px] bg-slate-50 px-4 py-3 text-[14px] leading-relaxed text-slate-800">
                  {selectedTicket.description?.trim() || 'No description provided.'}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Reported by <span className="font-semibold text-slate-700">{selectedTicket.creatorName || selectedTicket.creatorEmail || 'Customer'}</span>
                  {' · '}
                  {formatFullDate(selectedTicket.ticketCreatedAt)}
                </p>
              </DrawerSection>

              {/* 2. Customer & Contact */}
              <DrawerSection
                step={2}
                icon={UserRound}
                title="Customer & Contact"
                tone="bg-[#fbf0d6] text-[#8b5f09]"
                action={
                  hasOtherTickets(selectedTicket) ? (
                    <button
                      type="button"
                      onClick={() => handleOpenCustomerHistoryModal(selectedTicket)}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-[7px] border border-[#c7d6fb] bg-[#eaf0ff] px-2 py-1 text-xs font-semibold text-[#2459e0] hover:bg-[#dbe6ff]"
                      title="Customer's other tickets in this department"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      View All{selectedTicket.previousTicketCount ? ` (${selectedTicket.previousTicketCount})` : ''}
                    </button>
                  ) : undefined
                }
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#fbf0d6] text-lg font-bold text-[#8b5f09]">
                    {(selectedTicket.creatorName || selectedTicket.creatorEmail || 'C').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-slate-900">{selectedTicket.creatorName || 'Customer'}</p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-slate-500">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      {selectedTicket.businessName || 'No business name'}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 divide-y divide-slate-100 rounded-[10px] border border-[#e6e9f0]">
                  <DetailRow icon={Phone} label="Mobile">
                    {selectedTicket.creatorPhone ? (
                      <a href={`tel:${selectedTicket.creatorPhone}`} className="font-semibold text-slate-800 hover:text-[#2459e0]">
                        {selectedTicket.creatorPhone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                  <DetailRow icon={Mail} label="Email">
                    {selectedTicket.creatorEmail ? (
                      <a href={`mailto:${selectedTicket.creatorEmail}`} className="break-all font-semibold text-slate-800 hover:text-[#2459e0]">
                        {selectedTicket.creatorEmail}
                      </a>
                    ) : (
                      '—'
                    )}
                  </DetailRow>
                </dl>
                <p className="mt-2 text-xs text-slate-400">
                  {canCall
                    ? 'To call this customer, use the 📞 button in the Contact column.'
                    : 'Only department users can call customers.'}
                </p>
              </DrawerSection>

              {/* 3. Ticket Information */}
              <DrawerSection step={3} icon={Info} title="Ticket Information" tone="bg-[#e8f0fe] text-[#1550ad]">
                <div className="grid grid-cols-2 gap-2.5">
                  <InfoTile label="Department">{selectedTicket.departmentName || departmentType || '—'}</InfoTile>
                  <InfoTile label="Creator status">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        String(selectedTicket.creatorStatus || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'text-[#127756]' : 'text-slate-600'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          String(selectedTicket.creatorStatus || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'bg-[#1fae72]' : 'bg-slate-400'
                        }`}
                      />
                      {titleCase(selectedTicket.creatorStatus || 'ACTIVE')}
                    </span>
                  </InfoTile>
                  <InfoTile label="Priority">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                      {formatPriority(selectedTicket.priority)}
                    </span>
                  </InfoTile>
                  <InfoTile label="Ticket status">{renderStatusBadge(selectedTicket)}</InfoTile>
                  {showAssignee && (
                    <div className="col-span-2">
                      <InfoTile label="Assigned to">
                        {selectedTicket.isUnassigned ? (
                          <span className="text-[#8b5f09]">Not assigned yet</span>
                        ) : (
                          selectedTicket.assigneeName || selectedTicket.assigneeEmail || '—'
                        )}
                      </InfoTile>
                    </div>
                  )}
                </div>
              </DrawerSection>

              {/* 4. Dates */}
              <DrawerSection step={4} icon={CalendarDays} title="Dates" tone="bg-[#f3e8ff] text-[#7e3bc9]">
                <dl className="divide-y divide-slate-100 rounded-[10px] border border-[#e6e9f0]">
                  <DetailRow icon={Clock} label="Created">
                    {formatFullDate(selectedTicket.ticketCreatedAt)}
                  </DetailRow>
                  <DetailRow icon={RefreshCw} label="Last updated">
                    {selectedTicket.ticketUpdatedAt ? formatFullDate(selectedTicket.ticketUpdatedAt) : 'Not updated yet'}
                  </DetailRow>
                  <DetailRow icon={CheckCircle2} label="Resolved">
                    {selectedTicket.ticketResolvedAt ? (
                      <span className="text-[#127756]">{formatFullDate(selectedTicket.ticketResolvedAt)}</span>
                    ) : (
                      <span className="font-medium text-slate-400">Not resolved yet</span>
                    )}
                  </DetailRow>
                  <DetailRow icon={Activity} label={selectedTicket.ticketResolvedAt ? 'Time taken' : 'Open for'}>
                    {formatDuration(selectedTicket.ticketCreatedAt, selectedTicket.ticketResolvedAt)}
                  </DetailRow>
                </dl>
              </DrawerSection>

              {/* 5. Attachments */}
              <DrawerSection
                step={5}
                icon={Paperclip}
                title="Attachments"
                tone="bg-[#e0f6ec] text-[#127756]"
                action={
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {selectedTicket.attachments?.length ?? 0}
                  </span>
                }
              >
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 ? (
                  <TicketAttachmentsView attachments={selectedTicket.attachments} />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                    <Paperclip className="mb-1.5 h-5 w-5 text-slate-300" />
                    <p className="text-[13px] font-semibold text-slate-600">No attachments</p>
                    <p className="mt-0.5 text-xs text-slate-400">The customer didn't add any files to this ticket.</p>
                  </div>
                )}
              </DrawerSection>

              {/* 6. Update Status */}
              <DrawerSection step={6} icon={ShieldCheck} title="Update Status" tone="bg-slate-100 text-slate-600">
                {canUpdateStatus ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Current status</p>
                      <div className="mt-1">{renderStatusBadge(selectedTicket)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCallsView({ ticketNumber: selectedTicket.ticketNumber })}
                        className={BTN}
                        title={`Call history for ${selectedTicket.ticketNumber}`}
                      >
                        <PhoneCall className="h-3.5 w-3.5 text-slate-500" />
                        <span>Call History</span>
                      </button>
                      {canViewHistory && (
                        <button
                          type="button"
                          onClick={() => handleOpenHistoryModal(selectedTicket.ticketNumber, selectedTicket.ticketStatus)}
                          className={BTN}
                          title={`Status history for ${selectedTicket.ticketNumber}`}
                        >
                          <History className="h-3.5 w-3.5 text-slate-500" />
                          <span>History</span>
                        </button>
                      )}
                      <button type="button" onClick={() => handleOpenStatusModal()} className={BTN_PRIMARY}>
                        Update status
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[13px] font-semibold text-slate-700">You can't change the status</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Department heads can't change ticket status. Re-assign the ticket to a department user instead.
                      </p>
                    </div>
                  </div>
                )}
              </DrawerSection>
            </div>


          </aside>
        </>
      )}

      {/* ── Modal: Update Status ── */}
      {isStatusModalOpen && statusTicket && (() => {
        const curStatus = (statusTicket.ticketStatus || 'OPEN') as TicketStatus
        const curIndex = effectiveStatusOptions.indexOf(curStatus)
        const availableNextStatuses = curIndex < 0 ? effectiveStatusOptions : effectiveStatusOptions.slice(curIndex + 1)
        const isTicketClosed = curStatus === 'CLOSED' || availableNextStatuses.length === 0

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Update Ticket Status</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-semibold font-mono text-slate-600">
                      {statusTicket.ticketNumber}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      Current: {STATUS_DISPLAY_LABELS[curStatus] || curStatus}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 py-5">
                {statusError && (
                  <div className="flex items-start gap-2.5 p-3.5 text-sm bg-red-50 text-red-700 rounded-xl border border-red-200 leading-normal">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                    <span>{statusError}</span>
                  </div>
                )}

                {isTicketClosed ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span>This ticket is already Closed</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                      Backend workflow rules do not allow moving a ticket backwards from <strong>CLOSED</strong> to an earlier status.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Select New Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as TicketStatus)}
                      className="w-full h-11 px-3.5 text-sm sm:text-base border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 shadow-xs"
                    >
                      {availableNextStatuses.map((st) => (
                        <option key={st} value={st}>
                          {STATUS_DISPLAY_LABELS[st] || st}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Tickets follow a one-way workflow: earlier statuses cannot be re-selected.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">
                    Remark <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={statusRemark}
                    onChange={(e) => setStatusRemark(e.target.value)}
                    placeholder="Enter reason or update remark for customer & history log..."
                    rows={4}
                    disabled={isTicketClosed || isUpdatingStatus}
                    className="w-full p-3.5 text-sm sm:text-base border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-slate-800 placeholder:text-slate-400 min-h-[100px] leading-relaxed shadow-xs disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <p className="text-xs text-slate-500 mt-1">Remark is mandatory for status update.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatusSubmit}
                  disabled={isUpdatingStatus || isTicketClosed || !statusRemark.trim()}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Status</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modal: Re-assign Ticket ── */}
      {isReassignModalOpen && reassignTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">Re-assign Ticket</h3>
                <p className="text-sm font-semibold font-mono text-slate-600 mt-1">
                  {reassignTicket.ticketNumber}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {reassignTicket.subject || 'No Subject'}
                  {reassignTicket.assigneeName || reassignTicket.assigneeEmail
                    ? ` · currently ${reassignTicket.assigneeName || reassignTicket.assigneeEmail}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <RefreshButton
                  onRefresh={() => setUsersReloadKey((key) => key + 1)}
                  isRefreshing={isLoadingUsers}
                  label="team members"
                />
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 py-5">
              {reassignError && (
                <div className="flex items-start gap-2.5 p-3.5 text-sm bg-red-50 text-red-700 rounded-xl border border-red-200 leading-normal">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                  <span>{reassignError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Select Assignee <span className="text-red-500">*</span>
                </label>
                {isLoadingUsers ? (
                  <div className="flex items-center gap-2.5 py-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Loading department team members…</span>
                  </div>
                ) : assignableUsers.length === 0 ? (
                  <p className="text-sm text-amber-600 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    No assignable team members found in this department.
                  </p>
                ) : (() => {
                  const filteredAssignable = assignableUsers.filter((u) => {
                    const q = userSearchQuery.trim().toLowerCase()
                    if (!q) return true
                    return (
                      (u.username?.toLowerCase() || '').includes(q) ||
                      (u.email?.toLowerCase() || '').includes(q)
                    )
                  })

                  const visibleUsers = filteredAssignable.slice(0, visibleUsersCount)

                  return (
                    <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value)
                            setVisibleUsersCount(USERS_PAGE)
                          }}
                          placeholder="Search assignee name or email…"
                          className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>

                      <p className="px-0.5 text-[11px] text-slate-500">
                        Showing {Math.min(visibleUsersCount, filteredAssignable.length)} of {filteredAssignable.length} members
                      </p>

                      {/* 6 rows × 42px + 5 gaps × 4px = 272px → exactly 6 members visible, then scroll */}
                      <div
                        className="flex max-h-[272px] flex-col gap-1 overflow-y-auto pr-1"
                        onScroll={(e) => {
                          const target = e.currentTarget
                          if (target.scrollHeight - target.scrollTop - target.clientHeight < 40) {
                            if (visibleUsersCount < filteredAssignable.length) {
                              setVisibleUsersCount((prev) => Math.min(prev + USERS_PAGE, filteredAssignable.length))
                            }
                          }
                        }}
                      >
                        {visibleUsers.map((u) => {
                          const isSelected = targetAssigneeEmail === u.email
                          return (
                            <div
                              key={u.email}
                              onClick={() => setTargetAssigneeEmail(u.email)}
                              className={`flex h-[42px] flex-shrink-0 cursor-pointer items-center justify-between rounded-lg border px-2 text-xs transition-colors ${
                                isSelected
                                  ? 'border-[#c7d6fb] bg-[#eaf0ff] font-medium text-[#1a45b8]'
                                  : 'border-transparent text-slate-700 hover:bg-white'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <p className="truncate font-semibold">{u.username || u.email}</p>
                                <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                              </div>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                              )}
                            </div>
                          )
                        })}

                        {filteredAssignable.length === 0 && (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No team members match "{userSearchQuery}"
                          </div>
                        )}

                        {visibleUsersCount < filteredAssignable.length && (
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleUsersCount((prev) => Math.min(prev + USERS_PAGE, filteredAssignable.length))
                            }
                            className="flex-shrink-0 py-2 text-center text-[11px] font-medium text-[#2459e0] hover:underline"
                          >
                            Scroll or click for more ({visibleUsersCount} of {filteredAssignable.length})
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignSubmit}
                disabled={isReassigning || !targetAssigneeEmail}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isReassigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Re-assigning…</span>
                  </>
                ) : (
                  <span>Confirm Re-assign</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Assign All (Round Robin) ── */}
      {isAssignAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign All Tickets</h3>
                <p className="text-xs text-slate-500 mt-0.5">Round-robin distribution</p>
              </div>
              <div className="flex items-center gap-1">
                <RefreshButton
                  onRefresh={() => setUsersReloadKey((key) => key + 1)}
                  isRefreshing={isLoadingUsers}
                  label="team members"
                />
                <button
                  type="button"
                  onClick={() => setIsAssignAllModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 py-4">
              {assignAllError && (
                <div className="flex items-center gap-2 p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{assignAllError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                This will automatically distribute all active (unresolved) tickets evenly among your
                active department members via round-robin.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total active tickets:</span>
                  <span className="font-bold text-slate-900">
                    {
                      tickets.filter(
                        (t) => t.ticketStatus !== 'RESOLVED' && t.ticketStatus !== 'CLOSED'
                      ).length
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Available team members:</span>
                  <span className="font-bold text-slate-900">{assignableUsers.length}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignAllModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignAllSubmit}
                disabled={isAssigningAll || assignableUsers.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {isAssigningAll ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Assigning…</span>
                  </>
                ) : (
                  <span>Confirm Assign All</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Ticket Status History ── */}
      <TicketStatusHistoryModal
        isOpen={isHistoryModalOpen}
        ticketNumber={historyTicketNumber}
        currentStatus={historyCurrentStatus}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* ── Modal: Calls View (Department & Ticket calls with recordings) ── */}
      {callsView && (
        <CallsHistoryModal
          key={`${callsView.ticketNumber ?? ''}|${callsView.customer ?? ''}|${departmentType ?? ''}`}
          open
          onClose={() => setCallsView(null)}
          departmentType={departmentType}
          title={
            callsView.ticketNumber
              ? `Call History · ${callsView.ticketNumber}`
              : callsView.customer
              ? `Call History · ${callsView.customer}`
              : 'Calls View'
          }
          defaultSource={callsView.ticketNumber ? 'TICKET' : 'ALL'}
          lockSource={Boolean(callsView.ticketNumber)}
          initialTicketNumber={callsView.ticketNumber}
          initialCustomer={callsView.customer}
        />
      )}

      {/* ── Modal: Customer Ticket History (View All) ── */}
      <CustomerTicketHistoryModal
        isOpen={isCustomerHistoryModalOpen}
        customer={customerHistoryTarget}
        onClose={() => {
          setIsCustomerHistoryModalOpen(false)
          setCustomerHistoryTarget(null)
        }}
      />
    </div>
  )
}
