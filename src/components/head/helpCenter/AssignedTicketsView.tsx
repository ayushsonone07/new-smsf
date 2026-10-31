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
  Repeat,
} from 'lucide-react'
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
import { RefreshButton } from '../../ui/RefreshButton'

interface AssignedTicketsViewProps {
  tickets: EmployeeTicketWithCreator[]
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

const STATUS_DISPLAY_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_ON_CUSTOMER: 'Waiting On Customer',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export function AssignedTicketsView({
  tickets,
  email,
  departmentType,
  isLoading,
  isRefreshing,
  onRefresh,
  onTicketUpdated,
  statusCounts: externalStatusCounts,
  canViewHistory = true,
  canUpdateStatus = true,
  canReassignTickets = true,
}: AssignedTicketsViewProps) {
  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null)

  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<TicketStatus>('OPEN')
  const [statusRemark, setStatusRemark] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  // History modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyTicketNumber, setHistoryTicketNumber] = useState<string>('')
  const [historyCurrentStatus, setHistoryCurrentStatus] = useState<string | undefined>(undefined)

  function handleOpenHistoryModal(ticketNumber: string, status?: string) {
    setHistoryTicketNumber(ticketNumber)
    setHistoryCurrentStatus(status)
    setIsHistoryModalOpen(true)
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

  // Infinite scroll states: 8 items initially, fetch next 8 on scroll
  const [visibleTicketsCount, setVisibleTicketsCount] = useState(8)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [visibleUsersCount, setVisibleUsersCount] = useState(8)

  // Reset ticket pagination when activeTab or searchQuery changes
  useEffect(() => {
    setVisibleTicketsCount(8)
  }, [activeTab, searchQuery])

  // Reset reassign dropdown pagination on modal open/search
  useEffect(() => {
    if (isReassignModalOpen) {
      setVisibleUsersCount(8)
      setUserSearchQuery('')
    }
  }, [isReassignModalOpen])

  // Fetch assignable users for re-assignment / round robin
  useEffect(() => {
    let cancelled = false
    async function loadUsers() {
      setIsLoadingUsers(true)
      try {
        const users = await fetchAssignableDepartmentUsers(departmentType)
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
  }, [departmentType, usersReloadKey])

  // Compute status counts
  const computedStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: tickets.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_ON_CUSTOMER: 0,
      ESCALATED: 0,
      RESOLVED: 0,
      CLOSED: 0,
    }
    tickets.forEach((t) => {
      const s = t.ticketStatus?.toUpperCase()
      if (s && counts[s] !== undefined) {
        counts[s] += 1
      }
    })
    return counts
  }, [tickets])

  const statusCounts = externalStatusCounts
    ? {
        ALL: externalStatusCounts.ALL ?? tickets.length,
        OPEN: externalStatusCounts.OPEN ?? computedStatusCounts.OPEN,
        IN_PROGRESS: externalStatusCounts.IN_PROGRESS ?? computedStatusCounts.IN_PROGRESS,
        WAITING_ON_CUSTOMER:
          externalStatusCounts.WAITING_ON_CUSTOMER ?? computedStatusCounts.WAITING_ON_CUSTOMER,
        ESCALATED: externalStatusCounts.ESCALATED ?? computedStatusCounts.ESCALATED,
        RESOLVED: externalStatusCounts.RESOLVED ?? computedStatusCounts.RESOLVED,
        CLOSED: externalStatusCounts.CLOSED ?? computedStatusCounts.CLOSED,
      }
    : computedStatusCounts

  // Filter tickets by active tab and search query
  const filteredTickets = useMemo(() => {
    let result = tickets

    if (activeTab !== 'ALL') {
      result = result.filter(
        (t) => (t.ticketStatus?.toUpperCase() || '') === activeTab
      )
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter((t) => {
        const num = t.ticketNumber?.toLowerCase() || ''
        const subj = t.subject?.toLowerCase() || ''
        const name = t.creatorName?.toLowerCase() || ''
        const mail = t.creatorEmail?.toLowerCase() || ''
        const phone = t.creatorPhone?.toLowerCase() || ''
        return (
          num.includes(q) ||
          subj.includes(q) ||
          name.includes(q) ||
          mail.includes(q) ||
          phone.includes(q)
        )
      })
    }

    return result
  }, [tickets, activeTab, searchQuery])

  // Keep a valid selected ticket
  const selectedTicket = useMemo(() => {
    if (!filteredTickets.length) return null
    if (selectedTicketNumber) {
      const found = filteredTickets.find((t) => t.ticketNumber === selectedTicketNumber)
      if (found) return found
    }
    return filteredTickets[0]
  }, [filteredTickets, selectedTicketNumber])

  // Sync selectedTicketNumber when selectedTicket changes
  useEffect(() => {
    if (selectedTicket && selectedTicket.ticketNumber !== selectedTicketNumber) {
      setSelectedTicketNumber(selectedTicket.ticketNumber)
    }
  }, [selectedTicket])

  // Set initial status in modal
  function handleOpenStatusModal() {
    if (!selectedTicket || !canUpdateStatus) return
    const curStatus = (selectedTicket.ticketStatus || 'OPEN') as TicketStatus
    const curIndex = ALL_STATUS_OPTIONS.indexOf(curStatus)
    const nextOptions = curIndex < 0 ? ALL_STATUS_OPTIONS : ALL_STATUS_OPTIONS.slice(curIndex + 1)

    setNewStatus(nextOptions.length > 0 ? nextOptions[0] : curStatus)
    setStatusRemark('')
    setStatusError(null)
    setIsStatusModalOpen(true)
  }

  // Handle status update submission
  async function handleUpdateStatusSubmit() {
    if (!selectedTicket || !canUpdateStatus) return
    if (!statusRemark.trim()) {
      setStatusError('Remark is required by backend.')
      return
    }

    setIsUpdatingStatus(true)
    setStatusError(null)
    try {
      await updateTicketStatus(selectedTicket.ticketNumber, newStatus, statusRemark.trim())
      setIsStatusModalOpen(false)
      onTicketUpdated?.()
    } catch (err: any) {
      let msg = 'Failed to update ticket status'
      if (err?.message) {
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
    if (!canReassignTickets || !selectedTicket || !targetAssigneeEmail) return
    setIsReassigning(true)
    setReassignError(null)
    try {
      await assignTickets([
        {
          ticketNumber: selectedTicket.ticketNumber,
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

  // Badge helpers
  function getPriorityBadgeClass(priority?: TicketPriority) {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-pink-100 text-pink-700 border border-pink-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border border-orange-200'
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border border-amber-200'
      case 'LOW':
      default:
        return 'bg-blue-100 text-blue-700 border border-blue-200'
    }
  }

  function formatPriority(priority?: TicketPriority) {
    if (!priority) return 'Low'
    return priority.charAt(0) + priority.slice(1).toLowerCase()
  }

  function getStatusBadgeClass(status?: TicketStatus) {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border border-amber-200'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700 border border-blue-200'
      case 'WAITING_ON_CUSTOMER':
        return 'bg-purple-100 text-purple-700 border border-purple-200'
      case 'ESCALATED':
        return 'bg-rose-100 text-rose-700 border border-rose-200'
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border border-slate-200'
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  function formatStatus(status?: TicketStatus) {
    if (!status) return 'Open'
    return status
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ')
  }

  function formatShortDate(dateStr?: string | null) {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d)
    } catch {
      return dateStr
    }
  }

  function formatFullDate(dateStr?: string | null) {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
        .format(d)
        .toLowerCase()
    } catch {
      return dateStr
    }
  }

  const resolvedCount = (statusCounts.RESOLVED ?? 0) + (statusCounts.CLOSED ?? 0)
  const summaryCards = [
    { key: 'ALL', label: 'Total tickets', value: statusCounts.ALL ?? 0, icon: TicketIcon, tone: 'bg-blue-50 text-blue-600' },
    { key: 'OPEN', label: 'Open', value: statusCounts.OPEN ?? 0, icon: Clock, tone: 'bg-amber-50 text-amber-600' },
    { key: 'IN_PROGRESS', label: 'In progress', value: statusCounts.IN_PROGRESS ?? 0, icon: Activity, tone: 'bg-sky-50 text-sky-600' },
    { key: 'RESOLVED', label: 'Resolved', value: resolvedCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
  ]

  return (
    <div className="space-y-4">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const CardIcon = card.icon
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveTab(card.key)}
              className={`flex items-center gap-3.5 p-4 rounded-2xl bg-white border text-left transition-all ${
                activeTab === card.key ? 'border-blue-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
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

      {/* ── Filters, search and actions ── */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key
            const count = statusCounts[tab.key] ?? 0

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket, name, email or phone…"
              className="w-full h-10 pl-9 pr-8 text-xs border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            title="Refresh tickets"
            className="h-10 px-3 inline-flex items-center gap-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canReassignTickets && (
            <button
              type="button"
              onClick={() => {
                setAssignAllError(null)
                setIsAssignAllModalOpen(true)
              }}
              disabled={isLoading || tickets.length === 0}
              title="Distribute open tickets across department members"
              className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors disabled:opacity-60 flex-shrink-0"
            >
              <Repeat className="h-3.5 w-3.5" />
              <span>Assign all · Round robin</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Ticket list + details ── */}
      {isLoading && tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading assigned tickets…</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <TicketIcon className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900">No tickets found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery
              ? `No tickets matching "${searchQuery}".`
              : tickets.length === 0
                ? 'No tickets are assigned to you yet.'
                : 'There are no tickets matching this filter status.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-blue-600 hover:underline font-medium"
            >
              Clear search query
            </button>
          )}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-start transition-opacity ${
            isRefreshing ? 'opacity-60' : ''
          }`}
        >
          {/* ── Left: ticket list ── */}
          <div
            className="lg:col-span-5 space-y-2.5 max-h-[calc(100vh-300px)] min-h-[320px] overflow-y-auto p-0.5 pr-1.5"
            onScroll={(e) => {
              const target = e.currentTarget
              if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
                if (visibleTicketsCount < filteredTickets.length) {
                  setVisibleTicketsCount((prev) => Math.min(prev + 8, filteredTickets.length))
                }
              }
            }}
          >
            {filteredTickets.slice(0, visibleTicketsCount).map((t) => {
              const isSelected = selectedTicket?.ticketNumber === t.ticketNumber

              return (
                <div
                  key={t.ticketNumber}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTicketNumber(t.ticketNumber)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedTicketNumber(t.ticketNumber)
                    }
                  }}
                  className={`relative overflow-hidden px-5 py-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {isSelected && <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="text-xs font-bold font-mono text-blue-600">{t.ticketNumber}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getPriorityBadgeClass(t.priority)}`}
                      >
                        {formatPriority(t.priority)}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getStatusBadgeClass(t.ticketStatus)}`}
                      >
                        {formatStatus(t.ticketStatus)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">
                      {formatShortDate(t.ticketCreatedAt)}
                    </span>
                  </div>

                  <h3 className="mt-1.5 font-semibold text-slate-900 text-sm leading-snug line-clamp-1">
                    {t.subject || 'No Subject'}
                  </h3>

                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">
                      {t.creatorName || t.creatorEmail || 'Customer'}
                      {t.departmentName ? ` · ${t.departmentName}` : ''}
                    </span>
                    {canViewHistory && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenHistoryModal(t.ticketNumber, t.ticketStatus)
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                        title="View ticket history"
                      >
                        <History className="h-3 w-3" />
                        <span>History</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {visibleTicketsCount < filteredTickets.length && (
              <div className="py-2.5 text-center text-xs text-slate-400 font-medium">
                Scroll for more ({visibleTicketsCount} of {filteredTickets.length})…
              </div>
            )}
          </div>

          {/* ── Right: selected ticket ── */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {selectedTicket ? (
              <div>
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Ticket id, priority, raised date */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-blue-600">
                        {selectedTicket.ticketNumber}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getPriorityBadgeClass(
                          selectedTicket.priority
                        )}`}
                      >
                        {formatPriority(selectedTicket.priority)} priority
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Raised {formatFullDate(selectedTicket.ticketCreatedAt)}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 leading-tight">
                    {selectedTicket.subject || 'No Subject'}
                  </h2>

                  {/* Customer card */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-sm font-bold">
                      {(selectedTicket.creatorName || selectedTicket.creatorEmail || 'C').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {selectedTicket.creatorName || 'Customer'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {[selectedTicket.creatorPhone, selectedTicket.creatorEmail].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    {selectedTicket.creatorPhone && (
                      <a
                        href={`tel:${selectedTicket.creatorPhone}`}
                        title={`Call ${selectedTicket.creatorPhone}`}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Status + actions */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1.5">Status</p>
                      <span
                        className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(
                          selectedTicket.ticketStatus
                        )}`}
                      >
                        {formatStatus(selectedTicket.ticketStatus)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {canViewHistory && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenHistoryModal(selectedTicket.ticketNumber, selectedTicket.ticketStatus)
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                          title="View status change history"
                        >
                          <History className="h-3.5 w-3.5 text-slate-500" />
                          <span>History</span>
                        </button>
                      )}

                      {canReassignTickets && (
                        <button
                          type="button"
                          onClick={() => {
                            setReassignError(null)
                            setIsReassignModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                          <span>Re-assign</span>
                        </button>
                      )}

                      {canUpdateStatus && (
                        <button
                          type="button"
                          onClick={handleOpenStatusModal}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                        >
                          <span>Update status</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 mb-0.5">Department</p>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {selectedTicket.departmentName || departmentType || '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 mb-0.5">Creator status</p>
                    <p className="text-xs font-semibold text-emerald-700">
                      {selectedTicket.creatorStatus || 'Active'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 mb-0.5">Updated</p>
                    <p className="text-xs text-slate-700">
                      {selectedTicket.ticketUpdatedAt ? formatFullDate(selectedTicket.ticketUpdatedAt) : '—'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 mb-0.5">Resolved</p>
                    <p className="text-xs text-slate-700">
                      {selectedTicket.ticketResolvedAt ? formatFullDate(selectedTicket.ticketResolvedAt) : '—'}
                    </p>
                  </div>
                </div>

                {/* Customer message */}
                <div className="px-5 sm:px-6 py-5 border-t border-slate-100">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.description || 'No description provided.'}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {selectedTicket.creatorName || selectedTicket.creatorEmail || 'Customer'} ·{' '}
                    {formatFullDate(selectedTicket.ticketCreatedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <TicketIcon className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Select a ticket to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Update Status ── */}
      {isStatusModalOpen && selectedTicket && (() => {
        const curStatus = (selectedTicket.ticketStatus || 'OPEN') as TicketStatus
        const curIndex = ALL_STATUS_OPTIONS.indexOf(curStatus)
        const availableNextStatuses = curIndex < 0 ? ALL_STATUS_OPTIONS : ALL_STATUS_OPTIONS.slice(curIndex + 1)
        const isTicketClosed = curStatus === 'CLOSED' || availableNextStatuses.length === 0

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Update Ticket Status</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-semibold font-mono text-slate-600">
                      {selectedTicket.ticketNumber}
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
      {isReassignModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Re-assign Ticket</h3>
                <p className="text-sm font-semibold font-mono text-slate-600 mt-1">
                  {selectedTicket.ticketNumber}
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
                            setVisibleUsersCount(8)
                          }}
                          placeholder="Search assignee name or email…"
                          className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>

                      <div
                        className="max-h-52 overflow-y-auto space-y-1 pr-1"
                        onScroll={(e) => {
                          const target = e.currentTarget
                          if (target.scrollHeight - target.scrollTop - target.clientHeight < 40) {
                            if (visibleUsersCount < filteredAssignable.length) {
                              setVisibleUsersCount((prev) => Math.min(prev + 8, filteredAssignable.length))
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
                              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 border border-blue-200 text-blue-900 font-medium'
                                  : 'hover:bg-white text-slate-700'
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
                          <div className="py-2 text-center text-[11px] text-slate-400 font-medium">
                            Scroll for more ({visibleUsersCount} of {filteredAssignable.length})…
                          </div>
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
    </div>
  )
}
