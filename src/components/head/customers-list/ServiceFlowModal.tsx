import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../shared/Icon'
import {
  getCustomerServiceFlow,
  updateServiceFlowStepStatus,
  updateCustomerSubServiceStatus,
  sendSubServiceConfirmationMail,
} from '../../../api/service-flow.api'
import type { OnboardingCustomer } from './CustomersList'
import { recordCustomerActivity } from '../../../utils/customerActivity'
import './ServiceFlowModal.css'

export interface Phase1Step {
  stepName: string
  order: number
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface ServiceFlowModalProps {
  customer: OnboardingCustomer | null
  isOpen: boolean
  onClose: () => void
  isEditable?: boolean
  onStepsUpdated?: (updatedSteps: Phase1Step[]) => void
  onSubServiceStatusUpdated?: (newStatus: string) => void
  departmentType?: string
}

/**
 * Extracts "Phase 1" steps from the service-flow API response
 * and sorts them strictly by the order number (1 to 10).
 */
export function extractPhase1Steps(data: any): Phase1Step[] {
  if (!data) return []

  let targetPhase1: any = null

  function search(obj: any, depth = 0) {
    if (!obj || depth > 8 || targetPhase1) return
    if (typeof obj !== 'object') return

    if (obj['Phase 1'] && typeof obj['Phase 1'] === 'object') {
      targetPhase1 = obj['Phase 1']
      return
    }

    for (const key of Object.keys(obj)) {
      if (key.trim().toLowerCase() === 'phase 1' && typeof obj[key] === 'object') {
        targetPhase1 = obj[key]
        return
      }
    }

    if (Array.isArray(obj)) {
      for (const item of obj) search(item, depth + 1)
    } else {
      for (const val of Object.values(obj)) search(val, depth + 1)
    }
  }

  search(data)

  if (!targetPhase1 || typeof targetPhase1 !== 'object') {
    return []
  }

  return Object.entries(targetPhase1)
    .map(([stepName, stepData]: [string, any]) => ({
      stepName,
      order: Number(stepData?.order ?? 999),
      status: String(stepData?.status ?? 'PENDING'),
      createdAt: stepData?.createdAt,
      updatedAt: stepData?.updatedAt,
    }))
    .sort((a, b) => a.order - b.order)
}

export function ServiceFlowModal({
  customer,
  isOpen,
  onClose,
  isEditable = true,
  onStepsUpdated,
  onSubServiceStatusUpdated,
  departmentType = 'GOOGLE_DEPARTMENT',
}: ServiceFlowModalProps) {
  const [steps, setSteps] = useState<Phase1Step[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sub-service status
  const [subServiceStatus, setSubServiceStatus] = useState<string>('PENDING')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isSendingAck, setIsSendingAck] = useState(false)

  // Step confirmation dialog state
  const [confirmingStep, setConfirmingStep] = useState<Phase1Step | null>(null)
  const [isCompletingStep, setIsCompletingStep] = useState(false)

  const subServiceName = 'Phase 1'

  // Initialize sub-service status from customer data
  useEffect(() => {
    if (!customer) return

    let initialStatus = 'PENDING'
    if (Array.isArray(customer.subServiceInfo) && customer.subServiceInfo.length > 0) {
      const match = customer.subServiceInfo.find((sub: any) => {
        const name = sub?.name || (typeof sub === 'object' ? Object.keys(sub)[0] : sub)
        return name === subServiceName
      })
      if (match) {
        initialStatus =
          match?.status ||
          (typeof match === 'object' ? Object.values(match)[0] : 'PENDING') ||
          'PENDING'
      }
    } else if (Array.isArray(customer.services) && customer.services.length > 0) {
      initialStatus = customer.services[0]?.status || 'PENDING'
    }

    setSubServiceStatus(String(initialStatus).toUpperCase().replace(/-/g, '_'))
  }, [customer])

  // Fetch service flow steps when modal is open
  useEffect(() => {
    if (!isOpen || !customer) {
      setSteps([])
      setError(null)
      setMessage(null)
      setIsLoading(false)
      return
    }

    let isCancelled = false
    setIsLoading(true)
    setError(null)

    getCustomerServiceFlow(customer.id)
      .then((res) => {
        if (isCancelled) return
        const parsed = extractPhase1Steps(res)
        setSteps(parsed)
      })
      .catch((err: any) => {
        if (isCancelled) return
        console.error('Failed to load service flow:', err)
        setError(err?.message || 'Unable to load service flow details.')
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [isOpen, customer])

  // Determine if all steps are completed
  const allFlowsCompleted = useMemo(() => {
    return (
      steps.length > 0 &&
      steps.every((s) => s.status.toUpperCase() === 'COMPLETED')
    )
  }, [steps])

  // Next available uncompleted step index
  const nextAvailableIndex = useMemo(() => {
    return steps.findIndex((s) => s.status.toUpperCase() !== 'COMPLETED')
  }, [steps])

  // Confirm and complete a flow step
  async function handleConfirmStepCompletion() {
    if (!customer || !confirmingStep) return
    setIsCompletingStep(true)
    setMessage(null)

    try {
      await updateServiceFlowStepStatus({
        customerId: customer.id,
        subServiceName,
        flowStepName: confirmingStep.stepName,
        status: 'COMPLETED',
      })

      // Optimistic update of the step
      const updated = steps.map((s) =>
        s.stepName === confirmingStep.stepName
          ? { ...s, status: 'COMPLETED', updatedAt: new Date().toISOString() }
          : s,
      )
      setSteps(updated)

      // Auto-advance sub-service from PENDING to IN_PROGRESS on first completed step
      if (subServiceStatus === 'PENDING') {
        try {
          await updateCustomerSubServiceStatus({
            customerId: customer.id,
            departmentType,
            subServiceName,
            newStatus: 'IN_PROGRESS',
          })
          setSubServiceStatus('IN_PROGRESS')
          onSubServiceStatusUpdated?.('IN_PROGRESS')
        } catch {
          // ignore background update error
        }
      }

      onStepsUpdated?.(updated)
      setMessage({
        type: 'success',
        text: `"${confirmingStep.stepName}" has been marked as completed!`,
      })
      setConfirmingStep(null)
    } catch (err: any) {
      console.error('Failed to update step status:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to complete flow step.',
      })
    } finally {
      setIsCompletingStep(false)
    }
  }

  // Handle changing the sub-service status via dropdown
  async function handleStatusDropdownChange(newStatus: string) {
    if (!customer) return
    setIsUpdatingStatus(true)
    setMessage(null)

    try {
      await updateCustomerSubServiceStatus({
        customerId: customer.id,
        departmentType,
        subServiceName,
        newStatus,
      })

      setSubServiceStatus(newStatus)
      onSubServiceStatusUpdated?.(newStatus)
      setMessage({
        type: 'success',
        text: `Sub-service status updated to ${newStatus.replace(/_/g, ' ')}!`,
      })
    } catch (err: any) {
      console.error('Failed to update sub-service status:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to update sub-service status.',
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle sending acknowledgement email
  async function handleSendAcknowledgement() {
    if (!customer) return
    setIsSendingAck(true)
    setMessage(null)

    try {
      await sendSubServiceConfirmationMail({
        customerId: customer.id,
        subServiceName,
        departmentType,
      })

      recordCustomerActivity({
        customerId: customer.id,
        contact: customer.phone,
        departmentType,
        kind: 'email-sent',
        detail: `Acknowledgement email sent for ${subServiceName}.`,
      })

      // After acknowledgement is sent, update sub-service status
      try {
        await updateCustomerSubServiceStatus({
          customerId: customer.id,
          departmentType,
          subServiceName,
          newStatus: 'PENDING_CUSTOMER_ACK',
        })
        setSubServiceStatus('PENDING_CUSTOMER_ACK')
        onSubServiceStatusUpdated?.('PENDING_CUSTOMER_ACK')
      } catch {
        // fallback
      }

      setMessage({
        type: 'success',
        text: `Acknowledgement email sent successfully for ${subServiceName}!`,
      })
    } catch (err: any) {
      console.error('Failed to send acknowledgement:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to send acknowledgement email.',
      })
    } finally {
      setIsSendingAck(false)
    }
  }

  if (!isOpen || !customer) return null

  // Status badge metadata
  const statusMeta = {
    PENDING: { label: 'PENDING', className: 'ssd-badge--pending', icon: 'alert' as const },
    IN_PROGRESS: { label: 'IN PROGRESS', className: 'ssd-badge--in-progress', icon: 'clock' as const },
    PENDING_CUSTOMER_ACK: {
      label: 'PENDING CUSTOMER ACK',
      className: 'ssd-badge--ack',
      icon: 'mail' as const,
    },
    COMPLETED: { label: 'COMPLETED', className: 'ssd-badge--completed', icon: 'check' as const },
  }[subServiceStatus] || {
    label: subServiceStatus.replace(/_/g, ' '),
    className: 'ssd-badge--pending',
    icon: 'alert' as const,
  }

  return (
    <AnimatePresence>
      <div className="ssd-overlay" onClick={onClose} role="presentation">
        <motion.div
          className="ssd-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Sub-Service Details"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="ssd-header">
            <div className="ssd-header-info">
              <h2 className="ssd-title">Sub-Service Details</h2>
              <p className="ssd-subtitle">
                Manage sub-service status for {customer.businessName || customer.contactName}
              </p>
            </div>
            <button
              type="button"
              className="ssd-close-icon-btn"
              onClick={onClose}
              title="Close modal"
              aria-label="Close"
            >
              <Icon name="x" size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          <div className="ssd-body">
            {message && (
              <div className={`ssd-status-msg ssd-status-msg--${message.type}`}>
                {message.text}
              </div>
            )}

            {/* Sub-Service Card */}
            <div className="ssd-subservice-card">
              <div className="ssd-subservice-left">
                <div className="ssd-subservice-icon">
                  <Icon name="brief" size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="ssd-subservice-name">{subServiceName}</h3>
                  <p className="ssd-subservice-label">Sub-Service</p>
                </div>
              </div>
              <span className={`ssd-badge ${statusMeta.className}`}>
                <Icon name={statusMeta.icon} size={12} strokeWidth={2.5} />
                <span>{statusMeta.label}</span>
              </span>
            </div>

            {/* Service Flow Section */}
            <div className="ssd-section">
              <h4 className="ssd-section-title">Service Flow:</h4>

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <Icon name="refresh" size={20} strokeWidth={2} />
                  <p style={{ marginTop: '8px', fontSize: '13px' }}>Loading service flow...</p>
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#ef4444' }}>
                  <p style={{ fontSize: '13px' }}>{error}</p>
                </div>
              ) : steps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  <p style={{ fontSize: '13px' }}>No service flow steps found.</p>
                </div>
              ) : (
                <div className="ssd-flow-box">
                  {steps.map((step, index) => {
                    const isCompleted = step.status.toUpperCase() === 'COMPLETED'
                    const isNextAvailable = index === nextAvailableIndex

                    let itemClass = 'ssd-step-item--pending'
                    if (isCompleted) itemClass = 'ssd-step-item--completed'
                    else if (isNextAvailable) itemClass = 'ssd-step-item--next'

                    return (
                      <div
                        key={step.stepName}
                        className={`ssd-step-item ${itemClass}`}
                        onClick={() => {
                          if (!isCompleted && isEditable) {
                            setConfirmingStep(step)
                          }
                        }}
                      >
                        <div className="ssd-step-indicator">
                          {isCompleted ? (
                            <Icon name="check" size={16} strokeWidth={3} className="text-emerald-600" />
                          ) : isNextAvailable ? (
                            <div className="ssd-radio-outer">
                              <div className="ssd-radio-inner" />
                            </div>
                          ) : (
                            <div className="ssd-circle-pending" />
                          )}
                        </div>

                        <span className="ssd-step-name">
                          {index + 1}. {step.stepName}
                        </span>

                        {isCompleted ? (
                          <span className="ssd-pill ssd-pill--completed">Completed</span>
                        ) : isNextAvailable ? (
                          <span className="ssd-pill ssd-pill--next">Next</span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Change Status Section */}
            <div className="ssd-section">
              <h4 className="ssd-section-title">Change Status</h4>
              <select
                className="ssd-select"
                value={subServiceStatus}
                onChange={(e) => handleStatusDropdownChange(e.target.value)}
                disabled={!allFlowsCompleted || isUpdatingStatus || !isEditable}
              >
                <option value="PENDING" disabled={subServiceStatus !== 'PENDING'}>
                  Pending
                </option>
                <option value="IN_PROGRESS" disabled={subServiceStatus !== 'IN_PROGRESS'}>
                  Service Status is In Progress
                </option>
                <option
                  value="PENDING_CUSTOMER_ACK"
                  disabled={subServiceStatus !== 'PENDING_CUSTOMER_ACK'}
                >
                  Pending Customer Acknowledgement
                </option>
                <option value="COMPLETED" disabled={!allFlowsCompleted}>
                  Completed
                </option>
              </select>

              {!allFlowsCompleted && (
                <p className="ssd-hint">Complete all service flow steps to enable status change</p>
              )}

              {allFlowsCompleted && isEditable && (
                <button
                  type="button"
                  className="ssd-ack-btn"
                  onClick={handleSendAcknowledgement}
                  disabled={isSendingAck}
                >
                  <Icon name="mail" size={15} strokeWidth={2} />
                  <span>{isSendingAck ? 'Sending Acknowledgement...' : 'Send Acknowledgement'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="ssd-footer">
            <button
              type="button"
              className="ssd-btn-secondary"
              onClick={() => {
                const historyPath = window.location.pathname.includes('/google-user')
                  ? '/google-user/history'
                  : '/departments/google/history'
                window.location.href = historyPath
              }}
            >
              <Icon name="book" size={14} strokeWidth={2} />
              <span>View History</span>
            </button>
            <button type="button" className="ssd-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </motion.div>

        {/* Step Completion Confirmation Modal */}
        {confirmingStep && (
          <div
            className="ssd-confirm-overlay"
            onClick={() => setConfirmingStep(null)}
            role="presentation"
          >
            <motion.div
              className="ssd-confirm-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h3 className="ssd-confirm-title">Confirm Completion</h3>
              <p className="ssd-confirm-desc">
                Mark "<strong>{confirmingStep.stepName}</strong>" as completed? This will complete
                the step for sub-service "<strong>{subServiceName}</strong>".
              </p>
              <div className="ssd-confirm-actions">
                <button
                  type="button"
                  className="ssd-btn-secondary"
                  onClick={() => setConfirmingStep(null)}
                  disabled={isCompletingStep}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ssd-btn-confirm"
                  onClick={handleConfirmStepCompletion}
                  disabled={isCompletingStep}
                >
                  {isCompletingStep ? 'Completing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  )
}
