import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'
import { Button } from '../../ui/Button'
import { Pill } from '../../ui/Pill'
import './HelpCenterTicketDetails.css'

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

interface HelpCenterTicketDetailsProps {
  ticket: HelpCenterTicket
  onReply: (ticketId: string, message: string) => void
  onStatusChange: (ticketId: string, status: HelpCenterTicket['status']) => void
}

interface HelpCenterTicket {
  id: string
  ticketId: string
  priority: 'high' | 'medium' | 'low'
  status: 'unassigned' | 'pending' | 'in-progress' | 'completed'
  subject: string
  customer: string
  company: string
  category: string
  date: string
  assignedTo?: string
  phone?: string
  email?: string
  conversation?: { from: string; message: string; time: string }[]
}

export function HelpCenterTicketDetails({ ticket, onReply, onStatusChange }: HelpCenterTicketDetailsProps) {
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || sending) return
    setSending(true)
    setTimeout(() => {
      onReply(ticket.id, replyText.trim())
      setReplyText('')
      setSending(false)
    }, 400)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitReply(e)
    }
  }

  const statusOptions: { value: HelpCenterTicket['status']; label: string }[] = [
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ]

  return (
    <motion.div
      className="hc-details__panel"
      initial="hidden"
      animate="visible"
      variants={panelVariants}
    >
      <header className="hc-details__header">
        <div className="hc-details__header-left">
          <span className="hc-details__ticket-id">{ticket.ticketId}</span>
          <h2 className="hc-details__subject">{ticket.subject}</h2>
        </div>
        <div className="hc-details__header-right">
          <select
            className="hc-details__status-select"
            value={ticket.status}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onStatusChange(ticket.id, e.target.value as HelpCenterTicket['status'])}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="hc-details__meta-grid">
        <div className="hc-details__meta-item">
          <label>Priority</label>
          <Pill
            tone={
              ticket.priority === 'high' ? 'danger' : ticket.priority === 'medium' ? 'warning' : 'neutral'
            }
            size="sm"
          >
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
          </Pill>
        </div>

        <div className="hc-details__meta-item">
          <label>Category</label>
          <span className="hc-details__meta-value">{ticket.category}</span>
        </div>

        <div className="hc-details__meta-item">
          <label>Created</label>
          <span className="hc-details__meta-value">{formatDateTime(ticket.date)}</span>
        </div>

        <div className="hc-details__meta-item">
          <label>Assigned To</label>
          <span className="hc-details__meta-value">{ticket.assignedTo || '—'}</span>
        </div>

        <div className="hc-details__meta-item">
          <label>Customer</label>
          <span className="hc-details__meta-value">{ticket.customer}</span>
        </div>

        <div className="hc-details__meta-item">
          <label>Company</label>
          <span className="hc-details__meta-value">{ticket.company}</span>
        </div>

        {ticket.phone && (
          <div className="hc-details__meta-item">
            <label>Phone</label>
            <a href={`tel:${ticket.phone}`} className="hc-details__meta-link">
              <Icon name="phone" size={14} strokeWidth={1.8} />
              {ticket.phone}
            </a>
          </div>
        )}

        {ticket.email && (
          <div className="hc-details__meta-item">
            <label>Email</label>
            <a href={`mailto:${ticket.email}`} className="hc-details__meta-link">
              <Icon name="mail" size={14} strokeWidth={1.8} />
              {ticket.email}
            </a>
          </div>
        )}
      </div>

      <section className="hc-details__conversation" aria-label="Conversation">
        <h3 className="hc-details__section-title">Conversation</h3>
        <div className="hc-details__messages">
          {ticket.conversation?.map((msg, idx) => (
            <div key={idx} className="hc-details__message">
              <div className="hc-details__message-header">
                <strong>{msg.from}</strong>
                <time>{msg.time}</time>
              </div>
              <p className="hc-details__message-body">{msg.message}</p>
            </div>
          ))}
        </div>
      </section>

      <form className="hc-details__reply-form" onSubmit={handleSubmitReply}>
        <h3 className="hc-details__section-title">Reply</h3>
        <textarea
          className="hc-details__reply-input"
          value={replyText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
          rows={3}
          disabled={sending}
          aria-label="Reply message"
        />
        <div className="hc-details__reply-actions">
          <Button type="submit" variant="primary" disabled={!replyText.trim() || sending}>
            {sending ? 'Sending...' : 'Send Reply'}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

