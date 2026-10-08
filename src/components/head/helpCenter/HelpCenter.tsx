import { useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { SearchBar } from '../shared/SearchBar'
import { Icon } from '../shared/Icon'
import { Button } from '../../ui/Button'
import { HelpCenterTicketCard } from './HelpCenterTicketCard'
import { HelpCenterTicketDetails } from './HelpCenterTicketDetails'
import { HelpCenterEmptyState } from './HelpCenterEmptyState'
import { HelpCenterStats } from './HelpCenterStats'
import type { HelpCenterTicket } from './HelpCenterTicketCard'
import './HelpCenter.css'

const toolbarVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

const toolbarItemVariants: Variants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

const panelVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

const placeholderVariants: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.18 } },
}

interface HelpCenterProps {
  tickets: HelpCenterTicket[]
}

export function HelpCenter({ tickets: initialTickets }: HelpCenterProps) {
  const [tickets, setTickets] = useState<HelpCenterTicket[]>(initialTickets)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'pending' | 'in-progress' | 'completed'>('all')
  const [selectedTicket, setSelectedTicket] = useState<HelpCenterTicket | null>(null)
  const [roundRobinLoading, setRoundRobinLoading] = useState(false)

  const filteredTickets = useMemo(() => {
    let result = tickets

    // Search filter
    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter(
        (t) =>
          t.ticketId.toLowerCase().includes(term) ||
          t.subject.toLowerCase().includes(term) ||
          t.customer.toLowerCase().includes(term) ||
          t.company.toLowerCase().includes(term) ||
          t.category.toLowerCase().includes(term),
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }

    // Sort: unassigned first, then by date desc
    return result.sort((a, b) => {
      const statusOrder = { 'unassigned': 0, 'pending': 1, 'in-progress': 2, 'completed': 3 }
      const aOrder = statusOrder[a.status]
      const bOrder = statusOrder[b.status]
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [tickets, search, statusFilter])

  const stats = useMemo(() => {
    const counts = { total: 0, pending: 0, 'in-progress': 0, completed: 0 }
    tickets.forEach((t) => {
      counts.total++
      if (t.status === 'pending') counts.pending++
      else if (t.status === 'in-progress') counts['in-progress']++
      else if (t.status === 'completed') counts.completed++
    })
    return counts
  }, [tickets])

  function handleAssignRoundRobin() {
    setRoundRobinLoading(true)
    // Simulate round-robin assignment
    setTimeout(() => {
      setTickets((current) =>
        current.map((t) =>
          t.status === 'unassigned'
            ? { ...t, status: 'pending', assignedTo: 'Abhishek Sahu' }
            : t,
        ),
      )
      setRoundRobinLoading(false)
    }, 800)
  }

  function handleReply(ticketId: string, message: string) {
    setTickets((current) =>
      current.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              conversation: [
                ...(t.conversation || []),
                { from: 'Abhishek Sahu', message, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
              ],
              status: t.status === 'unassigned' ? 'pending' : t.status,
            }
          : t,
      ),
    )
    setSelectedTicket((prev) =>
      prev && prev.id === ticketId
        ? {
            ...prev,
            conversation: [
              ...(prev.conversation || []),
              { from: 'Abhishek Sahu', message, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
            ],
            status: prev.status === 'unassigned' ? 'pending' : prev.status,
          }
        : prev,
    )
  }

  function handleStatusChange(ticketId: string, newStatus: HelpCenterTicket['status']) {
    setTickets((current) =>
      current.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)),
    )
    setSelectedTicket((prev) => (prev && prev.id === ticketId ? { ...prev, status: newStatus } : prev))
  }

  return (
    <div className="hc-container">
      {/* Stats Cards - 4 cards matching reference: Total, Pending, In Progress, Completed */}
      <HelpCenterStats stats={stats} />

      {/* Filters & Search - Grid layout to prevent overlap */}
      <motion.div
        className="hc-toolbar"
        initial="hidden"
        animate="visible"
        variants={toolbarVariants}
      >
        <motion.div className="hc-toolbar__left" variants={toolbarItemVariants}>
          <div className="hc-status-tabs">
            {[
              { value: 'all', label: 'All' },
              { value: 'unassigned', label: 'Unassigned' },
              { value: 'pending', label: 'Pending' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
            ].map((tab) => (
              <motion.button
                key={tab.value}
                type="button"
                className={`hc-status-tab ${statusFilter === tab.value ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(tab.value as typeof statusFilter)}
                whileTap={{ scale: 0.95 }}
              >
                {tab.label}
                <span className="hc-status-tab__count">
                  {tickets.filter((t) => tab.value === 'all' || t.status === tab.value).length}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div className="hc-toolbar__right" variants={toolbarItemVariants}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search ticket, business, or subject..."
            className="hc-search"
          />
          <Button variant="primary" onClick={handleAssignRoundRobin} disabled={roundRobinLoading} className="hc-round-robin-btn">
            <Icon name="refresh" size={14} strokeWidth={2} />
            <span>Round robin on</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* Ticket List + Details - Two panel layout */}
      <div className="hc-main">
        <aside className="hc-sidebar" role="complementary" aria-label="Ticket list">
          {filteredTickets.length === 0 ? (
            <HelpCenterEmptyState />
          ) : (
            <motion.div
            className="hc-ticket-list"
            role="list"
            aria-label="Tickets"
            initial="hidden"
            animate="visible"
            variants={listVariants}
          >
              {filteredTickets.map((ticket) => (
                <HelpCenterTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedTicket?.id === ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))}
            </motion.div>
          )}
        </aside>

        <section className="hc-details" aria-label="Ticket details">
          {selectedTicket ? (
            <HelpCenterTicketDetails
              key={selectedTicket.id}
              ticket={selectedTicket}
              onReply={handleReply}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <motion.div
              className="hc-details__placeholder"
              initial="hidden"
              animate="visible"
              variants={placeholderVariants}
            >
              <Icon name="help" size={48} strokeWidth={1.5} />
              <h3>Select a ticket</h3>
              <p>Choose a ticket from the list to view details and reply.</p>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  )
}