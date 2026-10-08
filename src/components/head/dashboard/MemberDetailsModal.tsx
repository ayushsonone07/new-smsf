import { useState, useEffect } from 'react'
import type { TeamMemberPerformance } from './TeamTargetPerformance'

export interface MemberWorkItem {
  id: string
  customerName: string
  contactAndCity: string
  status: 'Completed' | 'Pending' | 'In progress'
  delayDays: number
  delaySide?: 'CLIENT' | 'OURS' | 'TECH'
  reason?: string
  remark: string
}

export interface MemberDetailsModalProps {
  member: TeamMemberPerformance | null
  workItems?: MemberWorkItem[]
  onClose: () => void
}

type ModalTab = 'all' | 'delayed' | 'in-progress' | 'pending' | 'completed'

const SAMPLE_ABHISHEK_ITEMS: MemberWorkItem[] = [
  {
    id: 'w-1',
    customerName: 'Sharma Sweets',
    contactAndCity: 'Rakesh Sharma · Jaipur',
    status: 'Completed',
    delayDays: 0,
    remark: 'Handover done, client happy.',
  },
  {
    id: 'w-2',
    customerName: 'Green Leaf Cafe',
    contactAndCity: 'Priya Nair · Kochi',
    status: 'Completed',
    delayDays: 0,
    remark: 'Handover done, client happy.',
  },
  {
    id: 'w-3',
    customerName: 'Urban Threads',
    contactAndCity: 'Imran Khan · Lucknow',
    status: 'Completed',
    delayDays: 0,
    remark: 'Handover done, client happy.',
  },
  {
    id: 'w-4',
    customerName: 'Pixel Print Hub',
    contactAndCity: 'Neha Gupta · Indore',
    status: 'Pending',
    delayDays: 11,
    delaySide: 'CLIENT',
    reason: 'Payment pending from client',
    remark: 'Demo done, awaiting confirmation.',
  },
  {
    id: 'w-5',
    customerName: 'Royal Dental Care',
    contactAndCity: 'Dr. Vivek Rao · Hyderabad',
    status: 'Completed',
    delayDays: 0,
    remark: 'Handover done, client happy.',
  },
  {
    id: 'w-6',
    customerName: 'FitZone Gym',
    contactAndCity: 'Karan Malhotra · Chandigarh',
    status: 'Completed',
    delayDays: 0,
    remark: 'Handover done, client happy.',
  },
  {
    id: 'w-7',
    customerName: 'Shree Ganesh Hardware',
    contactAndCity: 'Mahesh Patel · Surat',
    status: 'Pending',
    delayDays: 11,
    delaySide: 'OURS',
    reason: 'Design team slot pending',
    remark: 'Shared theme options on WhatsApp.',
  },
  {
    id: 'w-8',
    customerName: 'Blue Bell School',
    contactAndCity: 'Anita Joseph · Bengaluru',
    status: 'Pending',
    delayDays: 7,
    delaySide: 'CLIENT',
    reason: 'Payment pending from client',
    remark: 'Requirement form filled partially.',
  },
  {
    id: 'w-9',
    customerName: 'Spice Route Kitchen',
    contactAndCity: 'Arjun Menon · Chennai',
    status: 'In progress',
    delayDays: 10,
    delaySide: 'OURS',
    reason: 'Domain setup pending at our end',
    remark: 'Demo done, awaiting confirmation.',
  },
]

/**
 * Member Details Modal matching the reference screenshot.
 * Displays member KPI summary, filter tabs, and customer work items table.
 */
export function MemberDetailsModal({
  member,
  workItems = SAMPLE_ABHISHEK_ITEMS,
  onClose,
}: MemberDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('all')

  const [prevMemberId, setPrevMemberId] = useState(member?.id)
  if (member?.id !== prevMemberId) {
    setPrevMemberId(member?.id)
    setActiveTab('all')
  }

  // Escape key handler
  useEffect(() => {
    if (!member) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [member, onClose])

  if (!member) return null

  // Tab counts
  const delayedItems = workItems.filter((i) => i.delayDays > 0)
  const inProgressItems = workItems.filter((i) => i.status === 'In progress')
  const pendingItems = workItems.filter((i) => i.status === 'Pending')
  const completedItems = workItems.filter((i) => i.status === 'Completed')

  // Filtered items based on active tab
  const displayedItems =
    activeTab === 'delayed'
      ? delayedItems
      : activeTab === 'in-progress'
        ? inProgressItems
        : activeTab === 'pending'
          ? pendingItems
          : activeTab === 'completed'
            ? completedItems
            : workItems

  const initialLetter = member.name.charAt(0).toUpperCase()

  // Breakdown metrics
  const clientDelays = workItems.filter((i) => i.delaySide === 'CLIENT').length
  const ourDelays = workItems.filter((i) => i.delaySide === 'OURS').length
  const techDelays = workItems.filter((i) => i.delaySide === 'TECH').length

  return (
    <div
      className="hdb-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="hdb-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Performance details for ${member.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="hdb-modal__header">
          <div className="hdb-modal__header-left">
            <div className="hdb-modal__avatar">{initialLetter}</div>
            <div className="hdb-modal__header-text">
              <h2>{member.name}</h2>
              <p>{member.email} · Today</p>
            </div>
          </div>

          <div className="hdb-modal__header-right">
            <span
              className={`hdb-pill ${
                member.attendance === 'Present'
                  ? 'hdb-pill--present'
                  : 'hdb-pill--absent'
              }`}
            >
              {member.attendance}
            </span>

            <button
              type="button"
              className="hdb-modal__close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="hdb-modal__kpi-strip">
          <div className="hdb-modal__kpi-item">
            <div className="hdb-modal__kpi-lbl">TARGET</div>
            <div className="hdb-modal__kpi-val">{member.target}</div>
          </div>

          <div className="hdb-modal__kpi-item">
            <div className="hdb-modal__kpi-lbl">COMPLETED</div>
            <div className="hdb-modal__kpi-val hdb-modal__kpi-val--green">
              {member.completed}
            </div>
          </div>

          <div className="hdb-modal__kpi-item">
            <div className="hdb-modal__kpi-lbl">ACHIEVED</div>
            <div className="hdb-modal__kpi-val hdb-modal__kpi-val--blue">
              {member.achievedPercent}%
            </div>
          </div>

          <div className="hdb-modal__kpi-item">
            <div className="hdb-modal__kpi-lbl">DELAYED</div>
            <div className="hdb-modal__kpi-val hdb-modal__kpi-val--red">
              {delayedItems.length}
            </div>
          </div>

          <div className="hdb-modal__kpi-item">
            <div className="hdb-modal__kpi-lbl">PRESENT / ABSENT</div>
            <div className="hdb-modal__kpi-val">
              {member.presentDays} / {member.absentDays}
            </div>
          </div>

          <div className="hdb-modal__kpi-item">
            <div className="hdb-modal__kpi-lbl">CLIENT / OURS / TECH</div>
            <div className="hdb-modal__kpi-val">
              {clientDelays} / {ourDelays} / {techDelays}
            </div>
          </div>
        </div>

        {/* Tabs & Helper Text */}
        <div className="hdb-modal__controls-row">
          <div className="hdb-modal__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`hdb-modal__tab-btn ${
                activeTab === 'all' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('all')}
            >
              All <span className="hdb-modal__tab-count">{workItems.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'delayed'}
              className={`hdb-modal__tab-btn ${
                activeTab === 'delayed' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('delayed')}
            >
              Delayed{' '}
              <span className="hdb-modal__tab-count">{delayedItems.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'in-progress'}
              className={`hdb-modal__tab-btn ${
                activeTab === 'in-progress' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('in-progress')}
            >
              In progress{' '}
              <span className="hdb-modal__tab-count">
                {inProgressItems.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pending'}
              className={`hdb-modal__tab-btn ${
                activeTab === 'pending' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('pending')}
            >
              Pending{' '}
              <span className="hdb-modal__tab-count">{pendingItems.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'completed'}
              className={`hdb-modal__tab-btn ${
                activeTab === 'completed' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('completed')}
            >
              Completed{' '}
              <span className="hdb-modal__tab-count">
                {completedItems.length}
              </span>
            </button>
          </div>

          <span className="hdb-modal__helper-text">
            Hover a remark to read it in full
          </span>
        </div>

        {/* Table */}
        <div className="hdb-modal__table-container">
          <table className="hdb-modal__table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>CUSTOMER</th>
                <th style={{ width: '18%' }}>STATUS</th>
                <th style={{ width: '22%' }}>DELAY - SIDE</th>
                <th style={{ width: '32%' }}>REASON / REMARK</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item) => (
                <tr key={item.id}>
                  {/* Customer */}
                  <td>
                    <div className="hdb-modal__cust-name">
                      {item.customerName}
                    </div>
                    <div className="hdb-modal__cust-sub">
                      {item.contactAndCity}
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    <span
                      className={`cl-status-btn ${
                        item.status === 'Completed'
                          ? 'cl-status-btn--completed'
                          : item.status === 'In progress'
                            ? 'cl-status-btn--in-progress'
                            : 'cl-status-btn--pending'
                      }`}
                      style={{ padding: '3px 9px', fontSize: 12 }}
                    >
                      {item.status}
                    </span>
                  </td>

                  {/* Delay Side */}
                  <td>
                    {item.delayDays > 0 ? (
                      <div>
                        <div className="hdb-modal__delay-txt">
                          {item.delayDays} days delayed
                        </div>
                        <div className="hdb-modal__delay-side">
                          {item.delaySide === 'CLIENT'
                            ? 'Client side'
                            : item.delaySide === 'OURS'
                              ? 'Our side'
                              : 'Tech side'}
                        </div>
                      </div>
                    ) : (
                      <span className="hdb-modal__delay-ontime">On time</span>
                    )}
                  </td>

                  {/* Reason / Remark */}
                  <td>
                    {item.reason && (
                      <div className="hdb-modal__reason-lead">
                        {item.reason}
                      </div>
                    )}
                    <div
                      className="hdb-modal__remark-body"
                      title={item.remark}
                    >
                      {item.remark}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
