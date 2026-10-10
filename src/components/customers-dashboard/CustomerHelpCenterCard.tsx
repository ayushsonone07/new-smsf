import { useState, type FormEvent } from 'react'
import { Icon } from '../head/shared/Icon'
import type {
  CreateTicketInput,
  SupportTicket,
  TicketPriority,
} from './types/customer-dashboard.types'

interface CustomerHelpCenterCardProps {
  tickets: SupportTicket[]
  onSubmitTicket: (input: CreateTicketInput) => Promise<void>
}

export function CustomerHelpCenterCard({
  tickets,
  onSubmitTicket,
}: CustomerHelpCenterCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subject, setSubject] = useState('')
  const [serviceCategory, setServiceCategory] = useState('Website')
  const [priority, setPriority] = useState<TicketPriority>('Medium')
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!subject.trim()) {
      setErrorMsg('Please enter a subject for your ticket.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMsg('')
      await onSubmitTicket({
        subject: subject.trim(),
        serviceCategory,
        priority,
        description: description.trim(),
      })

      // Reset form on success
      setSubject('')
      setDescription('')
      setIsFormOpen(false)
    } catch {
      setErrorMsg('Failed to submit ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="cdb-card">
      {/* Card Header */}
      <div className="cdb-card-header">
        <div className="cdb-card-title-group">
          <div className="cdb-card-icon-box is-yellow">
            <Icon name="help" size={18} />
          </div>
          <h3 className="cdb-card-title">Help Center</h3>
        </div>

        <button
          type="button"
          className="cdb-raise-ticket-btn"
          onClick={() => {
            setIsFormOpen((prev) => !prev)
            setErrorMsg('')
          }}
        >
          <Icon name="plus" size={14} strokeWidth={2.5} />
          <span>{isFormOpen ? 'Close form' : '+ Raise a ticket'}</span>
        </button>
      </div>

      {/* Expanded Ticket Form */}
      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="cdb-ticket-form-box">
          {errorMsg ? (
            <div className="cdb-form-error" style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>
              {errorMsg}
            </div>
          ) : null}

          <input
            type="text"
            className="cdb-input"
            placeholder="Subject — what do you need help with?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <div className="cdb-form-row-two">
            <select
              className="cdb-select"
              value={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
            >
              <option value="Website">Website</option>
              <option value="Billing">Billing</option>
              <option value="Google">Google</option>
              <option value="General">General Support</option>
            </select>

            <select
              className="cdb-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <textarea
            className="cdb-textarea"
            placeholder="Describe the issue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="cdb-form-actions">
            <button
              type="button"
              className="cdb-btn-secondary"
              onClick={() => {
                setIsFormOpen(false)
                setErrorMsg('')
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cdb-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit ticket'}
            </button>
          </div>
        </form>
      ) : null}

      {/* Ticket List */}
      <div className="cdb-ticket-list">
        {tickets.map((t) => (
          <div key={t.id} className="cdb-ticket-item">
            <div className="cdb-ticket-top">
              <div className="cdb-ticket-meta">
                <span className="cdb-ticket-num">{t.ticketNumber}</span>
                <span
                  className={`cdb-ticket-status ${
                    t.status === 'Completed' ? 'status-completed' : 'status-pending'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <span className="cdb-ticket-time">{t.timestamp}</span>
            </div>

            <h4 className="cdb-ticket-title">{t.title}</h4>
            <p className="cdb-ticket-message">{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
