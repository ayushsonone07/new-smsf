import { useState, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { getSession } from '../../../../app/auth/session'
import {
  getServiceFlows,
  getDepartmentConfig,
  updateServiceTimeline,
  decideServiceTimeline,
  type ServiceFlowItem,
} from '../../../../api/service-flow.api'
import { getDepartmentTypes, normalizeDepartmentTypeName } from '../../../../api/dynamic-permission.api'
import { resolveDeptFromPath } from '../utils/routeUtils'
import { SearchBar } from '../../../../components/head/shared/SearchBar'
import { SectionCard } from '../../../../components/head/shared/SectionCard'
import { Pill } from '../../../../components/ui/Pill'
import { LoadingState } from '../../../../components/ui/LoadingState'
import { ErrorState } from '../../../../components/ui/ErrorState'
import { Icon } from '../../../../components/head/shared/Icon'
import { FlowBuilderModal } from '../components/FlowBuilderModal'
import { AddServiceFlowModal } from '../components/AddServiceFlowModal'
import type { FeaturePermission } from '../../../permissions/types/permission.types'
import './MeetingPage.css'

const PENCIL_ICON = 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'
const GIT_BRANCH_ICON = 'M6 3v6m0 0a3 3 0 1 0 3 3V9a3 3 0 0 0-3-3Zm12 6v6m0 0a3 3 0 1 0 3 3v-6a3 3 0 0 0-3-3ZM6 9h12'
const CLOCK_ICON = 'M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z'

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function ServiceFlowPage(_props?: { feature?: FeaturePermission }) {
  const session = getSession()
  // Backend SUPERADMIN roles are normalized to ADMIN when the session is created.
  const isSuperAdmin = session?.user.role === 'ADMIN'

  // Detect department from route params or URL pathname or user session
  const { departmentName } = useParams({ strict: false }) as { departmentName?: string }
  const deptFromUrl = typeof window !== 'undefined' ? resolveDeptFromPath(window.location.pathname) : null
  const defaultDept = useMemo(() => {
    if (session?.user.departmentType) return session.user.departmentType
    if (departmentName) return normalizeDepartmentTypeName(departmentName)
    if (deptFromUrl) return normalizeDepartmentTypeName(deptFromUrl)
    return isSuperAdmin ? 'ALL' : 'GOOGLE_DEPARTMENT'
  }, [departmentName, deptFromUrl, session?.user.departmentType, isSuperAdmin])

  const [selectedDept, setSelectedDept] = useState<string>(defaultDept)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [editingFlow, setEditingFlow] = useState<ServiceFlowItem | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [timelineModalFlow, setTimelineModalFlow] = useState<ServiceFlowItem | null>(null)
  const [newTimelineDays, setNewTimelineDays] = useState<number>(3)
  const [isSubmittingTimeline, setIsSubmittingTimeline] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const pageSize = 10

  // 1. All department types (for SuperAdmin dropdown)
  const deptTypesQuery = useQuery({
    queryKey: ['department-types-for-service-flow'],
    queryFn: getDepartmentTypes,
    enabled: isSuperAdmin,
    staleTime: 5 * 60_000,
  })

  // 2. Service Flows API: /api/service/flows?page=0&size=10&departmentType=...
  const flowsQuery = useQuery({
    queryKey: ['service-flows', { page, size: pageSize, search, departmentType: selectedDept }],
    queryFn: () =>
      getServiceFlows({
        page,
        size: pageSize,
        serviceName: search || undefined,
        departmentType: selectedDept !== 'ALL' ? selectedDept : undefined,
      }),
    staleTime: 30_000,
  })

  // 3. Department Config API
  const configQuery = useQuery({
    queryKey: ['dept-config', selectedDept],
    queryFn: () => getDepartmentConfig(selectedDept !== 'ALL' ? selectedDept : 'GOOGLE_DEPARTMENT'),
    staleTime: 60_000,
  })

  const flows = flowsQuery.data?.data ?? []
  const totalElements = flowsQuery.data?.totalElements ?? flows.length

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function handleRefresh() {
    void flowsQuery.refetch()
    void configQuery.refetch()
  }

  async function handleTimelineSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!timelineModalFlow) return

    if (!newTimelineDays || newTimelineDays < 1) {
      showToast('Please enter a valid timeline in days (minimum 1).', 'err')
      return
    }

    setIsSubmittingTimeline(true)
    try {
      const res = await updateServiceTimeline(timelineModalFlow.departmentServiceId, newTimelineDays)
      if (res) {
        if (isSuperAdmin) {
          showToast(`Timeline updated to ${newTimelineDays} days and approved immediately!`, 'ok')
        } else {
          showToast(`Timeline change request (${newTimelineDays} days) submitted to SuperAdmin for approval.`, 'ok')
        }
        setTimelineModalFlow(null)
        void flowsQuery.refetch()
      } else {
        showToast('Could not update timeline. Please try again.', 'err')
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating timeline.', 'err')
    } finally {
      setIsSubmittingTimeline(false)
    }
  }

  async function handleDecideTimeline(serviceId: string, action: 'APPROVE' | 'REJECT') {
    try {
      const res = await decideServiceTimeline(serviceId, action)
      if (res) {
        showToast(`Timeline request ${action.toLowerCase()}d successfully.`, 'ok')
        void flowsQuery.refetch()
      } else {
        showToast(`Failed to ${action.toLowerCase()} timeline request.`, 'err')
      }
    } catch (err: any) {
      showToast(err?.message || `Failed to ${action.toLowerCase()} timeline request.`, 'err')
    }
  }

  return (
    <motion.div
      className="meeting-page"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: toast.type === 'ok' ? '#15803d' : '#b91c1c',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <span>{toast.type === 'ok' ? '✓' : '✕'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Toolbar: Search, Department Filter & Refresh ── */}
      <motion.div
        className="meeting-toolbar"
        variants={sectionVariants}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flex: '1 1 320px',
            flexWrap: 'wrap',
          }}
        >
          <div
            className="meeting-search-wrap"
            style={{ flex: '1 1 260px', maxWidth: 440 }}
          >
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val)
                setPage(0)
              }}
              placeholder="Search service flow by name..."
            />
          </div>

          {/* SuperAdmin Department Switcher */}
          {isSuperAdmin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <span
                style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}
              >
                Department:
              </span>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value)
                  setPage(0)
                }}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  minWidth: 180,
                  outline: 'none',
                }}
              >
                <option value="ALL">All Departments</option>
                {(deptTypesQuery.data ?? []).map((dt) => (
                  <option key={dt} value={dt}>
                    {dt.replace(/_DEPARTMENT$/i, '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div
          className="meeting-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="meeting-action-btn meeting-action-btn--primary"
            onClick={() => setIsAddOpen(true)}
            title="Create a new service with its workflow steps"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="plus" size={15} strokeWidth={2.5} />
            <span>Add Service Flow</span>
          </button>
          <button
            type="button"
            className="meeting-action-btn"
            onClick={handleRefresh}
            title="Refresh service flows"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name="refresh" size={14} strokeWidth={2} />
            <span>Refresh</span>
          </button>
        </div>
      </motion.div>

      {/* ── Content ── */}
      {flowsQuery.isPending && !flowsQuery.data ? (
        <LoadingState message="Loading service flows..." />
      ) : flowsQuery.isError ? (
        <ErrorState
          title="Unable to load service flows"
          message={flowsQuery.error.message}
          onRetry={handleRefresh}
        />
      ) : (
        <motion.div variants={sectionVariants}>
          <SectionCard
            title="Service Flows & Timelines"
            meta={
              <Pill tone="info" size="sm">
                {totalElements} services configured
              </Pill>
            }
            hint={
              isSuperAdmin && selectedDept === 'ALL'
                ? 'Showing flows across All Departments (SuperAdmin Mode)'
                : `Department: ${selectedDept}`
            }
          >
            {flows.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                No service flows found for this department.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {flows.map((flow: ServiceFlowItem) => {
                  const steps = Object.entries(flow.serviceFlow ?? {}).sort(
                    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
                  )
                  const timelineDetail = flow.serviceTimeline?.timeline
                  const currentTimeline = timelineDetail?.time ?? 0
                  const updation = timelineDetail?.updation
                  const isPending = updation && updation.status === 'PENDING'

                  return (
                    <div
                      key={flow.departmentServiceId}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: isPending ? '1.5px solid #fde047' : '1px solid #e2e8f0',
                        background: isPending ? '#fefce8' : '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Top Header: Service Name, Timeline Badges, & Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 14,
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <span
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: 42,
                              height: 42,
                              borderRadius: 10,
                              background: '#eff6ff',
                              color: '#2563eb',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            <Icon name="flow" d={GIT_BRANCH_ICON} size={20} strokeWidth={2} />
                          </span>
                          <div>
                            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                              {flow.departmentServiceName}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, color: '#64748b' }}>
                                {flow.departmentType} • {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                              </span>

                              {/* Timeline Badge */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: currentTimeline > 0 ? '#0284c7' : '#94a3b8',
                                  background: '#f0f9ff',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #bae6fd',
                                }}
                              >
                                <Icon name="clock" d={CLOCK_ICON} size={13} strokeWidth={2} />
                                {currentTimeline > 0 ? `${currentTimeline} Days Timeline` : 'No Timeline Set'}
                              </span>

                              {/* Pending Status / Approval Tag */}
                              {isPending && (
                                <Pill tone="warning" size="sm">
                                  Pending Request: {updation.timetobe} Days (by {updation.requestBy || 'Head'})
                                </Pill>
                              )}
                              {!isPending && updation?.status === 'APPROVED' && (
                                <Pill tone="success" size="sm">
                                  Approved ({updation.timetobe}d)
                                </Pill>
                              )}
                              {!isPending && updation?.status === 'REJECTED' && (
                                <Pill tone="danger" size="sm">
                                  Rejected ({updation.timetobe}d)
                                </Pill>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons: Timeline Update, Sequence Edit, SuperAdmin Approve/Reject */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {/* SuperAdmin Quick Approval Controls */}
                          {isSuperAdmin && isPending && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => handleDecideTimeline(flow.departmentServiceId, 'APPROVE')}
                                title="Approve this timeline change immediately"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                ✓ Approve ({updation.timetobe}d)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecideTimeline(flow.departmentServiceId, 'REJECT')}
                                title="Reject this timeline change"
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  background: '#dc2626',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}

                          {/* Update Timeline Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setTimelineModalFlow(flow)
                              setNewTimelineDays(currentTimeline > 0 ? currentTimeline : 3)
                            }}
                            title={isSuperAdmin ? "Directly update timeline in any department" : "Submit timeline update request"}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 13px',
                              borderRadius: 8,
                              border: '1px solid #7dd3fc',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Icon name="clock" d={CLOCK_ICON} size={14} strokeWidth={2} />
                            {isSuperAdmin ? '⚡ Update Timeline' : 'Update Timeline'}
                          </button>

                          {/* Edit Sequence Button */}
                          <button
                            type="button"
                            onClick={() => setEditingFlow(flow)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 13px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#1e293b',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Icon name="pencil" d={PENCIL_ICON} size={13} strokeWidth={2} />
                            Edit sequence
                          </button>
                        </div>
                      </div>

                      {/* Step sequence */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {steps.length === 0 ? (
                          <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                            No step sequence configured
                          </span>
                        ) : (
                          steps.map(([stepName, stepData], stepIdx) => (
                            <div key={stepName} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '5px 12px',
                                  borderRadius: 20,
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: '#334155',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: '#2563eb',
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  {stepData.order ?? stepIdx + 1}
                                </span>
                                <span>{stepName}</span>
                              </div>
                              {stepIdx < steps.length - 1 && (
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>→</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalElements > pageSize && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 12px 4px' }}>
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: page === 0 ? '#f1f5f9' : '#fff',
                    color: page === 0 ? '#94a3b8' : '#334155',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  Previous
                </button>
                <span style={{ padding: '6px 10px', fontSize: 13, color: '#64748b' }}>
                  Page {page + 1}
                </span>
                <button
                  type="button"
                  disabled={(page + 1) * pageSize >= totalElements}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: (page + 1) * pageSize >= totalElements ? '#f1f5f9' : '#fff',
                    color: (page + 1) * pageSize >= totalElements ? '#94a3b8' : '#334155',
                    cursor: (page + 1) * pageSize >= totalElements ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </SectionCard>
        </motion.div>
      )}

      {/* ── Sequence Builder Modal ── */}
      <FlowBuilderModal
        isOpen={Boolean(editingFlow)}
        onClose={() => setEditingFlow(null)}
        flow={editingFlow}
        departmentType={editingFlow?.departmentType || selectedDept}
        departmentConfig={configQuery.data}
        onSuccess={handleRefresh}
      />

      {/* ── Add Service Flow Modal ── */}
      <AddServiceFlowModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        defaultDepartmentType={selectedDept}
        departmentTypes={deptTypesQuery.data ?? []}
        isSuperAdmin={isSuperAdmin}
        onSuccess={handleRefresh}
      />

      {/* ── Timeline Update Modal ── */}
      {timelineModalFlow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(2px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setTimelineModalFlow(null)
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                  {isSuperAdmin ? '⚡ Update Timeline (SuperAdmin)' : 'Request Timeline Update'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                  {timelineModalFlow.departmentServiceName} • {timelineModalFlow.departmentType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimelineModalFlow(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleTimelineSubmit}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Authority Banner */}
                {isSuperAdmin ? (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: 13,
                    }}
                  >
                    <strong>⚡ SuperAdmin Power:</strong> Your update will be applied and <strong>approved immediately</strong> across all departments. No approval is needed.
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: '#fefce8',
                      border: '1px solid #fde047',
                      color: '#854d0e',
                      fontSize: 13,
                    }}
                  >
                    <strong>ℹ️ Approval Workflow:</strong> Your update will be submitted as <strong>PENDING</strong> for SuperAdmin to review and approve.
                  </div>
                )}

                {/* Current Active Timeline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Current Timeline:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {timelineModalFlow.serviceTimeline?.timeline?.time ?? 'Not set'} Days
                  </span>
                </div>

                {/* New Timeline Input */}
                <div>
                  <label
                    htmlFor="timeline-days"
                    style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}
                  >
                    New Timeline (in Days) *
                  </label>
                  <input
                    id="timeline-days"
                    type="number"
                    min={1}
                    max={365}
                    value={newTimelineDays}
                    onChange={(e) => setNewTimelineDays(parseInt(e.target.value, 10) || 1)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>
                    Estimated days required to complete this service.
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  background: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setTimelineModalFlow(null)}
                  disabled={isSubmittingTimeline}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTimeline}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: isSuperAdmin ? '#0284c7' : '#2563eb',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isSubmittingTimeline ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {isSubmittingTimeline
                    ? 'Saving...'
                    : isSuperAdmin
                    ? '⚡ Save & Apply Immediately'
                    : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  )
}
