import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Megaphone,
  PhoneCall,
  PhoneOutgoing,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Tag,
  Building2,
  FileAudio,
  Settings,
} from 'lucide-react'
import {
  getVoiceCampaigns,
  getVoiceCampaignAnalytics,
  type VoiceCampaignItem,
  type VoiceCampaignQuery,
} from '../../../api/voice-campaign.api'
import { RefreshButton } from '../../../components/ui/RefreshButton'
import { VoiceSettingsModal } from './VoiceSettingsModal'

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CampaignStatusBadge = ({ status }: { status?: string | null }) => {
  const s = (status || '').toUpperCase()

  if (s === 'SUCCESS' || s === 'ANSWERED' || s === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        {status}
      </span>
    )
  }

  if (s === 'INITIATED' || s === 'PROCESSING' || s === 'QUEUED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-700 shadow-sm">
        <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin" />
        {status}
      </span>
    )
  }

  if (s === 'FAILED' || s === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-sm">
        <XCircle className="h-3.5 w-3.5 text-rose-600" />
        {status}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {status || '—'}
    </span>
  )
}

export function AdminVoiceCampaignPage() {
  const [page, setPage] = useState(0)
  const pageSize = 15
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedCall, setSelectedCall] = useState<VoiceCampaignItem | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const queryParams: VoiceCampaignQuery = {
    page,
    size: pageSize,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    search: searchInput.trim() || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sortBy: 'createdAt',
    sortDir: 'desc',
  }

  const {
    data: campaignsData,
    isLoading,
    isFetching,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: ['voice-campaigns', queryParams],
    queryFn: () => getVoiceCampaigns(queryParams),
    placeholderData: keepPreviousData,
  })

  const {
    data: analyticsData,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['voice-campaigns-analytics'],
    queryFn: getVoiceCampaignAnalytics,
  })

  const handleRefresh = async () => {
    await Promise.all([refetchCampaigns(), refetchAnalytics()])
  }

  const handleClearFilters = () => {
    setStatusFilter('ALL')
    setSearchInput('')
    setFromDate('')
    setToDate('')
    setPage(0)
  }

  // Extract items flexibly from CustomPageResponse (data) or Spring Page (content) or raw array
  const items: VoiceCampaignItem[] = Array.isArray(campaignsData)
    ? campaignsData
    : Array.isArray(campaignsData?.data)
    ? campaignsData.data
    : Array.isArray(campaignsData?.content)
    ? campaignsData.content
    : []

  const totalElements =
    campaignsData?.totalElements ??
    campaignsData?.total ??
    items.length

  const totalPages =
    campaignsData?.totalPage ??
    campaignsData?.totalPages ??
    (pageSize > 0 ? Math.ceil(totalElements / pageSize) : 1)

  const analytics = (
    analyticsData && 'data' in (analyticsData as any) && typeof (analyticsData as any).data === 'object'
      ? (analyticsData as any).data
      : analyticsData || {}
  ) as Partial<VoiceCampaignAnalytics>

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Voice Campaigns (OBD)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Outbound automated voice broadcasting, ticket alerts, and Cloudshope campaign history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Voice OBD Settings</span>
          </button>
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isFetching} />
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PhoneCall className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Campaigns</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
              {analytics?.totalCampaigns ?? '—'}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Calls</p>
            <h3 className="text-2xl font-bold text-sky-700 mt-0.5">
              {analytics?.totalToday ?? '—'}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <PhoneOutgoing className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Initiated</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-0.5">
              {analytics?.totalInitiated ?? '—'}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed / Success</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-0.5">
              {analytics?.totalSuccess ?? '—'}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Failed</p>
            <h3 className="text-2xl font-bold text-rose-700 mt-0.5">
              {analytics?.totalFailed ?? '—'}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone, ticket #, customer name, or campaign..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(0)
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="INITIATED">Initiated</option>
              <option value="SUCCESS">Success / Answered</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearFilters}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all w-full"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Date Filter row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-500">Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(0)
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(0)
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Date / Time</th>
                <th className="py-3.5 px-4">Campaign Name</th>
                <th className="py-3.5 px-4">Recipient Phone</th>
                <th className="py-3.5 px-4">Caller ID (CLI)</th>
                <th className="py-3.5 px-4">Linked Ticket</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Voice File</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="h-6 w-6 animate-spin text-indigo-500" />
                      <p className="text-sm font-medium">Loading voice campaigns...</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Megaphone className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No campaigns found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((call) => (
                  <tr key={call.id || call.sessionId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                      {formatDateTime(call.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 text-xs">
                        {call.campaignName || '—'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-800">
                      {call.recipientNumber}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-600">
                      {call.callingNumber || '—'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {call.ticketNumber ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-semibold border border-indigo-200/60 font-mono">
                          <Tag className="h-3 w-3" />
                          {call.ticketNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                      {call.customerName || '—'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {call.voiceFileId ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-mono">
                          <FileAudio className="h-3.5 w-3.5 text-indigo-500" />
                          {call.voiceFileId}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <CampaignStatusBadge status={call.overallCallStatus || call.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 rounded-lg transition-all"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/80 bg-slate-50/50 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-800">{items.length}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalElements}</span> campaigns
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <span className="px-2 font-semibold text-slate-700">
                Page {page + 1} of {totalPages}
              </span>

              <button
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Voice Campaign Details</h3>
                  <p className="text-xs text-slate-500 font-mono">Session: {selectedCall.sessionId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Recipient Number:</span>
                  <p className="font-bold text-slate-800 text-sm font-mono mt-0.5">{selectedCall.recipientNumber}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Caller ID (CLI):</span>
                  <p className="font-bold text-slate-800 text-sm font-mono mt-0.5">{selectedCall.callingNumber || '—'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Campaign Name:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedCall.campaignName || '—'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Voice File ID:</span>
                  <p className="font-bold text-slate-800 mt-0.5 font-mono">{selectedCall.voiceFileId || '—'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Ticket Number:</span>
                  <p className="font-bold text-slate-800 mt-0.5 font-mono">{selectedCall.ticketNumber || '—'}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <div className="mt-1">
                    <CampaignStatusBadge status={selectedCall.overallCallStatus || selectedCall.status} />
                  </div>
                </div>
              </div>

              {selectedCall.providerResponse && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Provider Response:</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                    {selectedCall.providerResponse}
                  </pre>
                </div>
              )}

              {selectedCall.metadata && Object.keys(selectedCall.metadata).length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Metadata:</span>
                  <pre className="p-3 bg-slate-50 text-slate-700 font-mono text-[11px] rounded-xl border border-slate-100 overflow-x-auto">
                    {JSON.stringify(selectedCall.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice OBD Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={handleRefresh}
      />
    </div>
  )
}
