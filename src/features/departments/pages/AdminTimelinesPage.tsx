import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchAdminServiceFlows,
  updateAdminServiceTimeline,
  getAdminServices,
  fetchPendingTimelineRequests,
} from '../../../api/admin-services.api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { LoadingState } from '../../../components/ui/LoadingState'
import { PendingApprovalsModal } from '../components/PendingApprovalsModal'

export function AdminTimelinesPage() {
  const queryClient = useQueryClient()

  const [deptFilter, setDeptFilter] = useState('ALL')
  const [serviceSearch, setServiceSearch] = useState('')
  const [customDaysMap, setCustomDaysMap] = useState<Record<string, number>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false)
  const [feedback, setFeedback] = useState<{
    msg: string
    type: 'ok' | 'err'
  } | null>(null)

  const pendingTimelineQuery = useQuery({
    queryKey: ['pending-timeline-requests'],
    queryFn: fetchPendingTimelineRequests,
  })

  const pendingCount = pendingTimelineQuery.data?.length ?? 0

  const servicesQuery = useQuery({
    queryKey: ['admin-services'],
    queryFn: getAdminServices,
  })

  const flowsQuery = useQuery({
    queryKey: ['admin-service-flows', deptFilter],
    queryFn: () =>
      fetchAdminServiceFlows({
        departmentType: deptFilter !== 'ALL' ? deptFilter : undefined,
      }),
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

  const flowsList = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    return (flowsQuery.data ?? []).filter((item) => {
      if (!q) return true
      return (
        item.departmentServiceName?.toLowerCase().includes(q) ||
        item.departmentType?.toLowerCase().includes(q)
      )
    })
  }, [flowsQuery.data, serviceSearch])

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            <span>Service Flow</span>
          </>
        }
        title="Service Flow Management"
        description="SuperAdmin direct control: Set or update turnaround timeline (in days) for any department service."
      />

      <Card>
        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            color: '#0369a1',
            marginBottom: '1.25rem',
            lineHeight: 1.5,
          }}
        >
          <strong>⚡ SuperAdmin Authority:</strong> When you set or update a
          timeline here, it is applied and marked as <strong>APPROVED</strong>{' '}
          immediately in the database for that department service. No secondary
          approval is needed.
        </div>

        {feedback && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '1rem',
              backgroundColor: feedback.type === 'ok' ? '#ecfdf5' : '#fef2f2',
              color: feedback.type === 'ok' ? '#065f46' : '#991b1b',
              border: `1px solid ${feedback.type === 'ok' ? '#a7f3d0' : '#fecaca'}`,
            }}
          >
            {feedback.type === 'ok' ? '✓ ' : '✕ '}
            {feedback.msg}
          </div>
        )}

        {/* Filter and Search Bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '1.25rem',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              Department:
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: '#fff',
              }}
            >
              <option value="ALL">All Departments</option>
              {availableDepartmentTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          <input
            type="search"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Search services by name..."
            style={{
              flex: '1 1 200px',
              maxWidth: '340px',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
            }}
          />

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsApprovalsModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.85rem',
              fontSize: '0.875rem',
            }}
          >
            <span>📋 Pending Approvals</span>
            {pendingCount > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  lineHeight: '1.2',
                }}
              >
                {pendingCount}
              </span>
            )}
          </Button>
        </div>

        {flowsQuery.isLoading ? (
          <LoadingState message="Loading department services and timelines..." />
        ) : flowsQuery.isError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
            Failed to load services: {(flowsQuery.error as Error)?.message}
          </div>
        ) : flowsList.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No department services found matching your criteria.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Department</th>
                  <th>Current Timeline</th>
                  <th>Status</th>
                  <th style={{ width: '130px' }}>New TAT (Days)</th>
                  <th className="align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {flowsList.map((flow) => {
                  const timeline = flow.serviceTimeline?.timeline
                  const currentDays = timeline?.time ?? 0
                  const status = timeline?.updation?.status
                  const inputVal =
                    customDaysMap[flow.departmentServiceId] ??
                    (currentDays > 0 ? currentDays : 3)
                  const isBusy = processingId === flow.departmentServiceId

                  return (
                    <tr key={flow.departmentServiceId}>
                      <td>
                        <strong>{flow.departmentServiceName}</strong>
                      </td>
                      <td>
                        <span className="dept-type-badge">
                          {flow.departmentType}
                        </span>
                      </td>
                      <td>
                        {currentDays > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                            }}
                          >
                            ⏱ {currentDays} {currentDays === 1 ? 'Day' : 'Days'}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                            — Not set
                          </span>
                        )}
                      </td>
                      <td>
                        {status ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor:
                                status === 'APPROVED'
                                  ? '#dcfce7'
                                  : status === 'PENDING'
                                    ? '#fef3c7'
                                    : '#fee2e2',
                              color:
                                status === 'APPROVED'
                                  ? '#15803d'
                                  : status === 'PENDING'
                                    ? '#b45309'
                                    : '#b91c1c',
                            }}
                          >
                            {status}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
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
                          style={{
                            width: '85px',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                          }}
                        />
                      </td>
                      <td className="align-right">
                        <Button
                          type="button"
                          disabled={isBusy || inputVal < 1}
                          onClick={() =>
                            handleSetTimeline(
                              flow.departmentServiceId,
                              inputVal,
                              flow.departmentServiceName,
                            )
                          }
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8125rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isBusy ? 'Saving...' : '⚡ Set Timeline'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PendingApprovalsModal
        open={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
      />
    </PageLayout>
  )
}

