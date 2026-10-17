import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPendingTimelineRequests,
  decideTimelineRequest,
} from '../../../api/admin-services.api'
import { PageHeader } from '../../../components/layout/PageHeader'
import { PageLayout } from '../../../components/layout/PageLayout'
import { ProfileChip } from '../../../components/common/ProfileChip'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { LoadingState } from '../../../components/ui/LoadingState'

export function AdminApprovalsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    msg: string
    type: 'ok' | 'err'
  } | null>(null)

  const pendingTimelineQuery = useQuery({
    queryKey: ['pending-timeline-requests'],
    queryFn: fetchPendingTimelineRequests,
  })

  const decideTimelineMutation = useMutation({
    mutationFn: decideTimelineRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-service-flows'] })
      queryClient.invalidateQueries({ queryKey: ['pending-timeline-requests'] })
      queryClient.invalidateQueries({ queryKey: ['service-flows'] })
    },
    onSettled: () => {
      setProcessingId(null)
    },
  })

  function showFeedback(msg: string, type: 'ok' | 'err' = 'ok') {
    setFeedback({ msg, type })
    setTimeout(() => setFeedback(null), 4000)
  }

  const pendingList = pendingTimelineQuery.data ?? []

  return (
    <PageLayout>
      <PageHeader
        breadcrumb={
          <>
            <Link to="/admin">Administration</Link>
            {' / '}
            <Link to="/admin/services">Service List</Link>
            {' / '}
            <span>Approval</span>
          </>
        }
        title="Timeline Approval Requests"
        description="Review and decide timeline update requests submitted by department heads."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate({ to: '/admin/timelines' })}
            >
              ⏱ Service Timelines
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate({ to: '/admin/services' })}
            >
              🛠 Service List
            </Button>
            <ProfileChip />
          </>
        }
      />

      <Card>
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2>Pending Timeline Approvals</h2>
            <span
              style={{
                backgroundColor: pendingList.length > 0 ? '#ef4444' : '#10b981',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {pendingList.length} Pending
            </span>
          </div>
          <p>
            Requests submitted by Department Heads for changing the service
            turnaround timeline.
          </p>
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

        {pendingTimelineQuery.isLoading ? (
          <LoadingState message="Loading pending timeline requests..." />
        ) : pendingList.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
            <strong style={{ display: 'block', fontSize: '1rem', color: '#1e293b' }}>
              No Pending Requests
            </strong>
            <span style={{ fontSize: '0.875rem' }}>
              All timeline change requests have been processed.
            </span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Department</th>
                  <th>Requested By</th>
                  <th>Requested TAT</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((req) => {
                  const updation = req.serviceTimeline?.timeline?.updation ?? {}
                  const isBusy = processingId === req.departmentServiceId

                  return (
                    <tr key={req.departmentServiceId}>
                      <td>
                        <strong>{req.departmentServiceName || 'N/A'}</strong>
                      </td>
                      <td>
                        <span className="dept-type-badge">
                          {req.departmentType || 'N/A'}
                        </span>
                      </td>
                      <td>{updation.requestBy || 'N/A'}</td>
                      <td>
                        {updation.timetobe != null ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                            }}
                          >
                            ⏱ {updation.timetobe} days
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="align-right">
                        <div
                          className="action-group"
                          style={{
                            display: 'inline-flex',
                            gap: '0.5rem',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <Button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setProcessingId(req.departmentServiceId)
                              decideTimelineMutation.mutate(
                                {
                                  serviceId: req.departmentServiceId,
                                  action: 'APPROVE',
                                },
                                {
                                  onSuccess: () => {
                                    showFeedback(
                                      `Request approved for "${
                                        req.departmentServiceName || 'service'
                                      }".`,
                                      'ok',
                                    )
                                  },
                                  onError: (err: any) => {
                                    showFeedback(
                                      err?.message || 'Failed to approve.',
                                      'err',
                                    )
                                  },
                                },
                              )
                            }}
                            style={{
                              backgroundColor: '#10b981',
                              borderColor: '#10b981',
                              color: '#ffffff',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8125rem',
                            }}
                          >
                            ✓ Approve
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => {
                              setProcessingId(req.departmentServiceId)
                              decideTimelineMutation.mutate(
                                {
                                  serviceId: req.departmentServiceId,
                                  action: 'REJECT',
                                },
                                {
                                  onSuccess: () => {
                                    showFeedback(
                                      `Request rejected for "${
                                        req.departmentServiceName || 'service'
                                      }".`,
                                      'ok',
                                    )
                                  },
                                  onError: (err: any) => {
                                    showFeedback(
                                      err?.message || 'Failed to reject.',
                                      'err',
                                    )
                                  },
                                },
                              )
                            }}
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8125rem',
                              color: '#ef4444',
                              borderColor: '#fca5a5',
                            }}
                          >
                            ✕ Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageLayout>
  )
}

