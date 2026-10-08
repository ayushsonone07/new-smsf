import { useState, useEffect } from 'react'
import { Icon } from '../shared/Icon'
import type {
  OnboardingCustomer,
  OnboardingAssignee,
} from './CustomersList'

export interface CustomersListModalProps {
  customer: OnboardingCustomer | null
  assignees: OnboardingAssignee[]
  onClose: () => void
}

type DrawerTab =
  | 'overview'
  | 'deliverables'
  | 'business-form'
  | 'remarks'
  | 'activity'

interface BusinessItem {
  id: string
  name: string
  location: string
  status: 'Pending' | 'In progress' | 'Completed'
  submittedBy: string
}

const SAMPLE_FOUNDER_BUSINESSES: Record<string, BusinessItem[]> = {
  'cust-onb-1': [
    {
      id: 'b-1',
      name: 'Main · Sector 21',
      location: 'Sector 21',
      status: 'Pending',
      submittedBy: 'Founder',
    },
    {
      id: 'b-2',
      name: 'Sector 15',
      location: 'Sector 15',
      status: 'In progress',
      submittedBy: 'Branch manager',
    },
    {
      id: 'b-3',
      name: 'NIT',
      location: 'NIT',
      status: 'Pending',
      submittedBy: 'Founder',
    },
  ],
  'cust-onb-2': [
    {
      id: 'b-1',
      name: 'Main · Sector 21',
      location: 'Sector 21',
      status: 'Pending',
      submittedBy: 'Founder',
    },
    {
      id: 'b-2',
      name: 'Sector 15',
      location: 'Sector 15',
      status: 'In progress',
      submittedBy: 'Branch manager',
    },
    {
      id: 'b-3',
      name: 'NIT',
      location: 'NIT',
      status: 'Pending',
      submittedBy: 'Founder',
    },
  ],
  'cust-onb-3': [
    {
      id: 'b-4',
      name: 'Main · Indiranagar',
      location: 'Indiranagar',
      status: 'Pending',
      submittedBy: 'Founder',
    },
    {
      id: 'b-5',
      name: 'Koramangala',
      location: 'Koramangala',
      status: 'Pending',
      submittedBy: 'Founder',
    },
  ],
  'cust-1': [
    {
      id: 'b-1',
      name: 'Main · Sector 21',
      location: 'Sector 21',
      status: 'Pending',
      submittedBy: 'Founder',
    },
    {
      id: 'b-2',
      name: 'Sector 15',
      location: 'Sector 15',
      status: 'In progress',
      submittedBy: 'Branch manager',
    },
    {
      id: 'b-3',
      name: 'NIT',
      location: 'NIT',
      status: 'Pending',
      submittedBy: 'Founder',
    },
  ],
  'cust-2': [
    {
      id: 'b-1',
      name: 'Main · Sector 21',
      location: 'Sector 21',
      status: 'Pending',
      submittedBy: 'Founder',
    },
    {
      id: 'b-2',
      name: 'Sector 15',
      location: 'Sector 15',
      status: 'In progress',
      submittedBy: 'Branch manager',
    },
  ],
}

/**
 * Customer Onboarding detail drawer / modal.
 * Matches the reference screenshot with founder businesses,
 * stats summary, meeting details, and package info.
 */
export function CustomersListModal({
  customer,
  assignees,
  onClose,
}: CustomersListModalProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
  const [activeBizIndex, setActiveBizIndex] = useState(0)

  const [prevCustomerId, setPrevCustomerId] = useState(customer?.id)
  if (customer?.id !== prevCustomerId) {
    setPrevCustomerId(customer?.id)
    setActiveTab('overview')
    setActiveBizIndex(0)
  }

  // Close on Escape key
  useEffect(() => {
    if (!customer) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [customer, onClose])

  if (!customer) return null

  const assignee =
    assignees.find((a) => a.id === customer.assigneeId) ?? null

  const founderBusinesses =
    SAMPLE_FOUNDER_BUSINESSES[customer.id] || [
      {
        id: customer.id,
        name: customer.businessName,
        location: 'Main Branch',
        status:
          customer.status === 'completed'
            ? 'Completed'
            : customer.status === 'in-progress'
              ? 'In progress'
              : 'Pending',
        submittedBy: 'Founder',
      },
    ]

  const completedCount = founderBusinesses.filter(
    (b) => b.status === 'Completed',
  ).length

  const initialLetter = (
    customer.contactName || customer.businessName || 'C'
  )
    .trim()
    .charAt(0)
    .toUpperCase()

  const statusLabel =
    customer.status === 'completed'
      ? 'Completed'
      : customer.status === 'in-progress'
        ? 'In progress'
        : 'Pending'

  return (
    <>
      <div
        className="cl-drawer-overlay"
        onClick={onClose}
        role="presentation"
      />

      <div
        className="cl-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Customer details for ${customer.contactName}`}
      >
        {/* Drawer Header */}
        <div className="cl-drawer__header">
          <button
            type="button"
            className="cl-drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ×
          </button>

          <div className="cl-drawer__name-row">
            <div className="cl-drawer__avatar">{initialLetter}</div>
            <div className="cl-drawer__name-text">
              <h2>{customer.contactName}</h2>
              <span>{customer.businessName}</span>
            </div>
          </div>

          <div className="cl-drawer__status-pills">
            <span className="cl-drawer__spill cl-drawer__spill--status">
              <Icon name="hourglass" size={12} strokeWidth={2} />
              {statusLabel}
            </span>

            <span className="cl-drawer__spill cl-drawer__spill--info">
              Dept: Onboarding
            </span>

            <span className="cl-drawer__spill cl-drawer__spill--info">
              Service user: {assignee?.name || 'Unassigned'}
            </span>

            <span className="cl-drawer__spill cl-drawer__spill--info">
              Since {customer.contactDate || '18 Sep 2026'}
            </span>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="cl-drawer__body">
          {/* Same founder businesses section */}
          {founderBusinesses.length > 1 && (
            <div className="cl-drawer__biz-section">
              <div className="cl-drawer__biz-head">
                <strong>
                  <Icon name="link" size={13} strokeWidth={2} />
                  Same founder · {founderBusinesses.length} businesses
                </strong>
                <span>
                  {completedCount} of {founderBusinesses.length} completed
                </span>
              </div>

              <div className="cl-drawer__biz-cards">
                {founderBusinesses.map((biz, idx) => (
                  <button
                    key={biz.id}
                    type="button"
                    className={`cl-drawer__biz-card ${
                      activeBizIndex === idx
                        ? 'cl-drawer__biz-card--active'
                        : ''
                    }`}
                    onClick={() => setActiveBizIndex(idx)}
                  >
                    <div className="cl-drawer__biz-card-dot" />
                    <div className="cl-drawer__biz-card-name">
                      {biz.name}
                    </div>
                    <div className="cl-drawer__biz-card-sub">
                      {biz.status} · form by {biz.submittedBy}
                    </div>
                  </button>
                ))}
              </div>

              <div className="cl-drawer__founder-note">
                Founder name, phone, email, GST and logo are pre-filled from the
                main business. Each business has its own package and
                onboarding. New businesses on {customer.phone} go straight to{' '}
                {assignee?.name || 'assigned lead'} — round robin is skipped.
              </div>
            </div>
          )}

          {/* Stats summary row */}
          <div className="cl-drawer__stats">
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Service steps</div>
              <div className="cl-drawer__stat-value">1/8</div>
              <div className="cl-drawer__stat-sub">completed</div>
            </div>

            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Activity</div>
              <div className="cl-drawer__stat-value">5</div>
              <div className="cl-drawer__stat-sub">recorded updates</div>
            </div>

            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Remarks</div>
              <div className="cl-drawer__stat-value">3</div>
              <div className="cl-drawer__stat-sub">2 customer · 1 internal</div>
            </div>
          </div>

          {/* Drawer tab navigation */}
          <div className="cl-drawer__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              className={`cl-drawer__tab-btn ${
                activeTab === 'overview' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'deliverables'}
              className={`cl-drawer__tab-btn ${
                activeTab === 'deliverables' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('deliverables')}
            >
              Deliverables 8
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'business-form'}
              className={`cl-drawer__tab-btn ${
                activeTab === 'business-form' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('business-form')}
            >
              Business form
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'remarks'}
              className={`cl-drawer__tab-btn ${
                activeTab === 'remarks' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('remarks')}
            >
              Remarks 3
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'activity'}
              className={`cl-drawer__tab-btn ${
                activeTab === 'activity' ? 'is-active' : ''
              }`}
              onClick={() => setActiveTab('activity')}
            >
              Activity 5
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Meeting card */}
              <div className="cl-drawer__meeting-card">
                <div className="cl-drawer__meeting-icon">
                  <Icon name="calendar" size={18} strokeWidth={2} />
                </div>
                <div className="cl-drawer__meeting-text">
                  <h4>Meeting on 1 Oct 2026, 11:00 am</h4>
                  <p>
                    Google Meet · Website theme demo · booked by{' '}
                    {assignee?.name || 'lead'}
                  </p>
                </div>
              </div>

              {/* Package card */}
              <div className="cl-drawer__package">
                <div className="cl-drawer__pkg-header">
                  <strong>Package</strong>
                  <span className="cl-drawer__pkg-badge">6 months</span>
                </div>
                <div className="cl-drawer__pkg-label">Package Name</div>
                <div className="cl-drawer__pkg-name">Digital Card + Website</div>
                <div className="cl-drawer__pkg-sub">
                  ₹18,500 · 6 month package · renews Mar 2027
                </div>
              </div>
            </>
          )}

          {activeTab === 'remarks' && (
            <div className="cl-drawer__package">
              <div className="cl-drawer__pkg-header">
                <strong>Internal Remark</strong>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>
                {customer.remark || 'No internal remarks added yet.'}
              </p>
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'remarks' && (
            <div className="cl-drawer__coming-soon">
              <Icon name="clock" size={28} strokeWidth={1.5} />
              <p>
                {activeTab === 'deliverables'
                  ? 'Deliverables checklist and files will appear here.'
                  : activeTab === 'business-form'
                    ? 'Customer submitted onboarding form responses.'
                    : 'Activity logs and status change timeline.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
