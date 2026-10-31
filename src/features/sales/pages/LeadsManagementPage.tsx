import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Trash2,
  Copy,
  ExternalLink,
  Loader2,
  TrendingUp,
  LayoutGrid,
  CreditCard,
  UserPlus,
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
import { AddLeadModal } from '../components/AddLeadModal'
import { LeadDetailsModal } from '../components/LeadDetailsModal'
import { TelecallerActionModal } from '../components/TelecallerActionModal'
import { UpdateLeadStatusModal } from '../components/UpdateLeadStatusModal'
import { GeneratePaymentModal } from '../components/GeneratePaymentModal'
import { TransferLeadModal } from '../components/TransferLeadModal'
import { SalesSummaryView } from '../components/SalesSummaryView'
import { CustomerPaymentView } from '../../payment/components/CustomerPaymentView'
import '../../customers/pages/AdminCustomersPage.css'

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

function isNa(val?: string | null): boolean {
  if (!val) return true
  const v = val.trim().toLowerCase()
  return v === '' || v === 'na' || v === 'n/a' || v === 'null' || v === 'undefined'
}

function getCustomerDisplay(lead: LeadInfo): { name: string; initial: string } {
  if (!isNa(lead.ownerName)) {
    const trimmed = lead.ownerName!.trim()
    return { name: trimmed, initial: trimmed.charAt(0).toUpperCase() }
  }

  if (!isNa(lead.businessName)) {
    const trimmed = lead.businessName!.trim()
    return { name: trimmed, initial: trimmed.charAt(0).toUpperCase() }
  }

  if (lead.businessEmail && lead.businessEmail.includes('@')) {
    const emailPrefix = lead.businessEmail.split('@')[0].replace(/[._0-9]/g, ' ').trim()
    if (emailPrefix) {
      const formatted = emailPrefix
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
      return { name: formatted, initial: formatted.charAt(0).toUpperCase() }
    }
  }

  if (lead.contact) {
    return { name: `Lead ${lead.contact}`, initial: 'L' }
  }

  return { name: `Lead #${lead.leadId?.slice(-4) || '—'}`, initial: 'L' }
}

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
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<LeadInfo | null>(null)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [leadsToTransfer, setLeadsToTransfer] = useState<LeadInfo[]>([])
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
    if (activeMainTab === 'leads') {
      void fetchLeadsData()
    }
  }, [fetchLeadsData, activeMainTab])

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
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
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

  const start = totalElements === 0 ? 0 : currentPage * pageSize + 1
  const end = Math.min((currentPage + 1) * pageSize, totalElements)

  return (
    <div className="space-y-4 font-sans">
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
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation (Leads, Summary, Payments) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab('leads')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'leads'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Leads Management</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('summary')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'summary'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Sales Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('payments')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Customer Payments</span>
        </button>
      </div>

      {activeMainTab === 'summary' && <SalesSummaryView />}
      {activeMainTab === 'payments' && <CustomerPaymentView />}

      {activeMainTab === 'leads' && (
        <section className="content-card admin-customers-card border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden">
          {/* Card Heading with Title, Subtitle & Action Toolbar */}
          <div className="admin-customers-card__heading flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Customers</h2>
              <p className="text-xs text-slate-500 mt-0.5">{totalElements.toLocaleString('en-IN')} customer accounts</p>
            </div>

            {/* Action Bar Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Box */}
              <div className="relative w-64 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedLeads.length > 0 && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedLeads.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
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
                onClick={() => setAddLeadModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Lead</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Leads</span>
              </button>

              <button
                type="button"
                disabled={refreshing}
                onClick={() => fetchLeadsData(true)}
                aria-label="Refresh"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {showFilters && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Table matching AdminCustomersPage / DataTable layout */}
          <div className="table-wrapper border-0 rounded-none overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[200px]">CUSTOMER</th>
                  <th className="py-3 px-4 min-w-[190px]">EMAIL</th>
                  <th className="py-3 px-4 min-w-[130px]">PHONE</th>
                  <th className="py-3 px-4 min-w-[160px]">BUSINESS</th>
                  <th className="py-3 px-4 min-w-[120px]">STATUS</th>
                  <th className="py-3 px-4 min-w-[140px]">ASSIGNED REP</th>
                  <th className="py-3 px-4 min-w-[110px] text-center">PAYMENT</th>
                  <th className="py-3 px-4 w-14 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading && !refreshing ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Loading leads data...</span>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                        <p className="font-semibold text-xs mb-1">Failed to fetch leads</p>
                        <p className="text-xs text-rose-600 mb-2">{error}</p>
                        <button
                          type="button"
                          onClick={() => fetchLeadsData(true)}
                          className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                        >
                          Try Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mb-1">No Leads Found</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {hasActiveFilters
                          ? 'Try adjusting your search query or filter options.'
                          : 'No leads available yet. Use "Import Leads" to upload your Excel sheet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.leadId)
                    const customerInfo = getCustomerDisplay(lead)
                    const isPending = (lead.leadStatus || 'PENDING') === 'PENDING'
                    const isDone = (lead.leadStatus || '').toUpperCase() === 'DONE'

                    return (
                      <tr
                        key={lead.leadId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(lead.leadId)}
                            className="rounded w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Customer Identity matching AdminCustomersPage */}
                        <td className="py-3 px-4">
                          <div className="admin-customer-identity">
                            <span className="admin-customer-avatar">
                              {customerInfo.initial}
                            </span>
                            <div>
                              <strong>{customerInfo.name}</strong>
                              <span>Customer account</span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="truncate block max-w-[180px]" title={lead.businessEmail || ''}>
                            {lead.businessEmail || '—'}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 font-bold text-slate-800 font-mono tracking-tight">
                          {lead.contact || '—'}
                        </td>

                        {/* Business */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="truncate block max-w-[160px]" title={lead.businessName || ''}>
                            {!isNa(lead.businessName) ? lead.businessName : '—'}
                          </span>
                        </td>

                        {/* Status matching admin-customer-status */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalData({
                                leadId: lead.leadId,
                                leadName: customerInfo.name,
                                currentStatus: lead.leadStatus || 'PENDING',
                                newStatus: isDone ? 'PENDING' : 'DONE',
                              })
                              setStatusModalOpen(true)
                            }}
                            className={`admin-customer-status cursor-pointer border-0 ${
                              isDone
                                ? ''
                                : isPending
                                ? 'bg-amber-100/80 text-amber-800'
                                : 'admin-customer-status--inactive'
                            }`}
                            title="Click to update status"
                          >
                            {lead.leadStatus || 'PENDING'}
                          </button>
                        </td>

                        {/* Assigned Rep */}
                        <td className="py-3 px-4">
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

                        {/* Payment */}
                        <td className="py-3 px-4 text-center">
                          {lead.paymentLink ? (
                            <a
                              href={lead.paymentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-customer-status inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Active</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeadForPayment(lead)
                                setPaymentModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                            >
                              Generate Link
                            </button>
                          )}
                        </td>

                        {/* Actions matching admin-customer-view-button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            className="admin-customer-view-button mx-auto"
                            onClick={() => {
                              setSelectedLeadForDetails(lead)
                              setDetailsModalOpen(true)
                            }}
                            title={`View details for ${customerInfo.name}`}
                            aria-label={`View details for ${customerInfo.name}`}
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer matching AdminCustomersPage */}
          <div className="admin-customers-pagination">
            <label>
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setCurrentPage(0)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <div className="admin-customers-pagination__buttons">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>
              <span>Page {currentPage + 1} of {Math.max(1, totalPages)}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next →
              </button>
            </div>
            <span>Showing {start}–{end} of {totalElements.toLocaleString('en-IN')}</span>
          </div>
        </section>
      )}

      {/* Modals */}
      <TransferLeadModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        leads={leadsToTransfer}
        assignableUsers={assignableUsers}
        onTransferred={() => {
          showToast(
            leadsToTransfer.length > 1
              ? `${leadsToTransfer.length} leads transferred successfully!`
              : 'Lead transferred successfully!',
            'success',
          )
          fetchLeadsData()
          setSelectedLeads([])
        }}
      />

      <AddLeadModal
        isOpen={addLeadModalOpen}
        onClose={() => setAddLeadModalOpen(false)}
        onSuccess={() => {
          showToast('Lead added successfully!', 'success')
          void fetchLeadsData()
        }}
        funnels={funnels}
        leadStatusOptions={LEAD_STATUS_OPTIONS}
        platformOptions={LEAD_TYPE_OPTIONS}
      />

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
        onTransferClick={(lead) => {
          setLeadsToTransfer([lead])
          setTransferModalOpen(true)
        }}
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
