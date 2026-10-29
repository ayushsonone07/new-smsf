import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Workflow,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ListOrdered,
  ArrowRight,
} from 'lucide-react'
import {
  getServiceFlows,
  type ServiceFlowItem,
} from '../../../api/service-flow.api'

export interface FlowStepDetail {
  order?: number
  stepNumber?: number | string
  name?: string
  description?: string
  days?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: any
}

function formatDepartmentName(dept?: string): string {
  if (!dept) return 'General'
  return dept
    .replace(/_DEPARTMENT$/i, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDepartmentColor(dept?: string) {
  const d = (dept || '').toUpperCase()
  if (d.includes('GOOGLE')) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (d.includes('WEBSITE')) return 'bg-cyan-50 text-cyan-700 border-cyan-200'
  if (d.includes('AUTOMATION')) return 'bg-purple-50 text-purple-700 border-purple-200'
  if (d.includes('SUPPORT')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (d.includes('SALES')) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (d.includes('SEO')) return 'bg-teal-50 text-teal-700 border-teal-200'
  if (d.includes('BILLING')) return 'bg-violet-50 text-violet-700 border-violet-200'
  return 'bg-slate-50 text-slate-700 border-slate-200'
}

export function ServiceFlowsDirectoryPage() {
  const [items, setItems] = useState<ServiceFlowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Expanded row or detail modal
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalItem, setModalItem] = useState<ServiceFlowItem | null>(null)

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
      const res = await getServiceFlows({
        page,
        size,
        serviceName: debouncedSearch.trim() || undefined,
        departmentType: departmentFilter === 'ALL' ? undefined : departmentFilter,
      })
      setItems(res.data)
      setTotalElements(res.totalElements)
      setTotalPages(res.totalPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service flows')
    } finally {
      setLoading(false)
    }
  }, [page, size, debouncedSearch, departmentFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const departmentsList = [
    { key: 'ALL', label: 'All Departments' },
    { key: 'GOOGLE_DEPARTMENT', label: 'Google' },
    { key: 'WEBSITE_DEPARTMENT', label: 'Website' },
    { key: 'AUTOMATION_DEPARTMENT', label: 'Automation' },
    { key: 'AUTOWEBSION_DEPARTMENT', label: 'Autowebsion' },
    { key: 'SUPPORT_DEPARTMENT', label: 'Support' },
    { key: 'SEO_DEPARTMENT', label: 'SEO' },
    { key: 'SALES_DEPARTMENT', label: 'Sales' },
    { key: 'BILLING_DEPARTMENT', label: 'Billing' },
  ]

  const extractSteps = (flow?: Record<string, any> | null): Array<{ key: string; step: FlowStepDetail }> => {
    if (!flow || typeof flow !== 'object') return []
    return Object.entries(flow)
      .map(([k, v]) => ({ key: k, step: v }))
      .sort((a, b) => {
        const numA = Number(a.step?.stepNumber ?? a.key.replace(/\D/g, '')) || 0
        const numB = Number(b.step?.stepNumber ?? b.key.replace(/\D/g, '')) || 0
        return numA - numB
      })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 font-sans">
      {/* Top Banner / Breadcrumb */}
      <div>
        <nav className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
          <span>MBG Card</span>
          <span>&rsaquo;</span>
          <span>Management</span>
          <span>&rsaquo;</span>
          <span className="text-slate-600 font-medium">Service Flows</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <Workflow className="w-5 h-5" />
              </span>
              Service Flows & Step Definitions
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configured department service workflows, milestones and sub-service stage blueprints
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search service name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
            />
          </div>

          {/* Department Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value)
                setPage(0)
              }}
              className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-purple-500 focus:bg-white transition-all"
            >
              {departmentsList.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing {items.length} of {totalElements} configured flow{totalElements === 1 ? '' : 's'}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadData()}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Workflow Steps</th>
                <th className="py-3 px-4">Step Sequence Preview</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-4 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-40 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-5 w-24 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-4 w-10 bg-slate-200 rounded mx-auto" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-64 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="h-7 w-16 bg-slate-200 rounded-lg mx-auto" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Workflow className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5] mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No service flows found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No workflows match the specified search or department filter
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const steps = extractSteps(item.serviceFlow)
                  const deptColor = getDepartmentColor(item.departmentType)
                  const rowNum = page * size + idx + 1
                  const isExpanded = expandedId === item.departmentServiceId

                  return (
                    <React.Fragment key={item.departmentServiceId || idx}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                          {rowNum}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {item.departmentServiceName}
                          </div>
                          {item.departmentServiceId && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {item.departmentServiceId}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${deptColor}`}
                          >
                            {formatDepartmentName(item.departmentType)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                            <ListOrdered className="w-3.5 h-3.5" />
                            {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {steps.slice(0, 3).map((st, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                              >
                                <span className="w-3.5 h-3.5 rounded-full bg-slate-300 text-slate-800 text-[9px] flex items-center justify-center font-bold">
                                  {st.step.stepNumber ?? sIdx + 1}
                                </span>
                                <span className="max-w-[130px] truncate">{st.step.name || st.key}</span>
                              </span>
                            ))}
                            {steps.length > 3 && (
                              <span className="text-[11px] text-slate-400 font-semibold">
                                +{steps.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setModalItem(item)}
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                              title="View full workflow details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : item.departmentServiceId)
                              }
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand row'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Flow Detail Row */}
                      {isExpanded && (
                        <tr className="bg-purple-50/30 border-y border-purple-100">
                          <td colSpan={6} className="py-4 px-8">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Workflow className="w-3.5 h-3.5 text-purple-600" />
                                Sequence Flow for {item.departmentServiceName}
                              </h4>
                              {steps.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  No steps defined for this service flow.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {steps.map((st, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                          Step {st.step.stepNumber ?? sIdx + 1}
                                        </span>
                                        {st.step.status ? (
                                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                            {String(st.step.status)}
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="font-semibold text-slate-800 text-xs">
                                        {st.step.name || st.key}
                                      </div>
                                      {st.step.description && (
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                          {st.step.description}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value))
                setPage(0)
              }}
              className="py-1 px-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none focus:border-purple-500"
            >
              {[10, 20, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
            <span>
              Showing {items.length > 0 ? page * size + 1 : 0}–
              {Math.min((page + 1) * size, totalElements)} of {totalElements}
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

      {/* Modal View for full flow details */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border mb-1.5 ${getDepartmentColor(
                    modalItem.departmentType,
                  )}`}
                >
                  {formatDepartmentName(modalItem.departmentType)}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {modalItem.departmentServiceName}
                </h3>
                <p className="text-xs text-slate-400">ID: {modalItem.departmentServiceId}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Workflow className="w-4 h-4 text-purple-600" />
                Service Steps Roadmap
              </h4>

              {extractSteps(modalItem.serviceFlow).length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                  No steps defined for this service flow.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {extractSteps(modalItem.serviceFlow).map((st, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {st.step.stepNumber ?? sIdx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-slate-900 text-xs">
                            {st.step.name || st.key}
                          </h5>
                          {st.step.status ? (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                              {String(st.step.status)}
                            </span>
                          ) : null}
                        </div>
                        {st.step.description && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {st.step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setModalItem(null)}
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
