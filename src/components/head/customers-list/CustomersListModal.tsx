import { useState, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'
import type {
  OnboardingCustomer,
  OnboardingAssignee,
  OnboardingStatus,
} from './CustomersList'

export interface CustomersListModalProps {
  customer: OnboardingCustomer | null
  assignees: OnboardingAssignee[]
  onClose: () => void
  /** Optional: when passed, a "Full page" button appears in Personal information */
  onOpenFullPage?: (customer: OnboardingCustomer) => void
}

type DrawerTab =
  | 'overview'
  | 'deliverables'
  | 'business-form'
  | 'remarks'
  | 'activity'

const STATUS_LABEL: Record<OnboardingStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In progress',
  completed: 'Completed',
}

const SERVICE_DOT_COLORS = [
  '#64748b',
  '#2459e0',
  '#16a34a',
  '#e11d48',
  '#f59e0b',
  '#7c3aed',
  '#0891b2',
]

const FORM_ICON =
  'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6'
const EXTERNAL_ICON =
  'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
}

const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: {
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 32, mass: 0.9 },
  },
}

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

/** Shows "—" for empty values */
function show(value?: string) {
  return value && value.trim() ? value : '—'
}

function Field({
  label,
  value,
  full = false,
}: {
  label: string
  value?: string
  full?: boolean
}) {
  return (
    <div className={`cl-drawer__field${full ? ' cl-drawer__field--full' : ''}`}>
      <div className="cl-drawer__field-label">{label}</div>
      <div className="cl-drawer__field-value">{show(value)}</div>
    </div>
  )
}

/**
 * Customer Onboarding detail drawer.
 * Takes 40% of the screen width on desktop, 60% on tablet and the full
 * width on phones. All data comes from the `customer` prop.
 */
export function CustomersListModal({
  customer,
  assignees,
  onClose,
  onOpenFullPage,
}: CustomersListModalProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
  const [closing, setClosing] = useState(false)

  const [prevCustomerId, setPrevCustomerId] = useState(customer?.id)
  if (customer?.id !== prevCustomerId) {
    setPrevCustomerId(customer?.id)
    setActiveTab('overview')
    setClosing(false)
  }

  function startClose() {
    setClosing(true)
  }

  // Close on Escape key
  useEffect(() => {
    if (!customer) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') startClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [customer, onClose])

  if (!customer) return null

  const assignee =
    assignees.find((a) => a.id === customer.assigneeId) ?? null

  const services = customer.services ?? []
  const doneCount = services.filter((s) => s.status === 'completed').length
  const remarkCount = customer.remarkCount ?? (customer.remark ? 1 : 0)
  const activityCount = customer.activityCount ?? 0

  const initialLetter = (
    customer.contactName || customer.businessName || 'C'
  )
    .trim()
    .charAt(0)
    .toUpperCase()

  const tabs: { id: DrawerTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'deliverables', label: 'Deliverables', count: services.length },
    { id: 'business-form', label: 'Business form' },
    { id: 'remarks', label: 'Remarks', count: remarkCount },
    { id: 'activity', label: 'Updates', count: activityCount },
  ]

  return (
    <>
      <motion.div
        className="cl-drawer-overlay"
        onClick={startClose}
        role="presentation"
        variants={overlayVariants}
        initial="hidden"
        animate={closing ? 'hidden' : 'visible'}
      />

      <motion.div
        className="cl-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Customer details for ${customer.contactName}`}
        variants={drawerVariants}
        initial="hidden"
        animate={closing ? 'hidden' : 'visible'}
        onAnimationComplete={(definition) => {
          if (closing && definition === 'hidden') onClose()
        }}
      >
        {/* Header */}
        <div className="cl-drawer__header">
          <button
            type="button"
            className="cl-drawer__close"
            onClick={startClose}
            aria-label="Close drawer"
          >
            ×
          </button>

          <motion.div
            className="cl-drawer__name-row"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.16 }}
          >
            <div className="cl-drawer__avatar">{initialLetter}</div>
            <div className="cl-drawer__name-text">
              <h2>{customer.contactName}</h2>
              <span>{customer.businessName}</span>
            </div>
          </motion.div>

          <motion.div
            className="cl-drawer__status-pills"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.22 }}
          >
            <span className="cl-drawer__spill cl-drawer__spill--status">
              {STATUS_LABEL[customer.status]}
            </span>
            <span className="cl-drawer__spill cl-drawer__spill--info">
              Dept: Onboarding
            </span>
            <span className="cl-drawer__spill cl-drawer__spill--info">
              Service user: {assignee?.name || 'Unassigned'}
            </span>
            <span className="cl-drawer__spill cl-drawer__spill--info">
              Since {customer.contactDate}
            </span>
          </motion.div>
        </div>

        {/* Body */}
        <div className="cl-drawer__body">
          {/* Stat cards */}
          <div className="cl-drawer__stats">
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Services</div>
              <div className="cl-drawer__stat-value">
                {doneCount}/{services.length}
              </div>
              <div className="cl-drawer__stat-sub">completed</div>
            </div>
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Activity</div>
              <div className="cl-drawer__stat-value">{activityCount}</div>
              <div className="cl-drawer__stat-sub">recorded updates</div>
            </div>
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Remarks</div>
              <div className="cl-drawer__stat-value">{remarkCount}</div>
              <div className="cl-drawer__stat-sub">internal</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="cl-drawer__tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`cl-drawer__tab-btn${
                  activeTab === tab.id ? ' is-active' : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.count ? (
                  <span className="cl-drawer__tab-count">{tab.count}</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <motion.div
              className="cl-drawer__stack"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card">
                <div className="cl-drawer__card-head">
                  <h3>Personal information</h3>
                  {onOpenFullPage && (
                    <button
                      type="button"
                      className="cl-drawer__outline-btn"
                      onClick={() => onOpenFullPage(customer)}
                    >
                      <Icon name="eye" d={EXTERNAL_ICON} size={13} strokeWidth={2} />
                      Full page
                    </button>
                  )}
                </div>

                <div className="cl-drawer__fields">
                  <Field label="Full name" value={customer.contactName} />
                  <Field label="Business name" value={customer.businessName} />
                  <Field label="Phone" value={customer.phone} />
                  <Field label="Email" value={customer.email} />
                  <Field label="Address" value={customer.address} full />
                  <Field label="Package" value={customer.packageName} full />
                  <Field label="GST" value={customer.gstNumber} />
                  <Field label="Service months" value={customer.serviceMonths} />
                  <Field label="Sales person" value={customer.salesPerson} />
                  <Field label="Assigned to" value={assignee?.name} />
                </div>
              </div>

              <div className="cl-drawer__card">
                <div className="cl-drawer__card-head">
                  <h3>Included services</h3>
                  <span className="cl-drawer__card-meta">
                    {doneCount}/{services.length} completed
                  </span>
                </div>

                {services.length === 0 ? (
                  <div className="cl-drawer__card-meta">
                    No services added yet.
                  </div>
                ) : (
                  <ul className="cl-drawer__services">
                    {services.map((service, idx) => (
                      <li key={`${service.name}-${idx}`} className="cl-drawer__service">
                        <span
                          className="cl-drawer__service-dot"
                          style={{
                            background:
                              SERVICE_DOT_COLORS[idx % SERVICE_DOT_COLORS.length],
                          }}
                        />
                        <span className="cl-drawer__service-name">
                          {service.name}
                        </span>
                        <span
                          className={`cl-drawer__service-pill cl-drawer__service-pill--${service.status}`}
                        >
                          {STATUS_LABEL[service.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}

          {/* Remarks */}
          {activeTab === 'remarks' && (
            <motion.div
              className="cl-drawer__card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card-head">
                <h3>Internal Remark</h3>
              </div>
              <p className="cl-drawer__field-value">
                {customer.remark || 'No internal remarks added yet.'}
              </p>
            </motion.div>
          )}

          {/* Business form */}
          {activeTab === 'business-form' && (
            <motion.div
              className="cl-drawer__card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card-head">
                <h3>Business form</h3>
                {customer.formUrl && (
                  <button
                    type="button"
                    className="cl-drawer__outline-btn"
                    onClick={() =>
                      window.open(customer.formUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    <Icon name="eye" d={FORM_ICON} size={13} strokeWidth={2} />
                    Open client form
                  </button>
                )}
              </div>
              <p className="cl-drawer__card-meta">
                Customer submitted onboarding form responses.
              </p>
            </motion.div>
          )}

          {/* Deliverables / Updates placeholders */}
          {(activeTab === 'deliverables' || activeTab === 'activity') && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__coming-soon">
                <Icon name="clock" size={28} strokeWidth={1.5} />
                <p>
                  {activeTab === 'deliverables'
                    ? 'Deliverables checklist and files will appear here.'
                    : 'Activity logs and status change timeline.'}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}
