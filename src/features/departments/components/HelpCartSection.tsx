import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Search,
  RotateCw,
  X,
  ChevronDown,
  Copy,
  Check,
  Eye,
  FileText,
  AlertCircle,
  ExternalLink,
  User,
  Building,
  Tag,
  Clock,
  Key,
  Lock,
} from 'lucide-react'
import { fetchHelpCartTickets, fetchHelpCartToken } from '../../../api/help-cart.api'
import { TablePagination } from '../../../components/ui/TablePagination'

const STATUS_COLORS: Record<string, { bg: string; fg: string; dot: string; border: string }> = {
  OPEN: { bg: '#eff6ff', fg: '#1d4ed8', dot: '#3b82f6', border: '#bfdbfe' },
  PENDING: { bg: '#fffbeb', fg: '#b45309', dot: '#f59e0b', border: '#fde68a' },
  'ON PROCESS': { bg: '#fff7ed', fg: '#c2410c', dot: '#ea580c', border: '#fed7aa' },
  ON_PROCESS: { bg: '#fff7ed', fg: '#c2410c', dot: '#ea580c', border: '#fed7aa' },
  IN_PROGRESS: { bg: '#fff7ed', fg: '#c2410c', dot: '#ea580c', border: '#fed7aa' },
  SOLVED: { bg: '#ecfdf5', fg: '#047857', dot: '#10b981', border: '#a7f3d0' },
  RESOLVED: { bg: '#ecfdf5', fg: '#047857', dot: '#10b981', border: '#a7f3d0' },
  'NOT ANSWERED': { bg: '#fef2f2', fg: '#b91c1c', dot: '#ef4444', border: '#fecaca' },
  NOT_ANSWERED: { bg: '#fef2f2', fg: '#b91c1c', dot: '#ef4444', border: '#fecaca' },
  CLOSED: { bg: '#f8fafc', fg: '#475569', dot: '#94a3b8', border: '#e2e8f0' },
  'AUTOMATION IS NOT IN PACKAGE': { bg: '#faf5ff', fg: '#7e22ce', dot: '#a855f7', border: '#e9d5ff' },
  AUTOMATION_IS_NOT_IN_PACKAGE: { bg: '#faf5ff', fg: '#7e22ce', dot: '#a855f7', border: '#e9d5ff' },
}

const PRIORITY_COLORS: Record<string, { bg: string; fg: string; dot: string; border: string }> = {
  LOW: { bg: '#f8fafc', fg: '#475569', dot: '#94a3b8', border: '#e2e8f0' },
  MEDIUM: { bg: '#eff6ff', fg: '#1d4ed8', dot: '#3b82f6', border: '#bfdbfe' },
  HIGH: { bg: '#fff7ed', fg: '#c2410c', dot: '#ea580c', border: '#fed7aa' },
  URGENT: { bg: '#fef2f2', fg: '#b91c1c', dot: '#ef4444', border: '#fecaca' },
}

function humanize(val?: string) {
  if (!val) return '—'
  return val.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(val?: string) {
  if (!val) return '—'
  const d = new Date(val)
  return Number.isNaN(d.getTime())
    ? val
    : d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

interface NormalizedTicket {
  id: string | number
  ticketNumber: string
  subject: string
  status: string
  priority: string
  departmentName: string
  userName: string
  userEmail: string
  createdAt: string
  raw: any
}

// [ help.mbgcard.com ]
export function HelpCartSection() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<NormalizedTicket | null>(null)

  // Auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchInput])

  // Fetch tickets query
  const ticketsQuery = useQuery({
    queryKey: ['help-cart-tickets', { page, pageSize, status, priority, search, deptFilter }],
    queryFn: () =>
      fetchHelpCartTickets({
        page,
        size: pageSize,
        status: status || undefined,
        priority: priority || undefined,
        departmentId: deptFilter ? Number(deptFilter) : undefined,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  // Normalize tickets and metadata from response
  const {
    rows,
    totalRecords,
    totalPages,
    availableStatuses,
    availablePriorities,
    availableCategories,
  } = useMemo(() => {
    const raw = ticketsQuery.data
    if (!raw) {
      return {
        rows: [],
        totalRecords: 0,
        totalPages: 1,
        availableStatuses: [],
        availablePriorities: [],
        availableCategories: [],
      }
    }

    // Unpack nested response structure:
    // e.g. { code: 200, success: true, message: "OK", data: { counters: ..., tickets: ... } }
    let root: any = raw
    if (root?.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
      root = root.data
    }
    if (root?.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
      root = root.data
    }

    const counters = root?.counters || raw?.counters || raw?.data?.counters

    // Build Status Map & List
    const statusMap: Record<string, string> = {}
    const statusesList: { id: string; name: string }[] = []
    if (counters?.ticket_statuses && typeof counters.ticket_statuses === 'object') {
      Object.entries(counters.ticket_statuses).forEach(([id, name]) => {
        const strName = String(name)
        statusMap[id] = strName
        statusMap[strName.toUpperCase()] = strName
        statusesList.push({ id, name: strName })
      })
    }

    // Build Priority Map & List
    const priorityMap: Record<string, string> = {}
    const prioritiesList: { id: string; name: string }[] = []
    if (counters?.ticket_priorities && typeof counters.ticket_priorities === 'object') {
      Object.entries(counters.ticket_priorities).forEach(([id, name]) => {
        const strName = String(name)
        priorityMap[id] = strName
        priorityMap[strName.toUpperCase()] = strName
        prioritiesList.push({ id, name: strName })
      })
    }

    // Build Categories Map & List
    const categoriesMap: Record<string, string> = {}
    const categoriesList: { id: string; name: string; count?: number }[] = []
    if (Array.isArray(counters?.ticket_categories)) {
      counters.ticket_categories.forEach((cat: any) => {
        const catName =
          typeof cat.name === 'object'
            ? cat.name?.en || Object.values(cat.name)[0] || 'Category'
            : String(cat.name || 'Category')
        if (cat.id) {
          categoriesMap[String(cat.id)] = catName
          categoriesList.push({ id: String(cat.id), name: catName, count: cat.tickets_count })
        }
      })
    }

    // Extract ticket items and pagination numbers
    let items: any[] = []
    let total = 0
    let lastPage = 1

    if (Array.isArray(root)) {
      items = root
      total = root.length
    } else if (root?.tickets) {
      if (Array.isArray(root.tickets)) {
        items = root.tickets
        total = root.total ?? items.length
      } else if (root.tickets.data && Array.isArray(root.tickets.data)) {
        items = root.tickets.data
        total = root.tickets.total ?? counters?.total_tickets ?? items.length
        lastPage = root.tickets.last_page ?? Math.ceil(total / pageSize)
      } else if (typeof root.tickets === 'object') {
        const arrKey = Object.keys(root.tickets).find((k) => Array.isArray(root.tickets[k]))
        if (arrKey) {
          items = root.tickets[arrKey]
          total = root.tickets.total ?? counters?.total_tickets ?? items.length
          lastPage = root.tickets.last_page ?? Math.ceil(total / pageSize)
        }
      }
    } else if (root?.data) {
      if (Array.isArray(root.data)) {
        items = root.data
        total = root.total ?? items.length
        lastPage = root.last_page ?? Math.ceil(total / pageSize)
      } else if (root.data.data && Array.isArray(root.data.data)) {
        items = root.data.data
        total = root.data.total ?? counters?.total_tickets ?? items.length
        lastPage = root.data.last_page ?? Math.ceil(total / pageSize)
      }
    }

    // Fallback if total wasn't in tickets object but counters has total_tickets
    if (total === 0 && counters?.total_tickets) {
      total = counters.total_tickets
      lastPage = Math.ceil(total / pageSize)
    }

    const normalized: NormalizedTicket[] = items.map((item, index) => {
      const ticketNumber =
        item.ticket_number ||
        item.ticketNumber ||
        item.ticket_id ||
        item.ticket_no ||
        (item.id ? `#${item.id}` : `#${index + 1}`)

      const subject = item.subject || item.title || item.issue || 'Untitled Ticket'

      // Status resolution (supports numeric ID or string)
      let statusKey = item.status_id ?? item.status
      if (typeof statusKey === 'object') {
        statusKey = statusKey?.name || statusKey?.id
      }
      let statusStr =
        statusMap[String(statusKey)] || (typeof statusKey === 'string' ? statusKey : '')
      if (!statusStr && item.status_name) {
        statusStr = item.status_name
      }
      if (!statusStr) statusStr = 'OPEN'

      // Priority resolution (supports numeric ID or string)
      let priorityKey = item.priority_id ?? item.priority
      if (typeof priorityKey === 'object') {
        priorityKey = priorityKey?.name || priorityKey?.id
      }
      let priorityStr =
        priorityMap[String(priorityKey)] || (typeof priorityKey === 'string' ? priorityKey : '')
      if (!priorityStr && item.priority_name) {
        priorityStr = item.priority_name
      }
      if (!priorityStr) priorityStr = 'MEDIUM'

      // Department / Category resolution
      let departmentName =
        item.department?.name ||
        item.department_name ||
        (typeof item.department === 'string' ? item.department : '')

      if (!departmentName && item.category_id && categoriesMap[String(item.category_id)]) {
        departmentName = categoriesMap[String(item.category_id)]
      }
      if (!departmentName && item.category?.name) {
        const catN = item.category.name
        departmentName =
          typeof catN === 'object' ? catN.en || Object.values(catN)[0] : String(catN)
      }
      if (!departmentName) departmentName = '—'

      // Customer / User resolution
      const userName =
        item.user?.name ||
        item.user_name ||
        item.customer_name ||
        item.customer?.name ||
        item.name ||
        '—'

      const userEmail =
        item.user?.email ||
        item.user_email ||
        item.email ||
        item.customer?.email ||
        '—'

      const createdAt = item.created_at || item.createdAt || ''

      return {
        id: item.id || ticketNumber,
        ticketNumber,
        subject,
        status: statusStr.toUpperCase(),
        priority: priorityStr.toUpperCase(),
        departmentName,
        userName,
        userEmail,
        createdAt,
        raw: item,
      }
    })

    return {
      rows: normalized,
      totalRecords: total,
      totalPages: lastPage > 0 ? lastPage : 1,
      availableStatuses: statusesList,
      availablePriorities: prioritiesList,
      availableCategories: categoriesList,
    }
  }, [ticketsQuery.data, pageSize])

  const handleCopy = (e: React.MouseEvent, tNo: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(tNo)
    setCopiedTicket(tNo)
    setTimeout(() => setCopiedTicket(null), 1500)
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatus('')
    setPriority('')
    setDeptFilter('')
    setPage(1)
  }

  const handleFetchToken = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    setAuthSuccess(null)
    try {
      await fetchHelpCartToken({
        username: authUsername.trim(),
        password: authPassword.trim(),
      })
      setAuthSuccess('Token fetched & connected successfully!')
      setTimeout(() => {
        setShowAuthModal(false)
        ticketsQuery.refetch()
      }, 900)
    } catch (err: any) {
      setAuthError(err?.response?.data?.message || err?.message || 'Failed to fetch token')
    } finally {
      setAuthLoading(false)
    }
  }

  const hasActiveFilters = Boolean(searchInput || status || priority || deptFilter)

  return (
    <div className="bg-white border border-[#e7ebf3] rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Header bar */}
      <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e7ebf3] bg-gradient-to-r from-white via-white to-blue-50/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#17243c] tracking-tight">Help Cart Tickets</h2>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live: help.mbgcart.com
            </span>
          </div>
          <span className="text-xs font-semibold text-[#5c6d88] bg-[#f5f7fb] px-2.5 py-1 rounded-full border border-[#e2e8f0]">
            {totalRecords.toLocaleString()} tickets
          </span>
          <button
            onClick={() => ticketsQuery.refetch()}
            className="w-8 h-8 rounded-lg border border-[#e2e8f0] bg-white flex items-center justify-center text-[#5c6d88] hover:text-[#315fe8] hover:bg-[#f8fafe] transition-colors shadow-2xs"
            title="Refresh tickets"
          >
            <RotateCw className={`w-3.5 h-3.5 ${ticketsQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAuthModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-semibold text-[#17243c] hover:bg-[#f8fafc] hover:border-[#315fe8] transition-colors shadow-2xs"
            title="Fetch or update Help Cart token"
          >
            <Key className="w-3.5 h-3.5 text-[#315fe8]" />
            <span>Fetch Token</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              className="w-full h-9 pl-9 pr-8 bg-white border border-[#e2e8f0] rounded-lg text-xs text-[#17243c] placeholder-[#94a3b8] focus:outline-none focus:border-[#315fe8] focus:ring-2 focus:ring-[#315fe8]/15 transition-all shadow-2xs"
              placeholder="Search ticket # or subject"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#94a3b8] hover:text-[#475569] rounded-full hover:bg-[#f1f5f9] transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              className="h-9 appearance-none pl-3 pr-8 bg-white border border-[#e2e8f0] rounded-lg text-xs text-[#17243c] font-medium focus:outline-none focus:border-[#315fe8] focus:ring-2 focus:ring-[#315fe8]/15 transition-all cursor-pointer shadow-2xs hover:bg-[#f8fafc]"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              {availableStatuses.length > 0 ? (
                availableStatuses.map((st) => (
                  <option key={st.id} value={st.id}>
                    {humanize(st.name)}
                  </option>
                ))
              ) : (
                <>
                  <option value="1">Open</option>
                  <option value="2">Pending</option>
                  <option value="3">On Process</option>
                  <option value="4">Solved</option>
                  <option value="6">Closed</option>
                </>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              className="h-9 appearance-none pl-3 pr-8 bg-white border border-[#e2e8f0] rounded-lg text-xs text-[#17243c] font-medium focus:outline-none focus:border-[#315fe8] focus:ring-2 focus:ring-[#315fe8]/15 transition-all cursor-pointer shadow-2xs hover:bg-[#f8fafc]"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All priorities</option>
              {availablePriorities.length > 0 ? (
                availablePriorities.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {humanize(pr.name)}
                  </option>
                ))
              ) : (
                <>
                  <option value="3">Low</option>
                  <option value="6">Medium</option>
                  <option value="8">High</option>
                  <option value="7">Urgent</option>
                </>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Department / Category Filter */}
          {availableCategories.length > 0 && (
            <div className="relative">
              <select
                className="h-9 appearance-none pl-3 pr-8 bg-white border border-[#e2e8f0] rounded-lg text-xs text-[#17243c] font-medium focus:outline-none focus:border-[#315fe8] focus:ring-2 focus:ring-[#315fe8]/15 transition-all cursor-pointer shadow-2xs hover:bg-[#f8fafc] max-w-[220px] truncate"
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All categories / depts</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.count !== undefined ? `(${cat.count})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="h-9 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e7ebf3] bg-[#f8fafc] text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              <th className="py-3 px-4">Ticket</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Department / Category</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9] text-xs">
            {ticketsQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#64748b]">
                  <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#315fe8] mb-2" />
                  Loading tickets from help.mbgcart.com...
                </td>
              </tr>
            ) : ticketsQuery.isError ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-rose-600">
                  <AlertCircle className="w-7 h-7 mx-auto mb-2 text-rose-500" />
                  <p className="font-semibold text-sm">Failed to fetch tickets from Help Cart</p>
                  <p className="text-xs text-[#64748b] mt-1 mb-4">
                    Authentication token is missing, expired, or invalid for live help.mbgcart.com.
                  </p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#315fe8] text-white text-xs font-semibold hover:bg-[#254ed0] shadow-sm transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Enter Username & Password to Fetch Token</span>
                  </button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#94a3b8]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No tickets found matching your search.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const sCfg = STATUS_COLORS[row.status] || STATUS_COLORS.CLOSED
                const pCfg = PRIORITY_COLORS[row.priority] || PRIORITY_COLORS.MEDIUM

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedTicket(row)}
                    className="hover:bg-[#f8faff] transition-colors cursor-pointer group"
                  >
                    {/* Ticket # */}
                    <td className="py-3 px-4 font-mono font-semibold text-[#1e293b]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#315fe8] group-hover:underline">
                          {row.ticketNumber}
                        </span>
                        <button
                          onClick={(e) => handleCopy(e, row.ticketNumber)}
                          className="p-1 rounded text-[#94a3b8] hover:text-[#315fe8] hover:bg-[#eff6ff] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy ticket number"
                        >
                          {copiedTicket === row.ticketNumber ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-[#1e293b] truncate" title={row.subject}>
                        {row.subject}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-[#1e293b] truncate">{row.userName}</p>
                        <p className="text-[11px] text-[#64748b] truncate">{row.userEmail}</p>
                      </div>
                    </td>

                    {/* Department / Category */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[180px]">
                        {row.departmentName}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                        style={{ backgroundColor: pCfg.bg, color: pCfg.fg, borderColor: pCfg.border }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pCfg.dot }} />
                        {humanize(row.priority)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                        style={{ backgroundColor: sCfg.bg, color: sCfg.fg, borderColor: sCfg.border }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sCfg.dot }} />
                        {humanize(row.status)}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="py-3 px-4 text-[#64748b] text-[11px] whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTicket(row)
                        }}
                        className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:text-[#315fe8] hover:bg-[#eff6ff] hover:border-[#bfdbfe] transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
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
      <div className="p-3 border-t border-[#e7ebf3] bg-white">
        <TablePagination
          page={page - 1}
          pageSize={pageSize}
          totalResults={totalRecords}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={(newPage) => setPage(newPage + 1)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setPage(1)
          }}
          disabled={ticketsQuery.isLoading}
        />
      </div>

      {/* Ticket Details Modal Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#e7ebf3] w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e7ebf3] flex items-center justify-between bg-gradient-to-r from-white to-blue-50/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#315fe8]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17243c]">
                    Ticket #{selectedTicket.ticketNumber}
                  </h3>
                  <p className="text-[11px] text-[#64748b]">Help Cart Live Ticket Inspection</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-lg text-[#94a3b8] hover:text-[#475569] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Subject</span>
                <p className="font-semibold text-sm text-[#1e293b] mt-0.5">{selectedTicket.subject}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Status</span>
                  <p className="font-semibold text-[#1e293b] mt-0.5">{humanize(selectedTicket.status)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Priority</span>
                  <p className="font-semibold text-[#1e293b] mt-0.5">{humanize(selectedTicket.priority)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Department / Category</span>
                  <p className="font-semibold text-[#1e293b] mt-0.5">{selectedTicket.departmentName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase">Created</span>
                  <p className="font-semibold text-[#1e293b] mt-0.5">{formatDate(selectedTicket.createdAt)}</p>
                </div>
              </div>

              <div className="p-3.5 border border-[#e2e8f0] rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Customer Info</span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#94a3b8]" />
                  <span className="font-semibold text-[#1e293b]">{selectedTicket.userName}</span>
                </div>
                <div className="text-[11px] text-[#64748b] pl-6">
                  {selectedTicket.userEmail}
                </div>
              </div>

              {/* Raw JSON Details Preview */}
              <div>
                <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Upstream Raw Payload</span>
                <pre className="mt-1 p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedTicket.raw, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#e7ebf3] bg-[#f8fafc] flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-white border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#1e293b] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth / Fetch Token Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e7ebf3] bg-[#f8fafc] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#315fe8] flex items-center justify-center border border-blue-200">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1e293b]">Help Cart Authentication</h3>
                  <p className="text-[11px] text-[#64748b]">Login to live help.mbgcart.com to fetch Bearer token</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-7 h-7 rounded-lg text-[#94a3b8] hover:text-[#475569] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFetchToken} className="p-5 space-y-4">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1.5">
                  Admin Username / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter help.mbgcart.com admin username"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-white border border-[#e2e8f0] rounded-lg text-xs text-[#1e293b] focus:outline-none focus:border-[#315fe8] focus:ring-2 focus:ring-[#315fe8]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter admin password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-white border border-[#e2e8f0] rounded-lg text-xs text-[#1e293b] focus:outline-none focus:border-[#315fe8] focus:ring-2 focus:ring-[#315fe8]/15"
                  />
                </div>
              </div>

              <div className="text-[11px] text-[#64748b] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Token will be cached in backend memory and automatically used for all ticket operations.
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-2 border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#64748b] hover:bg-[#f8fafc] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#315fe8] text-white rounded-lg text-xs font-semibold hover:bg-[#254ed0] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                >
                  {authLoading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Key className="w-3.5 h-3.5" />
                  )}
                  <span>{authLoading ? 'Authenticating...' : 'Fetch & Save Token'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
