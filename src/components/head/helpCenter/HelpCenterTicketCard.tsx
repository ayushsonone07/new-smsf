import { Icon } from '../shared/Icon'
import './HelpCenterTicketCard.css'

interface HelpCenterTicketCardProps {
  ticket: HelpCenterTicket
  isSelected: boolean
  onClick: () => void
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

export function HelpCenterTicketCard({ ticket, isSelected, onClick }: HelpCenterTicketCardProps) {
  const priorityColors: Record<HelpCenterTicket['priority'], string> = {
    high: 'hc-priority--high',
    medium: 'hc-priority--medium',
    low: 'hc-priority--low',
  }

  const statusColors: Record<HelpCenterTicket['status'], string> = {
    unassigned: 'hc-status--unassigned',
    pending: 'hc-status--pending',
    'in-progress': 'hc-status--in-progress',
    completed: 'hc-status--completed',
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/ /g, ' ')
  }

  return (
    <article
      className={`hc-ticket-card ${isSelected ? 'is-selected' : ''} ${priorityColors[ticket.priority]} ${statusColors[ticket.status]}`}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="hc-ticket-card__header">
        <span className={`hc-ticket-id ${priorityColors[ticket.priority]}`}>{ticket.ticketId}</span>
        <span className={`hc-status-badge ${statusColors[ticket.status]}`}>
          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
        </span>
      </div>

      <h3 className="hc-ticket-card__subject">{ticket.subject}</h3>

      <div className="hc-ticket-card__meta">
        <div className="hc-ticket-card__customer-row">
          <Icon name="users" size={14} strokeWidth={1.8} />
          <span className="hc-ticket-card__customer">{ticket.customer}</span>
        </div>
        <div className="hc-ticket-card__company-row">
          <Icon name="brief" size={14} strokeWidth={1.8} />
          <span className="hc-ticket-card__company">{ticket.company}</span>
        </div>
      </div>

      <div className="hc-ticket-card__footer">
        <span className="hc-ticket-card__category">{ticket.category}</span>
        <span className="hc-ticket-card__date">{formatDate(ticket.date)}</span>
      </div>
    </article>
  )
}

// Type export for other components
export type { HelpCenterTicket }