import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { sendOnboardingConfirmationMail } from '../../../api/department-users.api'
import type { OnboardingCustomer } from './CustomersList'

interface OnboardingConfirmationModalProps {
  open: boolean
  customer: OnboardingCustomer | null
  onClose: () => void
  onSuccess?: () => void
}

export function OnboardingConfirmationModal({
  open,
  customer,
  onClose,
  onSuccess,
}: OnboardingConfirmationModalProps) {
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [domainConnect, setDomainConnect] = useState(false)
  const [themeSelection, setThemeSelection] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (customer) {
      setEmail(customer.email || '')
      setContact(customer.phone || '')
      setDomainConnect(false)
      setThemeSelection(false)
      setError(null)
    }
  }, [customer, open])

  if (!customer) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Recipient email is required')
      return
    }
    if (!contact.trim()) {
      setError('Contact number is required')
      return
    }

    if ((domainConnect && !themeSelection) || (!domainConnect && themeSelection)) {
      setError('Please select both options (Domain Connect & Theme Selection) or neither option.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await sendOnboardingConfirmationMail({
        recipientUsername: email.trim(),
        contact: contact.trim(),
        isDuplicate: Boolean(customer.hasDuplicateCustomer),
        domainConnect,
        themeSelection,
      })

      alert(
        `Acknowledgement email sent to ${email.trim()} successfully!\n\nThe status will automatically update to Completed once the customer reviews and confirms via the link.`,
      )
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      console.error('Failed to send confirmation email:', err)
      const msg = err instanceof Error ? err.message : 'Failed to send onboarding confirmation email.'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => {} : onClose}
      title="Complete Onboarding"
      description="Send acknowledgement confirmation email to the customer"
      size="md"
    >
      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#1e40af',
          }}
        >
          <strong>Customer Acknowledgement Required:</strong>
          <p style={{ margin: '4px 0 0 0' }}>
            The onboarding status will <strong>not</strong> be marked as Completed directly. An acknowledgement email with a confirmation link will be sent to the customer. Once the customer reviews and confirms, the status will automatically update to <strong>Completed</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
            Customer / Business
          </label>
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#0f172a',
              fontWeight: 500,
            }}
          >
            {customer.businessName || customer.contactName} ({customer.contactName})
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Recipient Email <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              disabled={isSubmitting}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              required
            />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Contact Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone number"
              disabled={isSubmitting}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
            <input
              type="checkbox"
              checked={domainConnect}
              onChange={(e) => setDomainConnect(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>Domain Connect</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155' }}>
            <input
              type="checkbox"
              checked={themeSelection}
              onChange={(e) => setThemeSelection(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>Theme Selection</span>
          </label>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Acknowledgement'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

