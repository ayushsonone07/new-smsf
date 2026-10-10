import { useState, useEffect, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../shared/Icon'
import { getDuplicateCustomerSummaries } from '../../../api/department-users.api'
import type {
  OnboardingCustomer,
  OnboardingAssignee,
  OnboardingStatus,
} from './CustomersList'
import type {
  CustomerDrawerApiDetails,
  CustomerProfileDetails,
  CustomerRemark,
  CustomerServiceRow,
} from '../../../api/customer-drawer.api'

export interface CustomersListModalProps {
  customer: OnboardingCustomer | null
  assignees: OnboardingAssignee[]
  apiDetails?: CustomerDrawerApiDetails
  showStatus?: boolean
  showAssignTo?: boolean
  departmentType?: string
  onClose: () => void
  /** Optional: when passed, a "Full page" button appears in Personal information */
  onOpenFullPage?: (customer: OnboardingCustomer) => void
}

const EMPTY_API_DETAILS: CustomerDrawerApiDetails = {
  serviceRows: [],
  serviceRowsLoading: false,
  reviewReplies: [],
  isLoading: false,
  errors: [],
}

type DrawerTab =
  | 'overview'
  | 'duplicates'
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

const PROFILE_FIELD_GROUPS: {
  title: string
  keys: (keyof CustomerProfileDetails)[]
}[] = [
  {
    title: 'Customer & package',
    keys: [
      'ownerName',
      'businessName',
      'email',
      'phone',
      'additionalNumber',
      'plan',
      'planIds',
      'isWebinarClient',
      'source',
      'leadType',
    ],
  },
  {
    title: 'Business information',
    keys: [
      'brandName',
      'businessCategory',
      'businessType',
      'customBusinessType',
      'yearStarted',
      'happyCustomers',
      'simpleDescription',
      'workingHours',
      'certifications',
      'partnerBrands',
    ],
  },
  {
    title: 'Address & location',
    keys: [
      'address',
      'area',
      'city',
      'state',
      'zipCode',
      'country',
      'billingAddress',
      'locationKeywords',
    ],
  },
  {
    title: 'Website & online presence',
    keys: [
      'websiteLink',
      'domain',
      'domainStatus',
      'selectedWebsiteTheme',
      'gmbProfileLink',
      'logoLink',
      'imagesLink',
      'socialLinks',
      'websiteSeoKeywords',
      'googleReviewLink',
    ],
  },
  {
    title: 'Marketing & preferences',
    keys: [
      'tonePreference',
      'targetAudience',
      'tagline',
      'month',
      'year',
      'campaignTheme',
      'topProducts',
      'topProblems',
      'topBenefits',
      'monthlyOffer',
      'festiveOffer',
      'mainGoal',
      'appointmentMethod',
      'testimonials',
      'disclaimer',
    ],
  },
  {
    title: 'Links & chatbot',
    keys: [
      'bookingLink',
      'paymentLink',
      'appointmentLink',
      'aiChatbotEmail',
      'aiChatbotLink',
      'faqs',
      'offers',
      'pricing',
      'additionalInstructions',
      'remarks',
    ],
  },
  {
    title: 'Payment & dates',
    keys: [
      'dateOfPayment',
      'paymentLinkSS',
      'generatedBillInfo',
      'amountPaid',
      'amountPending',
      'paymentId',
      'serviceExpiration',
      'lastUpdatedAt',
    ],
  },
]

const FORM_ICON =
  'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6'
const EXTERNAL_ICON =
  'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'
const HOURGLASS_ICON =
  'M6 2h12M6 22h12M7 2v4a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v4m10-20v4a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v4'

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
 * width on phones. Customer details are loaded when the drawer is opened.
 */
export function CustomersListModal({
  customer,
  assignees,
  apiDetails = EMPTY_API_DETAILS,
  showStatus = true,
  showAssignTo = true,
  departmentType = 'ONBOARDING_DEPARTMENT',
  onClose,
  onOpenFullPage,
}: CustomersListModalProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview')
  const [closing, setClosing] = useState(false)
  const [activeCustomer, setActiveCustomer] = useState<OnboardingCustomer | null>(customer)

  const [prevCustomerId, setPrevCustomerId] = useState(customer?.id)
  if (customer?.id !== prevCustomerId) {
    setPrevCustomerId(customer?.id)
    setActiveCustomer(customer)
    setActiveTab('overview')
    setClosing(false)
  }

  useEffect(() => {
    setActiveCustomer(customer)
  }, [customer])

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

  const duplicatesQuery = useQuery({
    queryKey: ['duplicate-customer-summaries', customer.id, departmentType],
    queryFn: () => getDuplicateCustomerSummaries(customer.id, departmentType),
    enabled: Boolean(
      customer &&
        (customer.hasDuplicateCustomer ||
          (customer.duplicateCount && customer.duplicateCount > 0)),
    ),
    staleTime: 60_000,
  })

  const duplicateItems = useMemo(() => {
    const fromApi = duplicatesQuery.data ?? []
    if (fromApi.length > 0) return fromApi
    return customer.duplicateCustomers ?? []
  }, [duplicatesQuery.data, customer.duplicateCustomers])

  const allBusinesses = useMemo(() => {
    if (!customer) return []
    const mainId = String(customer.id)
    const main = {
      ...customer,
      isMainBusiness: true,
    }
    if (!duplicateItems.length) return [main]
    const others = duplicateItems
      .filter((d: any) => String(d.customerId || d.id || '') !== mainId)
      .map((d: any, index: number) => ({
        ...d,
        id: String(d.duplicateCustomerId || d.customerId || d.id || `${customer.id}-dup-${index}`),
        businessName: d.businessName || d.customerDetails?.businessName || d.brandName || 'Business',
        contactName: d.ownerName || d.customerDetails?.ownerName || customer.contactName,
        contactDate: d.createdAt || customer.contactDate,
        phone: d.phoneNumber || d.phone || d.contact || d.customerDetails?.phoneNumber || customer.phone,
        email: d.email || d.customerDetails?.email || customer.email,
        status: toOnboardingStatus(d.onboardingStatus || d.completeServiceStatus || d.status) || 'pending',
        gstNumber: d.gstNumber || d.customerDetails?.gstNumber,
        isMainBusiness: false,
      }))
    return [main, ...others]
  }, [customer, duplicateItems])

  const completedBusinessesCount = useMemo(() => {
    return allBusinesses.filter((b) => {
      const st = b.status || (b as any).onboardingStatus
      return st === 'completed' || String(st).toUpperCase() === 'COMPLETED'
    }).length
  }, [allBusinesses])

  const current = activeCustomer ?? customer

  const assignee =
    assignees.find((a) => a.id === current.assigneeId) ?? null

  const serviceRow =
    apiDetails.serviceRows.find(
      (row) => String(row.customerId) === String(current.id),
    ) ?? apiDetails.serviceRows[0]
  const rowDetails = serviceRow?.customerDetails
  const profile = apiDetails.profile
  const services = getCustomerServices(apiDetails.serviceRows)
  const doneCount = services.filter((s) => s.status === 'completed').length
  const remarkEntries = getRemarkEntries(apiDetails.remarks)
  const customerRemarks = remarkEntries.filter(
    ({ category }) => category === 'Client',
  )
  const internalRemarks = remarkEntries.filter(
    ({ category }) => category !== 'Client',
  )
  const remarkCount =
    remarkEntries.length ||
    Number(
      Boolean(rowDetails?.remark || serviceRow?.internalRemark),
    )
  const contactName =
    apiDetails.profile?.ownerName || rowDetails?.ownerName || current.contactName
  const businessName =
    apiDetails.profile?.businessName ||
    rowDetails?.businessName ||
    current.businessName
  const fullAddress =
    apiDetails.profile?.address ||
    apiDetails.profile?.billingAddress ||
    rowDetails?.address ||
    [
      apiDetails.profile?.area,
      apiDetails.profile?.city,
      apiDetails.profile?.state,
      apiDetails.profile?.zipCode,
      apiDetails.profile?.country,
    ]
      .filter(Boolean)
      .join(', ')
  const updates = [
    {
      title: 'Customer registered',
      detail: businessName,
      timestamp: current.contactDate,
    },
    ...apiDetails.reviewReplies.map((reply) => ({
      title: 'Review reply added',
      detail: formatRecord(reply.data ?? {}),
      timestamp: stringValue(reply.data?.dateTime),
    })),
    ...remarkEntries.map(({ category, remark }) => ({
      title: `${category} remark added`,
      detail: remark.remark || '',
      timestamp: remark.timestamp || '',
    })),
  ].sort(
    (a, b) =>
      (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0),
  )
  const hasBusinessForm = Boolean(
    apiDetails.profile &&
      Object.values(apiDetails.profile).some(
        (value) => typeof value === 'string' && value.trim().length > 0,
      ),
  )
  const initialLetter = (
    contactName || businessName || 'C'
  )
    .trim()
    .charAt(0)
    .toUpperCase()

  const tabs: { id: DrawerTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    ...(duplicateItems.length > 0
      ? [
          {
            id: 'duplicates' as DrawerTab,
            label: 'Duplicate businesses',
            count: duplicateItems.length,
          },
        ]
      : []),
    {
      id: 'deliverables',
      label: 'Deliverables',
      count: apiDetails.serviceRowsLoading ? undefined : services.length,
    },
    { id: 'business-form', label: 'Business form' },
    { id: 'remarks', label: 'Remarks', count: remarkCount },
    { id: 'activity', label: 'Updates', count: updates.length },
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
        aria-label={`Customer details for ${contactName}`}
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
              <h2>{contactName}</h2>
              <span>{businessName}</span>
            </div>
          </motion.div>

          <motion.div
            className="cl-drawer__status-pills"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.22 }}
          >
            {showStatus && (
              <span
                className={`cl-drawer__spill cl-drawer__spill--status cl-drawer__spill--${current.status}`}
              >
                {STATUS_LABEL[current.status]}
              </span>
            )}
            <span className="cl-drawer__spill cl-drawer__spill--info">
              Dept: {departmentType.replace('_DEPARTMENT', '').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </span>
            {showAssignTo && (
              <span className="cl-drawer__spill cl-drawer__spill--info">
                Service user:{' '}
                {serviceRow?.assignedUserEmail ||
                  serviceRow?.assignedUserName ||
                  assignee?.name ||
                  'Unassigned'}
              </span>
            )}
            <span className="cl-drawer__spill cl-drawer__spill--info">
              Since {current.contactDate}
            </span>
          </motion.div>
        </div>

        {/* Body */}
        <div className="cl-drawer__body">
          {(apiDetails.isLoading || apiDetails.errors.length > 0) && (
            <div
              className="cl-drawer__card"
              role={apiDetails.errors.length > 0 ? 'alert' : 'status'}
            >
              {apiDetails.isLoading && <p>Loading customer details...</p>}
              {apiDetails.errors.length > 0 && (
                <div>
                  <strong>Some customer details could not be loaded:</strong>
                  <ul>
                    {apiDetails.errors.map((error, index) => (
                      <li key={`${error}-${index}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Duplicate businesses switcher */}
          {(allBusinesses.length > 1 || duplicatesQuery.isLoading) && (
            <div className="cl-drawer__dup-banner">
              <div className="cl-drawer__dup-head">
                <div className="cl-drawer__dup-title">
                  <Icon name="link" size={14} />
                  <span>
                    Same founder · {allBusinesses.length}{' '}
                    {allBusinesses.length === 1 ? 'business' : 'businesses'}
                  </span>
                </div>
                <div className="cl-drawer__dup-sub">
                  {completedBusinessesCount} of {allBusinesses.length} completed
                </div>
              </div>

              {duplicatesQuery.isLoading && allBusinesses.length <= 1 ? (
                <div className="cl-drawer__dup-loading">
                  Checking duplicate businesses…
                </div>
              ) : (
                <div className="cl-drawer__dup-scroll">
                  {allBusinesses.map((biz) => {
                    const isSelected =
                      String(biz.id) === String(activeCustomer?.id)
                    const bizStatus = biz.status || 'pending'
                    const dotColor =
                      bizStatus === 'completed'
                        ? '#16a34a'
                        : bizStatus === 'in-progress'
                          ? '#2459e0'
                          : '#ffc629'
                    const statusText =
                      bizStatus === 'completed'
                        ? 'Completed'
                        : bizStatus === 'in-progress'
                          ? 'In progress'
                          : 'Pending'
                    const rawTitle = biz.businessName || 'Business'
                    const title = biz.isMainBusiness
                      ? `Main · ${rawTitle}`
                      : rawTitle
                    const subtitle = `${statusText} · form by ${biz.isMainBusiness ? 'Founder' : 'Branch manager'}`

                    return (
                      <button
                        key={String(biz.id)}
                        type="button"
                        onClick={() => setActiveCustomer(biz as any)}
                        className={`cl-drawer__dup-btn${isSelected ? ' is-selected' : ''}`}
                      >
                        <div className="cl-drawer__dup-btn-head">
                          <span
                            className="cl-drawer__dup-dot"
                            style={{
                              background:
                                isSelected && dotColor === '#2459e0'
                                  ? '#93c5fd'
                                  : dotColor,
                            }}
                          />
                          <span
                            className="cl-drawer__dup-btn-title"
                            title={title}
                          >
                            {title}
                          </span>
                        </div>
                        <div className="cl-drawer__dup-btn-sub">
                          {subtitle}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="cl-drawer__dup-footer">
                Founder name, phone, email, GST and logo are pre-filled from
                the main business. Each business has its own package and
                onboarding. New businesses on {activeCustomer?.phone || customer.phone || 'founder phone'} go straight to {assignee?.name || 'Assigned user'} — round robin is skipped.
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="cl-drawer__stats">
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Services</div>
              <div className="cl-drawer__stat-value">
                {apiDetails.serviceRowsLoading
                  ? '—/—'
                  : `${doneCount}/${services.length}`}
              </div>
              <div className="cl-drawer__stat-sub">completed</div>
            </div>
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Activity</div>
              <div className="cl-drawer__stat-value">{updates.length}</div>
              <div className="cl-drawer__stat-sub">recorded updates</div>
            </div>
            <div className="cl-drawer__stat">
              <div className="cl-drawer__stat-label">Remarks</div>
              <div className="cl-drawer__stat-value">{remarkCount}</div>
              <div className="cl-drawer__stat-sub">
                {customerRemarks.length} customer · {internalRemarks.length} internal
              </div>
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
                {tab.count !== undefined ? (
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
                  <Field label="Full name" value={contactName} />
                  <Field label="Business name" value={businessName} />
                  <Field
                    label="Phone"
                    value={
                      apiDetails.profile?.phone ||
                      rowDetails?.phoneNumber ||
                      customer.phone
                    }
                  />
                  <Field
                    label="Email"
                    value={
                      apiDetails.profile?.email ||
                      rowDetails?.email ||
                      customer.email
                    }
                  />
                  <Field label="Address" value={fullAddress} full />
                  <Field
                    label="Package"
                    value={apiDetails.profile?.plan || customer.packageName}
                    full
                  />
                  <Field
                    label="GST"
                    value={
                      apiDetails.profile?.gstNumber ||
                      rowDetails?.gstNumber ||
                      customer.gstNumber
                    }
                  />
                  <Field
                    label="Service expiry"
                    value={
                      apiDetails.profile?.serviceExpiration ||
                      serviceRow?.serviceExpiration ||
                      customer.serviceMonths
                    }
                  />
                  <Field
                    label="Amount paid"
                    value={
                      apiDetails.profile?.amountPaid || rowDetails?.amountPaid
                    }
                  />
                  <Field
                    label="Amount pending"
                    value={
                      apiDetails.profile?.amountPending ||
                      rowDetails?.amountPending
                    }
                  />
                  <Field
                    label="Sales person"
                    value={
                      serviceRow?.assignedUserName ||
                      serviceRow?.assignedUserEmail ||
                      customer.salesPerson
                    }
                  />
                  <Field
                    label="Assigned to"
                    value={assignee?.name || serviceRow?.assignedUserName}
                  />
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
                          className={`cl-drawer__service-pill cl-drawer__service-pill--${service.status ?? 'unavailable'}`}
                        >
                          {service.status
                            ? STATUS_LABEL[service.status]
                            : 'Status unavailable'}
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
              className="cl-drawer__remarks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <RemarkGroup
                title="Customer remark"
                emptyMessage="No remark from customer yet."
                entries={customerRemarks}
              />
              <RemarkGroup
                title="Internal remark"
                emptyMessage="No internal remarks yet."
                entries={internalRemarks}
                fallback={
                  rowDetails?.remark ||
                  serviceRow?.internalRemark
                }
                internal
              />
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
                <div>
                  <h3>Business information form</h3>
                  <p className="cl-drawer__card-meta">
                    Filed by the customer from the requirement link.
                  </p>
                </div>
                <span
                  className={`cl-drawer__form-badge${hasBusinessForm ? ' is-submitted' : ''}`}
                >
                  {hasBusinessForm ? 'Submitted' : 'Not submitted'}
                </span>
              </div>
              {profile ? (
                <div className="cl-drawer__profile-sections">
                  {getProfileSections(profile).map((section) => (
                    <section key={section.title}>
                      <h4>{section.title}</h4>
                      <div className="cl-drawer__form-rows">
                        {section.entries.map(([key, value]) => (
                          <FormRow
                            key={key}
                            label={formatFieldLabel(key)}
                            value={formatValue(value)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="cl-drawer__empty">
                  {apiDetails.isLoading
                    ? 'Loading business form...'
                    : 'No business form details were returned.'}
                </p>
              )}
              {customer.formUrl && (
                <button
                  type="button"
                  className="cl-drawer__form-link"
                  onClick={() =>
                    window.open(customer.formUrl, '_blank', 'noopener,noreferrer')
                  }
                >
                  <Icon name="eye" d={FORM_ICON} size={13} strokeWidth={2} />
                  Open original form
                </button>
              )}
            </motion.div>
          )}

          {activeTab === 'deliverables' && (
            <motion.div
              className="cl-drawer__deliverables"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="cl-drawer__deliverables-intro">
                Everything we must deliver for this package, grouped by service.
              </p>
              <div className="cl-drawer__progress-card">
                <div className="cl-drawer__card-head">
                  <strong>
                    {apiDetails.serviceRowsLoading
                      ? 'Loading services...'
                      : `${doneCount} of ${services.length} services completed`}
                  </strong>
                  <strong>
                    {apiDetails.serviceRowsLoading
                      ? '—'
                      : `${services.length ? Math.round((doneCount / services.length) * 100) : 0}%`}
                  </strong>
                </div>
                <div className="cl-drawer__progress-track">
                  <span
                    style={{
                      width: `${services.length && !apiDetails.serviceRowsLoading ? (doneCount / services.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              {apiDetails.serviceRowsLoading ? null : services.length > 0 ? (
                <ul className="cl-drawer__deliverable-grid">
                  {services.map((service, index) => (
                    <li
                      key={`${service.name}-${index}`}
                      className="cl-drawer__deliverable"
                    >
                      <div className="cl-drawer__deliverable-head">
                        <span
                          className="cl-drawer__service-dot"
                          style={{
                            background:
                              SERVICE_DOT_COLORS[index % SERVICE_DOT_COLORS.length],
                          }}
                        />
                        <strong>{service.name}</strong>
                        {service.status ? (
                          <span
                            className={`cl-drawer__service-pill cl-drawer__service-pill--${service.status}`}
                          >
                            {service.status === 'pending' && (
                              <Icon
                                name="clock"
                                d={HOURGLASS_ICON}
                                size={14}
                              />
                            )}
                            {STATUS_LABEL[service.status]}
                          </span>
                        ) : (
                          <span className="cl-drawer__service-pill cl-drawer__service-pill--unavailable">
                            Status unavailable
                          </span>
                        )}
                      </div>
                      <p className="cl-drawer__deliverable-status">
                        {service.row
                          ? getDeliverySummary(service.row)
                          : 'No service status returned by backend.'}
                      </p>
                      {service.row && (
                        <details className="cl-drawer__deliverable-details">
                          <summary>View service details</summary>
                          <DetailGrid
                            data={getServiceRowFields(service.row)}
                            exclude={['customerId', 'serviceType', 'status', 'onboardingStatus', 'createdAt', 'updatedAt', 'customerDetails', 'departmentStatuses', 'deliveryStatus', 'callStatus']}
                          />
                          {service.row.customerDetails && (
                            <DetailGrid
                              title="Customer service data"
                              data={service.row.customerDetails}
                            />
                          )}
                          {service.row.departmentStatuses && (
                            <DetailGrid
                              title="Department statuses"
                              data={service.row.departmentStatuses}
                            />
                          )}
                          {service.row.deliveryStatus && (
                            <DetailGrid
                              title="Delivery"
                              data={service.row.deliveryStatus}
                            />
                          )}
                          {service.row.callStatus && (
                            <DetailGrid
                              title="Call details"
                              data={service.row.callStatus}
                            />
                          )}
                          {service.row.updatedAt && (
                            <p className="cl-drawer__deliverable-updated">
                              Updated {formatTimestamp(service.row.updatedAt)}
                            </p>
                          )}
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cl-drawer__empty">
                  No customer service rows found.
                </p>
              )}
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              className="cl-drawer__card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card-head">
                <div>
                  <h3>All updates</h3>
                  <p className="cl-drawer__card-meta">
                    Status changes and remarks recorded for {contactName}.
                  </p>
                </div>
              </div>
              {updates.length > 0 ? (
                <ol className="cl-drawer__timeline">
                  {updates.map((update, index) => (
                    <li
                      key={`${update.title}-${update.timestamp}-${index}`}
                      className="cl-drawer__timeline-item"
                    >
                      <span className="cl-drawer__timeline-icon">
                        <Icon name="clock" size={16} strokeWidth={1.8} />
                      </span>
                      <div>
                        <strong>{update.title}</strong>
                        {update.detail && <p>{update.detail}</p>}
                        {update.timestamp && (
                          <time dateTime={update.timestamp}>
                            {formatTimestamp(update.timestamp)}
                          </time>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cl-drawer__empty">No updates have been recorded.</p>
              )}
            </motion.div>
          )}

          {/* Duplicate businesses */}
          {activeTab === 'duplicates' && (
            <motion.div
              className="cl-drawer__stack"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="cl-drawer__card">
                <div className="cl-drawer__card-head">
                  <div>
                    <h3>Duplicate businesses ({duplicateItems.length})</h3>
                    <p className="cl-drawer__card-meta">
                      Other businesses registered under the same founder or phone number.
                    </p>
                  </div>
                </div>

                <div className="cl-drawer__dup-list">
                  {duplicateItems.map((duplicate: any, dupIndex: number) => {
                    const dupId = String(
                      duplicate?.duplicateCustomerId ||
                        duplicate?.customerId ||
                        duplicate?.id ||
                        `${customer.id}-dup-${dupIndex}`,
                    )
                    const name =
                      duplicate?.businessName ||
                      duplicate?.customerDetails?.businessName ||
                      duplicate?.brandName ||
                      'Business'
                    const owner =
                      duplicate?.ownerName ||
                      duplicate?.customerDetails?.ownerName ||
                      customer.contactName ||
                      '—'
                    const email =
                      duplicate?.email ||
                      duplicate?.customerDetails?.email ||
                      '—'
                    const phone =
                      duplicate?.phoneNumber ||
                      duplicate?.contact ||
                      duplicate?.phone ||
                      duplicate?.customerDetails?.phoneNumber ||
                      '—'
                    const gst =
                      duplicate?.gstNumber ||
                      duplicate?.customerDetails?.gstNumber ||
                      '—'
                    const address =
                      duplicate?.address ||
                      duplicate?.customerDetails?.address ||
                      [
                        duplicate?.customerDetails?.area,
                        duplicate?.customerDetails?.city,
                        duplicate?.customerDetails?.state,
                      ]
                        .filter(Boolean)
                        .join(', ') ||
                      '—'
                    const rawStatus =
                      duplicate?.completeServiceStatus ||
                      duplicate?.onboardingStatus ||
                      duplicate?.status ||
                      'pending'
                    const status = toOnboardingStatus(rawStatus) || 'pending'
                    const services = Array.isArray(duplicate?.services)
                      ? duplicate.services
                      : duplicate?.serviceType
                        ? [
                            {
                              serviceType: duplicate.serviceType,
                              status: rawStatus,
                            },
                          ]
                        : []

                    const isCurrentlyActive =
                      String(activeCustomer?.id) === dupId

                    return (
                      <div key={dupId} className="cl-drawer__dup-card">
                        <div className="cl-drawer__dup-card-head">
                          <div className="cl-drawer__dup-card-badges">
                            <span className="cl-drawer__dup-badge">
                              Other Business {dupIndex + 1}
                            </span>
                            <span
                              className={`cl-drawer__service-pill cl-drawer__service-pill--${status}`}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="cl-drawer__outline-btn"
                            onClick={() => {
                              const matched = allBusinesses.find(
                                (b) => String(b.id) === dupId,
                              )
                              if (matched) {
                                setActiveCustomer(matched as any)
                                setActiveTab('overview')
                              }
                            }}
                          >
                            <Icon
                              name="eye"
                              d={EXTERNAL_ICON}
                              size={13}
                              strokeWidth={2}
                            />
                            {isCurrentlyActive ? 'Viewing now' : 'View details'}
                          </button>
                        </div>

                        <h4 className="cl-drawer__dup-card-name">{name}</h4>

                        <div className="cl-drawer__dup-card-rows">
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Owner
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {owner}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Phone
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {phone}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Email
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {email}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              GST
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {gst}
                            </span>
                          </div>
                          <div className="cl-drawer__dup-card-row">
                            <span className="cl-drawer__dup-card-label">
                              Address
                            </span>
                            <span className="cl-drawer__dup-card-value">
                              {address}
                            </span>
                          </div>
                        </div>

                        {services.length > 0 && (
                          <div className="cl-drawer__dup-services">
                            <span className="cl-drawer__dup-services-title">
                              Services
                            </span>
                            <div className="cl-drawer__dup-services-list">
                              {services.map((s: any, sIdx: number) => {
                                const sName = formatServiceName(
                                  s?.serviceType || s?.name,
                                )
                                const sStatus =
                                  toOnboardingStatus(s?.status) || 'pending'
                                return (
                                  <span
                                    key={`${sName}-${sIdx}`}
                                    className={`cl-drawer__service-pill cl-drawer__service-pill--${sStatus}`}
                                  >
                                    {sName} · {STATUS_LABEL[sStatus]}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}

function toOnboardingStatus(status?: string): OnboardingStatus | undefined {
  const normalized = status?.toLowerCase().replaceAll('_', '-')
  if (normalized === 'completed') return 'completed'
  if (normalized === 'in-progress') return 'in-progress'
  if (normalized === 'pending') return 'pending'
  return undefined
}

function getCustomerServices(rows: CustomerServiceRow[]) {
  return rows.map((row) => ({
    name: formatServiceName(row.serviceType),
    status: toOnboardingStatus(row.status || row.onboardingStatus),
    row,
  }))
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function formatServiceName(value?: string): string {
  if (!value) return 'Customer service'
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .replace(/\b\w+/g, (word) =>
      ['smo', 'seo', 'smm', 'crm', 'gmb', 'ai'].includes(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function formatValue(value: unknown): string {
      if (typeof value === 'string') return value
      if (Array.isArray(value)) {
        return value.map((item) => formatValue(item)).filter(Boolean).join(', ')
      }
      if (value && typeof value === 'object') {
        return formatRecord(value as Record<string, unknown>)
      }
      if (value === null || value === undefined) return ''
      return String(value)
}

function formatRecord(record: Record<string, unknown>): string {
      return Object.entries(record)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${formatFieldLabel(key)}: ${formatValue(value)}`)
        .join(' · ')
}

function formatFieldLabel(key: string): string {
      return key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getProfileSections(profile: CustomerProfileDetails) {
      type ProfileEntry = [
        keyof CustomerProfileDetails,
        CustomerProfileDetails[keyof CustomerProfileDetails],
      ]
      const entries = Object.entries(profile) as ProfileEntry[]
      const seen = new Set<keyof CustomerProfileDetails>()
      const sections: {
        title: string
        entries: [keyof CustomerProfileDetails, unknown][]
      }[] = []

      for (const group of PROFILE_FIELD_GROUPS) {
        const groupEntries = entries.filter(
          ([key, value]) =>
            group.keys.includes(key) &&
            value !== undefined &&
            value !== null &&
            formatValue(value).trim() !== '',
        )
        for (const [key] of groupEntries) seen.add(key)
        if (groupEntries.length > 0) {
          sections.push({ title: group.title, entries: groupEntries })
        }
      }

      const otherEntries = entries.filter(
        ([key, value]) =>
          !seen.has(key) &&
          value !== undefined &&
          value !== null &&
          formatValue(value).trim() !== '',
      )
      if (otherEntries.length > 0) {
        sections.push({ title: 'Other details', entries: otherEntries })
      }
      return sections
}

function getServiceRowFields(row: CustomerServiceRow): Record<string, unknown> {
      return {
        customerId: row.customerId,
        serviceType: row.serviceType,
        status: row.status,
        onboardingStatus: row.onboardingStatus,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        serviceExpiration: row.serviceExpiration,
        isServiceActive: row.isServiceActive,
        isMailSent: row.isMailSent,
        serviceDeliverySent: row.serviceDeliverySent,
        hasDuplicateCustomer: row.hasDuplicateCustomer,
        duplicateCount: row.duplicateCount,
        assignedUserEmail: row.assignedUserEmail,
        assignedUserName: row.assignedUserName,
        internalRemark: row.internalRemark,
      }
}

function getDeliverySummary(row: CustomerServiceRow | undefined): string {
      if (!row) return 'Service details unavailable.'

      const serviceStatus = toOnboardingStatus(row.status || row.onboardingStatus)
      const serviceProgress =
        row.deliveryStatus?.hasServiceHistory === false
          ? 'Not started yet'
          : row.deliveryStatus?.hasServiceHistory === true
            ? 'Service history available'
            : serviceStatus === 'completed'
              ? 'Completed'
              : serviceStatus === 'in-progress'
                ? 'In progress'
                : ''
      const onboarding = Object.entries(row.departmentStatuses ?? {}).find(
        ([department]) => department.toLowerCase().includes('onboarding'),
      )?.[1]
      const onboardingStatus =
        typeof onboarding?.onboarded === 'boolean'
          ? onboarding.onboarded
            ? 'Onboarded'
            : 'Not onboarded'
          : ''
      const summary = [serviceProgress, onboardingStatus].filter(Boolean).join(' · ')
      return summary || (serviceStatus ? STATUS_LABEL[serviceStatus] : 'Status unavailable')
}

function DetailGrid({
      title,
      data,
      exclude = [],
}: {
      title?: string
      data: Record<string, unknown>
      exclude?: string[]
}) {
      const entries = Object.entries(data).filter(
        ([key, value]) =>
          !exclude.includes(key) &&
          value !== undefined &&
          value !== null &&
          formatValue(value).trim() !== '',
      )
      if (entries.length === 0) return null

      return (
        <section className="cl-drawer__detail-grid">
          {title && <h5>{title}</h5>}
          <div>
            {entries.map(([key, value]) => (
              <FormRow key={key} label={formatFieldLabel(key)} value={formatValue(value)} />
            ))}
          </div>
        </section>
      )
}

function FormRow({ label, value }: { label: string; value?: string }) {
      if (!value?.trim()) return null
      return (
        <div className="cl-drawer__form-row">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      )
}

function RemarkGroup({
  title,
  emptyMessage,
  entries,
  fallback,
  internal = false,
}: {
  title: string
  emptyMessage: string
  entries: { category: string; remark: CustomerRemark }[]
  fallback?: string
  internal?: boolean
}) {
  return (
    <section className="cl-drawer__remark-group">
      <div className="cl-drawer__card-head">
        <h3>{title}</h3>
        {internal && <span className="cl-drawer__card-meta">Team only</span>}
      </div>
      {entries.length > 0 ? (
        <ul className="cl-drawer__remark-list">
          {entries.map(({ remark }, index) => (
            <li key={`${remark.timestamp || index}-${remark.staffName || ''}`}>
              <p>{remark.remark || '—'}</p>
              <span>
                {[remark.staffName, remark.type, remark.timestamp]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      ) : fallback ? (
        <p className="cl-drawer__remark-empty">{fallback}</p>
      ) : (
        <p className="cl-drawer__remark-empty">{emptyMessage}</p>
      )}
    </section>
  )
}

function getRemarkEntries(
  remarks?: CustomerDrawerApiDetails['remarks'],
): { category: string; remark: CustomerRemark }[] {
  if (!remarks) return []
  const entries: { category: string; remark: CustomerRemark }[] = []
  const groups: [string, CustomerRemark[]][] = [
    ['Department', remarks.departmentRemark ?? []],
    ['Internal', remarks.internalRemark ?? []],
    ['Client', remarks.clientRemark ?? []],
    ['15-day meeting', remarks.fifteenDayMeetingRemark ?? []],
  ]
  for (const [category, groupRemarks] of groups) {
    for (const remark of groupRemarks) entries.push({ category, remark })
  }
  return entries
}
