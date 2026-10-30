import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  RotateCw,
  Bell,
  Search,
  Plus,
  Clock,
} from 'lucide-react'
import {
  fetchAdminServiceFlows,
  updateAdminServiceTimeline,
  getAdminServices,
  fetchPendingTimelineRequests,
  type AdminServiceFlowItem,
} from '../../../api/admin-services.api'
import { PageLayout } from '../../../components/layout/PageLayout'
import { LoadingState } from '../../../components/ui/LoadingState'
import { PendingApprovalsModal } from '../components/PendingApprovalsModal'
import { AddAdminServiceModal } from '../../../components/departments/AddAdminServiceModal'
import { FlowBuilderModal } from '../head/components/FlowBuilderModal'
import type { ServiceFlowItem } from '../../../api/service-flow.api'
import './AdminTimelinesPage.css'

function formatDeptName(deptType: string): string {
  if (!deptType) return 'General'
  const clean = deptType.replace(/_DEPARTMENT$/i, '')
  if (clean.toUpperCase() === 'SMO') return 'SMO'
  if (clean.toUpperCase() === 'SEO') return 'SEO'
  return clean
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function AdminTimelinesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [deptFilter, setDeptFilter] = useState('ALL')
  const [serviceSearch, setServiceSearch] = useState('')
  const [customDaysMap, setCustomDaysMap] = useState<Record<string, number>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Modals
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false)
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false)
  const [editingFlow, setEditingFlow] = useState<ServiceFlowItem | null>(null)

  const [feedback, setFeedback] = useState<{
    msg: string
    type: 'ok' | 'err'
  } | null>(null)

  const pendingTimelineQuery = useQuery({
    queryKey: ['pending-timeline-requests'],
    queryFn: fetchPendingTimelineRequests,
    staleTime: 60_000,
  })

  const pendingCount = pendingTimelineQuery.data?.length ?? 0

  const servicesQuery = useQuery({
    queryKey: ['admin-services'],
    queryFn: getAdminServices,
    staleTime: 60_000,
  })

  const flowsQuery = useQuery({
    queryKey: ['admin-service-flows', deptFilter],
    queryFn: () =>
      fetchAdminServiceFlows({
        departmentType: deptFilter !== 'ALL' ? deptFilter : undefined,
      }),
    staleTime: 60_000,
  })

  const updateTimelineMutation = useMutation({
    mutationFn: updateAdminServiceTimeline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-flows'] })
      queryClient.invalidateQueries({ queryKey: ['pending-timeline-requests'] })
      queryClient.invalidateQueries({ queryKey: ['service-flows'] })
    },
    onSettled: () => {
      setProcessingId(null)
    },
  })

  const availableDepartmentTypes = useMemo(() => {
    const list = servicesQuery.data ?? []
    return Array.from(new Set(list.map((s) => s.departmentType).filter(Boolean)))
  }, [servicesQuery.data])

  function showFeedback(msg: string, type: 'ok' | 'err' = 'ok') {
    setFeedback({ msg, type })
    setTimeout(() => setFeedback(null), 4000)
  }

  async function handleSetTimeline(
    serviceId: string,
    days: number,
    serviceName?: string,
  ) {
    if (!days || days < 1) {
      showFeedback('Please enter a valid timeline (minimum 1 day).', 'err')
      return
    }
    setProcessingId(serviceId)
    try {
      await updateTimelineMutation.mutateAsync({ serviceId, time: days })
      showFeedback(
        `Timeline for "${serviceName || 'service'}" set to ${days} days and approved!`,
        'ok',
      )
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to update service timeline.'
      showFeedback(errMsg, 'err')
    }
  }

  const isRefreshing =
    (flowsQuery.isFetching && !flowsQuery.isLoading) ||
    pendingTimelineQuery.isFetching

  const allFlows = flowsQuery.data ?? []

  const flowsList = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    return allFlows.filter((item) => {
      if (!q) return true
      return (
        item.departmentServiceName?.toLowerCase().includes(q) ||
        item.departmentType?.toLowerCase().includes(q)
      )
    })
  }, [allFlows, serviceSearch])

  return (
    <PageLayout>
      <div className="sop-page-container">
        {/* 1. Header Bar */}
        <header className="sop-page-header">
          <div className="sop-page-title-wrap">
            <h1 className="sop-page-title">Services &amp; SOP</h1>
            <span className="sop-page-subtitle">
              Services, SOP statuses and turnaround times
            </span>
          </div>

          <div className="sop-header-actions">
            {pendingCount > 0 && (
              <button
                type="button"
                className="sop-header-icon-btn"
                onClick={() => setIsApprovalsModalOpen(true)}
                title={`${pendingCount} Pending Timeline Approvals`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="sop-pending-badge">{pendingCount}</span>
              </button>
            )}

            <button
              type="button"
              className="sop-header-icon-btn"
              onClick={() => {
                flowsQuery.refetch()
                pendingTimelineQuery.refetch()
              }}
              title="Refresh services"
              disabled={isRefreshing}
            >
              <RotateCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              className="sop-header-icon-btn"
              onClick={() => navigate({ to: '/admin/notification-history' as any })}
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </header>

        {/* 2. Toolbar Row: Tabs, Search & Actions */}
        <div className="sop-toolbar">
          <div className="sop-toolbar-left">
            {/* Service List vs SOP & timeline tabs */}
            <div className="sop-nav-tabs">
              <button
                type="button"
                className="sop-nav-tab"
                onClick={() => navigate({ to: '/admin/services' as any })}
              >
                Service List
              </button>
              <button
                type="button"
                className="sop-nav-tab is-active"
              >
                SOP &amp; timeline
              </button>
            </div>

            {/* Search Input */}
            <div className="sop-search-wrap">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="Search services"
                className="sop-search-input"
              />
            </div>
          </div>

          <div className="sop-toolbar-right">
            {/* Department Filter Dropdown */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="sop-dept-select"
            >
              <option value="ALL">All departments</option>
              {availableDepartmentTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {formatDeptName(dt)}
                </option>
              ))}
            </select>

            {/* + Add Service Button */}
            <button
              type="button"
              className="sop-add-service-btn"
              onClick={() => setIsAddServiceOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* 3. Pale Yellow Authority Banner */}
        <div className="sop-authority-banner">
          <span>⚡</span>
          <span>
            <strong>Super Admin authority:</strong> timelines you set here are approved immediately — no second approval needed.
          </span>
        </div>

        {/* Toast Feedback */}
        {feedback && (
          <div className={`sop-feedback-alert ${feedback.type === 'ok' ? 'is-ok' : 'is-err'}`}>
            <span>{feedback.type === 'ok' ? '✓' : '✕'}</span>
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* 4. Main White Card */}
        <div className="sop-main-card">
          <div className="sop-card-header">
            <h2 className="sop-card-title">SOP &amp; turnaround time</h2>
            <span className="sop-count-pill">
              {flowsList.length} of {allFlows.length}
            </span>
          </div>

          {flowsQuery.isLoading ? (
            <LoadingState message="Loading department services and SOP timelines..." />
          ) : flowsQuery.isError ? (
            <div className="sop-empty-state text-red-500">
              Failed to load services: {(flowsQuery.error as Error)?.message}
            </div>
          ) : flowsList.length === 0 ? (
            <div className="sop-empty-state">
              No services found matching your criteria.
            </div>
          ) : (
            <div
              className={`sop-table-wrap transition-opacity duration-200 ${
                isRefreshing ? 'pointer-events-none opacity-60' : ''
              }`}
              aria-busy={isRefreshing}
            >
              <table className="sop-table">
                <thead>
                  <tr>
                    <th className="sop-th-service">SERVICE</th>
                    <th className="sop-th-dept">DEPARTMENT</th>
                    <th className="sop-th-statuses">SOP STATUSES</th>
                    <th className="sop-th-tat">CURRENT TAT</th>
                    <th className="sop-th-settat">SET TAT (DAYS)</th>
                    <th className="sop-th-action" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {flowsList.map((flow) => {
                    const timeline = flow.serviceTimeline?.timeline
                    const currentDays = timeline?.time ?? 0
                    const status = timeline?.updation?.status
                    const isApproved = status === 'APPROVED' || currentDays > 0

                    const inputVal =
                      customDaysMap[flow.departmentServiceId] ??
                      (currentDays > 0 ? currentDays : 3)
                    const isBusy = processingId === flow.departmentServiceId

                    // Extract SOP flow step names in order
                    const stepEntries = Object.entries(flow.serviceFlow ?? {})
                      .sort((a, b) => (a[1]?.order ?? 0) - (b[1]?.order ?? 0))
                      .map(([name]) => name)

                    const visibleSteps = stepEntries.slice(0, 3)
                    const extraCount = stepEntries.length - visibleSteps.length

                    const handleOpenFlowModal = () => {
                      const asItem: ServiceFlowItem = {
                        departmentServiceId: flow.departmentServiceId,
                        departmentServiceName: flow.departmentServiceName,
                        departmentType: flow.departmentType,
                        serviceFlow: (flow.serviceFlow ?? {}) as any,
                        serviceTimeline: flow.serviceTimeline as any,
                      }
                      setEditingFlow(asItem)
                    }

                    return (
                      <tr key={flow.departmentServiceId} className="sop-row">
                        {/* 1. Service Name */}
                        <td>
                          <span className="sop-service-name">
                            {flow.departmentServiceName}
                          </span>
                        </td>

                        {/* 2. Department */}
                        <td>
                          <span className="sop-dept-name">
                            {formatDeptName(flow.departmentType)}
                          </span>
                        </td>

                        {/* 3. SOP Statuses Pills */}
                        <td>
                          <div className="sop-statuses-wrap">
                            {visibleSteps.length > 0 ? (
                              <>
                                {visibleSteps.map((step) => (
                                  <span key={step} className="sop-status-pill">
                                    {step}
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  className="sop-status-edit-btn"
                                  onClick={handleOpenFlowModal}
                                >
                                  {extraCount > 0 ? `+${extraCount} Edit` : 'Edit'}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="sop-status-edit-btn"
                                onClick={handleOpenFlowModal}
                              >
                                + Add SOP
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Current TAT */}
                        <td>
                          {currentDays > 0 ? (
                            <span className="sop-tat-badge-approved">
                              {currentDays} {currentDays === 1 ? 'day' : 'days'}
                              {isApproved ? ' · Approved' : ''}
                            </span>
                          ) : (
                            <span className="sop-tat-not-set">Not set</span>
                          )}
                        </td>

                        {/* 5. Set TAT (Days) Input */}
                        <td className="text-center">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={inputVal}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10)
                              setCustomDaysMap((prev) => ({
                                ...prev,
                                [flow.departmentServiceId]: isNaN(val) ? 0 : val,
                              }))
                            }}
                            className="sop-days-input"
                          />
                        </td>

                        {/* 6. Action: Set Button */}
                        <td className="text-right">
                          <button
                            type="button"
                            className="sop-set-btn"
                            disabled={isBusy || inputVal < 1}
                            onClick={() =>
                              handleSetTimeline(
                                flow.departmentServiceId,
                                inputVal,
                                flow.departmentServiceName,
                              )
                            }
                          >
                            {isBusy ? 'Saving...' : 'Set'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal 1: Flow Builder (SOP steps edit) */}
        {editingFlow && (
          <FlowBuilderModal
            isOpen={Boolean(editingFlow)}
            onClose={() => setEditingFlow(null)}
            flow={editingFlow}
            departmentType={editingFlow.departmentType}
            onSuccess={() => {
              flowsQuery.refetch()
              setEditingFlow(null)
            }}
          />
        )}

        {/* Modal 2: Add Service */}
        <AddAdminServiceModal
          open={isAddServiceOpen}
          onClose={() => setIsAddServiceOpen(false)}
          onCreated={() => {
            setIsAddServiceOpen(false)
            flowsQuery.refetch()
            servicesQuery.refetch()
          }}
        />

        {/* Modal 3: Pending Approvals */}
        <PendingApprovalsModal
          open={isApprovalsModalOpen}
          onClose={() => setIsApprovalsModalOpen(false)}
        />
      </div>
    </PageLayout>
  )
}
