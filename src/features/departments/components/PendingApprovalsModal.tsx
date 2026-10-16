import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPendingTimelineRequests,
  decideTimelineRequest,
  type PendingTimelineRequestItem,
} from '../../../api/admin-services.api'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { LoadingState } from '../../../components/ui/LoadingState'

interface PendingApprovalsModalProps {
  open: boolean
  onClose: () => void
}

export function PendingApprovalsModal({
  open,
  onClose,
}: PendingApprovalsModalProps) {
  const queryClient = useQueryClient()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    msg: string
    type: 'ok' | 'err'
  } | null>(null)

  const pendingTimelineQuery = useQuery({
    queryKey: ['pending-timeline-requests'],
    queryFn: fetchPendingTimelineRequests,
    enabled: open,
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

  function handleDecision(
    req: PendingTimelineRequestItem,
    action: 'APPROVE' | 'REJECT',
  ) {
    setProcessingId(req.departmentServiceId)
    decideTimelineMutation.mutate(
      {
        serviceId: req.departmentServiceId,
        action,
      },
      {
        onSuccess: () => {
          showFeedback(
            `Request ${action === 'APPROVE' ? 'approved' : 'rejected'} for "${
              req.departmentServiceName || 'service'
            }".`,
            'ok',
          )
        },
        onError: (err: any) => {
          showFeedback(
            err?.message || `Failed to ${action.toLowerCase()} request.`,
            'err',
          )
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span>📋 Pending Service Flow Approvals</span>
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
      }
      description="Review and decide timeline change requests submitted by department heads."
    >
      <div style={{ minHeight: '180px', marginTop: '0.5rem' }}>
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
              border: `1px solid ${
                feedback.type === 'ok' ? '#a7f3d0' : '#fecaca'
              }`,
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
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✓</div>
            <strong
              style={{
                display: 'block',
                fontSize: '1.05rem',
                color: '#1e293b',
                marginBottom: '0.25rem',
              }}
            >
              No Pending Requests
            </strong>
            <span style={{ fontSize: '0.875rem' }}>
              All timeline change requests have been processed.
            </span>
          </div>
        ) : (
          <div
            className="table-wrapper"
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Department</th>
                  <th>Requested By</th>
                  <th>Requested TAT</th>
                  <th className="align-right">Action</th>
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
                      <td style={{ fontSize: '0.875rem', color: '#475569' }}>
                        {updation.requestBy || 'N/A'}
                      </td>
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
                            onClick={() => handleDecision(req, 'APPROVE')}
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
                            onClick={() => handleDecision(req, 'REJECT')}
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

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '1.25rem',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

