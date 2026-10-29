import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Search,
  SlidersHorizontal,
  Upload,
  RefreshCw,
  X,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
  Building,
  CreditCard,
  Copy,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react'
import {
  getLeads,
  deleteLeads,
  fetchFunnels,
  fetchAssignableUsers,
  assignLeadToUser,
  type LeadInfo,
  type AssignableUser,
  type FunnelItem,
} from '../../../api/leads.api'
import { UploadLeadModal } from '../components/UploadLeadModal'
import { LeadDetailsModal } from '../components/LeadDetailsModal'
import { TelecallerActionModal } from '../components/TelecallerActionModal'
import { UpdateLeadStatusModal } from '../components/UpdateLeadStatusModal'
import { GeneratePaymentModal } from '../components/GeneratePaymentModal'
import { SalesSummaryView } from '../components/SalesSummaryView'
import { CustomerPaymentView } from '../../payment/components/CustomerPaymentView'
import { TrendingUp, LayoutGrid } from 'lucide-react'

const LEAD_STATUS_OPTIONS = [
  'PENDING',
  'FOLLOW_UP',
  'MEETING_SCHEDULED_AT',
  'NOT_CONNECTED',
  'NOT_INTERESTED',
  'DONE',
]

const TELECALLER_STATUS_OPTIONS = [
  'PENDING',
  'FOLLOW_UP',
  'NOT_CONNECTED',
  'ASSIGNED',
]

const LEAD_TYPE_OPTIONS = ['Webinar 999', 'Direct', 'Inbound', 'Referral', 'Campaign']

export interface LeadsManagementPageProps {
  initialTab?: 'leads' | 'summary' | 'payments'
  feature?: any
  [key: string]: any
}

export function LeadsManagementPage({ initialTab }: LeadsManagementPageProps = {}) {
  const [activeMainTab, setActiveMainTab] = useState<'leads' | 'summary' | 'payments'>(() => {
    if (initialTab) return initialTab
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('tab')?.toLowerCase()
      if (t === 'summary' || t === 'sales-summary') return 'summary'
      if (t === 'payments' || t === 'payment') return 'payments'
      if (window.location.pathname.includes('payment')) return 'payments'
      if (window.location.pathname.includes('sales-summary')) return 'summary'
    }
    return 'leads'
  })
  const [leads, setLeads] = useState<LeadInfo[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLeadStatus, setSelectedLeadStatus] = useState('all')
  const [selectedTelecallerStatus, setSelectedTelecallerStatus] = useState('all')
  const [selectedLeadType, setSelectedLeadType] = useState('all')
  const [selectedFunnel, setSelectedFunnel] = useState('all')
  const [funnels, setFunnels] = useState<FunnelItem[]>([])
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])

  // Selection
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<LeadInfo | null>(null)

  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedLeadForPayment, setSelectedLeadForPayment] = useState<LeadInfo | null>(null)

  const [telecallerModalOpen, setTelecallerModalOpen] = useState(false)
  const [telecallerMode, setTelecallerMode] = useState<'follow_up' | 'assign'>('follow_up')
  const [selectedLeadForTelecaller, setSelectedLeadForTelecaller] = useState<LeadInfo | null>(null)

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusModalData, setStatusModalData] = useState<{
    leadId: string
    leadName?: string
    currentStatus: string
    newStatus: string
  } | null>(null)

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load funnels and assignable users once
  useEffect(() => {
    fetchFunnels().then((data) => setFunnels(data)).catch(() => {})
    fetchAssignableUsers().then((data) => setAssignableUsers(data)).catch(() => {})
  }, [])

  // Load leads
  const fetchLeadsData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await getLeads({
        page: currentPage,
        size: pageSize,
        search: debouncedSearch,
        leadStatus: selectedLeadStatus,
        telecallerStatus: selectedTelecallerStatus,
        leadType: selectedLeadType,
        funnelType: selectedFunnel,
      })
      setLeads(res.leads)
      setTotalElements(res.totalElements)
      setTotalPages(res.totalPages)
    } catch (err: any) {
      setError(err?.message || 'Failed to load leads from server.')
      setLeads([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    selectedLeadStatus,
    selectedTelecallerStatus,
    selectedLeadType,
    selectedFunnel,
  ])

  useEffect(() => {
    void fetchLeadsData()
  }, [fetchLeadsData])

  // Stat counters (computed from total elements and lead items)
  const stats = useMemo(() => {
    const total = totalElements
    const pending = leads.filter((l) => (l.leadStatus || '').toUpperCase() === 'PENDING').length
    const inProgress = leads.filter((l) =>
      ['FOLLOW_UP', 'MEETING_SCHEDULED_AT', 'NOT_CONNECTED'].includes((l.leadStatus || '').toUpperCase()),
    ).length
    const converted = leads.filter((l) => (l.leadStatus || '').toUpperCase() === 'DONE').length

    return { total, pending, inProgress, converted }
  }, [totalElements, leads])

  // Table selection
  const allCurrentPageSelected =
    leads.length > 0 && leads.every((l) => selectedLeads.includes(l.leadId))

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const currentIds = new Set(leads.map((l) => l.leadId))
      setSelectedLeads((prev) => prev.filter((id) => !currentIds.has(id)))
    } else {
      const combined = new Set([...selectedLeads, ...leads.map((l) => l.leadId)])
      setSelectedLeads(Array.from(combined))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Delete
  const handleDeleteSelected = async () => {
    if (selectedLeads.length === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedLeads.length} selected lead(s)?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteLeads(selectedLeads, false)
      showToast(`${selectedLeads.length} lead(s) deleted successfully.`, 'success')
      setSelectedLeads([])
      await fetchLeadsData()
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete selected leads.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Assign user to lead
  const handleAssignUser = async (leadId: string, assignedEmail: string) => {
    try {
      await assignLeadToUser(leadId, assignedEmail)
      showToast('Lead assigned successfully.', 'success')
      await fetchLeadsData()
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign lead.', 'error')
    }
  }

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    selectedLeadStatus !== 'all' ||
    selectedTelecallerStatus !== 'all' ||
    selectedLeadType !== 'all' ||
    selectedFunnel !== 'all'

  const clearAllFilters = () => {
    setSearchTerm('')
    setDebouncedSearch('')
    setSelectedLeadStatus('all')
    setSelectedTelecallerStatus('all')
    setSelectedLeadType('all')
    setSelectedFunnel('all')
    setCurrentPage(0)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl max-w-sm animate-in fade-in slide-in-from-top-4">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-xs font-bold text-slate-900 leading-snug">
              {toast.type === 'success' ? 'Success' : 'Notice'}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Header info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <nav className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
            <span>MBG Card</span>
            <span>&rsaquo;</span>
            <span className="text-slate-600 font-medium">Leads Management</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Leads Management
            </h1>
            <span className="text-xs text-slate-400 hidden sm:inline">— Manage and track your sales leads</span>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-3.5 transition-opacity ${refreshing ? 'opacity-60' : ''}`}
        aria-busy={refreshing}
      >
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Leads
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
            {stats.total.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Pending
          </p>
          <p className="text-2xl font-bold text-amber-500 mt-1.5 tracking-tight">
            {stats.pending.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            In Progress
          </p>
          <p className="text-2xl font-bold text-slate-500 mt-1.5 tracking-tight">
            {stats.inProgress.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Converted
          </p>
          <p className="text-2xl font-bold text-emerald-500 mt-1.5 tracking-tight">
            {stats.converted.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Search, Filter bar & Action Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedLeads.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                {selectedLeads.length} selected
              </span>
            )}

            <button
              type="button"
              disabled={selectedLeads.length === 0 || isDeleting}
              onClick={handleDeleteSelected}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs ${
                selectedLeads.length === 0 || isDeleting
                  ? 'bg-rose-100 text-rose-300 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                showFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Filters</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Leads</span>
            </button>

            <button
              type="button"
              disabled={refreshing}
              onClick={() => fetchLeadsData(true)}
              aria-label="Refresh"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Filter Dropdowns */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">
                Sales Status
              </label>
              <select
                value={selectedLeadStatus}
                onChange={(e) => {
                  setSelectedLeadStatus(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                {LEAD_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">
                Telecaller Status
              </label>
              <select
                value={selectedTelecallerStatus}
                onChange={(e) => {
                  setSelectedTelecallerStatus(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Telecaller Statuses</option>
                {TELECALLER_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">
                Lead Type
              </label>
              <select
                value={selectedLeadType}
                onChange={(e) => {
                  setSelectedLeadType(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Lead Types</option>
                {LEAD_TYPE_OPTIONS.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 uppercase">
                Funnel Type
              </label>
              <select
                value={selectedFunnel}
                onChange={(e) => {
                  setSelectedFunnel(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Funnels</option>
                {funnels.map((f, i) => (
                  <option key={f.funnelName || f.id || i} value={f.funnelName || f.funnelType || ''}>
                    {f.funnelName || f.funnelType}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <div className="col-span-full flex justify-end">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Leads Table */}
        <div
          className={`overflow-x-auto rounded-xl border border-slate-200/80 transition-opacity ${refreshing ? 'pointer-events-none opacity-60' : ''}`}
          aria-busy={refreshing}
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                <th className="py-2.5 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3 min-w-[170px]">Customer</th>
                <th className="py-2.5 px-3 min-w-[170px]">Email</th>
                <th className="py-2.5 px-3 min-w-[140px]">Business</th>
                <th className="py-2.5 px-3 min-w-[100px]">Lead Type</th>
                <th className="py-2.5 px-3 min-w-[80px]">Category</th>
                <th className="py-2.5 px-3 min-w-[130px]">Sales Status</th>
                <th className="py-2.5 px-3 min-w-[140px]">Assigned Rep</th>
                <th className="py-2.5 px-3 min-w-[130px]">Telecaller</th>
                <th className="py-2.5 px-3 min-w-[130px]">Telecaller Status</th>
                <th className="py-2.5 px-3 min-w-[125px] text-center">Payment</th>
                <th className="py-2.5 px-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && !refreshing ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading leads data...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                      <p className="font-semibold text-xs mb-1">Failed to fetch leads</p>
                      <p className="text-xs text-rose-600">{error}</p>
                      <button
                        type="button"
                        onClick={() => fetchLeadsData(true)}
                        className="mt-3 px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">No Leads Found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'Try adjusting your search query or filter options.'
                        : 'No leads available yet. Use "Import Leads" to upload your leads Excel sheet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedLeads.includes(lead.leadId)
                  return (
                    <tr
                      key={lead.leadId}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(lead.leadId)}
                          className="rounded w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                            {(lead.ownerName || 'N').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate text-xs">
                              {lead.ownerName || 'na'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate font-mono">
                              {lead.contact || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        <span className="truncate block max-w-[160px]" title={lead.businessEmail || ''}>
                          {lead.businessEmail || '—'}
                        </span>
                      </td>

                      {/* Business */}
                      <td className="py-2.5 px-3 text-slate-700">
                        <div className="truncate max-w-[140px]">
                          <span className="font-medium text-xs block truncate">{lead.businessName || 'na'}</span>
                          {lead.city && (
                            <span className="text-[11px] text-slate-400 block truncate">{lead.city}</span>
                          )}
                        </div>
                      </td>

                      {/* Lead Type */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {lead.leadType || 'Direct'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {lead.category || 'mix'}
                        </span>
                      </td>

                      {/* Sales Status dropdown */}
                      <td className="py-2.5 px-3">
                        <select
                          value={lead.leadStatus || 'PENDING'}
                          onChange={(e) => {
                            const newSt = e.target.value
                            setStatusModalData({
                              leadId: lead.leadId,
                              leadName: lead.ownerName,
                              currentStatus: lead.leadStatus || 'PENDING',
                              newStatus: newSt,
                            })
                            setStatusModalOpen(true)
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                            lead.leadStatus === 'DONE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : lead.leadStatus === 'FOLLOW_UP'
                              ? 'bg-blue-100 text-blue-800'
                              : lead.leadStatus === 'NOT_INTERESTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {LEAD_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Assigned Sales User */}
                      <td className="py-2.5 px-3">
                        <select
                          value={lead.assginedUser || ''}
                          onChange={(e) => handleAssignUser(lead.leadId, e.target.value)}
                          className="w-full max-w-[140px] px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate"
                        >
                          <option value="">Not Assigned</option>
                          {assignableUsers.map((u) => (
                            <option key={u.email || u.username} value={u.email || u.username}>
                              {u.username}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Telecaller */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium inline-block truncate max-w-[120px] ${
                            lead.telecallerAssigned
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'text-slate-400 italic'
                          }`}
                        >
                          {lead.telecallerAssigned || 'Not Assigned'}
                        </span>
                      </td>

                      {/* Telecaller Status */}
                      <td className="py-2.5 px-3">
                        <select
                          value={lead.telecallerStatus || 'PENDING'}
                          onChange={(e) => {
                            const newSt = e.target.value
                            if (newSt === 'FOLLOW_UP') {
                              setSelectedLeadForTelecaller(lead)
                              setTelecallerMode('follow_up')
                              setTelecallerModalOpen(true)
                            } else if (newSt === 'ASSIGNED') {
                              setSelectedLeadForTelecaller(lead)
                              setTelecallerMode('assign')
                              setTelecallerModalOpen(true)
                            }
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                            lead.telecallerStatus === 'ASSIGNED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : lead.telecallerStatus === 'FOLLOW_UP'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {TELECALLER_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Payment */}
                      <td className="py-2.5 px-3 text-center">
                        {lead.paymentLink ? (
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <a
                              href={lead.paymentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1"
                            >
                              <span>Link Active</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(lead.paymentLink!)
                                showToast('Payment link copied to clipboard.', 'success')
                              }}
                              title="Copy Payment Link"
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeadForPayment(lead)
                              setPaymentModalOpen(true)
                            }}
                            className="px-3 py-1 rounded-full text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Generate Link</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLeadForDetails(lead)
                            setDetailsModalOpen(true)
                          }}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
        {totalElements > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(0)
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                Showing {currentPage * pageSize + 1}–
                {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} leads
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-800">
                Page {currentPage + 1} of {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UploadLeadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          showToast('Leads Excel imported successfully!', 'success')
          void fetchLeadsData()
        }}
      />

      <LeadDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        lead={selectedLeadForDetails}
      />

      <GeneratePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false)
          setSelectedLeadForPayment(null)
        }}
        lead={selectedLeadForPayment}
        onSuccess={(url) => {
          showToast('Payment link generated and copied!', 'success')
          if (selectedLeadForPayment) {
            setLeads((prev) =>
              prev.map((l) =>
                l.leadId === selectedLeadForPayment.leadId ? { ...l, paymentLink: url } : l
              )
            )
          }
          void fetchLeadsData()
        }}
      />

      <TelecallerActionModal
        isOpen={telecallerModalOpen}
        onClose={() => setTelecallerModalOpen(false)}
        lead={selectedLeadForTelecaller}
        mode={telecallerMode}
        assignableUsers={assignableUsers}
        onSuccess={() => {
          showToast('Telecaller status updated successfully!', 'success')
          void fetchLeadsData()
        }}
      />

      {statusModalData && (
        <UpdateLeadStatusModal
          isOpen={statusModalOpen}
          onClose={() => {
            setStatusModalOpen(false)
            setStatusModalData(null)
          }}
          leadId={statusModalData.leadId}
          leadName={statusModalData.leadName}
          currentStatus={statusModalData.currentStatus}
          newStatus={statusModalData.newStatus}
          onSuccess={() => {
            showToast('Sales status updated successfully!', 'success')
            void fetchLeadsData()
          }}
        />
      )}
    </div>
  )
}

