import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'
import { Avatar } from '../shared/Avatar'
import type { IconName } from '../shared/iconPaths'
import { getCustomerFormUrl } from '../../../utils/urlEncryption'

/* ── Public types ─────────────────────────────────────────── */

export type OnboardingStatus = 'pending' | 'in-progress' | 'completed'
export type CallStatus = 'connected' | 'not-answered'

export interface OnboardingAssignee {
  id: string
  name: string
}

export interface OnboardingCustomer {
  id: string
  /** Display index (row number) — set by the page, not derived here */
  rowIndex: number
  /** Business column */
  businessName: string
  /** 'main' shows "Main · N businesses", 'branch' shows "Business X of N" */
  businessRelationType?: 'main' | 'branch'
  businessCount?: number
  businessIndex?: number
  duplicateCount?: number
  hasDuplicateCustomer?: boolean
  duplicateCustomers?: any[]
  contactName: string
  contactDate: string
  /** Contact column */
  email: string
  phone: string
  callStatus: CallStatus
  /** Status column */
  status: OnboardingStatus
  /** Assign To column — null = Unassigned */
  assigneeId: string | null
  /** Internal Remark column */
  remark: string
  /** Updated column (legacy/optional) */
  updatedLabel?: string
  /** Client form link — the Form button opens it in a new tab */
  formUrl?: string
  /** Optional detail-drawer fields (shown as "—" when missing) */
  address?: string
  gstNumber?: string
  packageName?: string
  serviceMonths?: string
  salesPerson?: string
  services?: { name: string; status: OnboardingStatus }[]
  activityCount?: number
  remarkCount?: number
}

export interface CustomersListProps {
  customers: OnboardingCustomer[]
  assignees: OnboardingAssignee[]
  onStatusChange: (id: string, status: OnboardingStatus) => void
  onAssigneeChange: (id: string, assigneeId: string | null) => void
  onRemarkChange: (id: string, remark: string) => void
  onOpenDetail: (customer: OnboardingCustomer, tab?: string) => void
  onOpenDuplicate?: (customer: OnboardingCustomer) => void
  canEdit?: boolean
  showStatus?: boolean
  canEditStatus?: boolean
  showAssignTo?: boolean
  canEditAssignTo?: boolean
  /* Accepted so existing pages keep compiling; the table doesn't use them yet. */
  showRemark?: boolean
  canEditRemark?: boolean
  showContact?: boolean
  showBusiness?: boolean
  showUpdated?: boolean
}

/* ── Status config ────────────────────────────────────────── */

const STATUS_META: Record<
  OnboardingStatus,
  { label: string; btnClass: string; icon: IconName }
> = {
  pending: {
    label: 'Pending',
    btnClass: 'cl-status-btn--pending',
    icon: 'hourglass',
  },
  'in-progress': {
    label: 'In progress',
    btnClass: 'cl-status-btn--in-progress',
    icon: 'clock',
  },
  completed: {
    label: 'Completed',
    btnClass: 'cl-status-btn--completed',
    icon: 'done',
  },
}

const STATUS_OPTIONS: OnboardingStatus[] = [
  'pending',
  'in-progress',
  'completed',
]

/* ── Motion variants ──────────────────────────────────────── */

const tbodyVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

const menuVariants: Variants = {
  hidden: { opacity: 0, y: -5, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.14 },
  },
}

/* ── CustomersList (exported table) ──────────────────────── */

/**
 * Customer Onboarding table.
 * All data comes through props — no hardcoded records.
 * Each row is rendered by the private CustomerRow component
 * which owns transient UI state (dropdowns, remark editing).
 */
export function CustomersList({
  customers,
  assignees,
  onStatusChange,
  onAssigneeChange,
  onRemarkChange,
  onOpenDetail,
  onOpenDuplicate,
  canEdit = true,
  showStatus = true,
  canEditStatus,
  showAssignTo = true,
  canEditAssignTo,
  showRemark = true,
  canEditRemark,
  showContact = true,
  showBusiness = true,
  showUpdated = false,
}: CustomersListProps) {
  if (customers.length === 0) {
    return (
      <motion.div
        className="cl-table-wrapper"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="cl-empty">
          <Icon name="users" size={32} strokeWidth={1.4} />
          <p>No customers found</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="cl-table-wrapper">
      <table className="cl-table">
        <thead>
          <tr>
            <th className="cl-th cl-th--num">#</th>
            {showBusiness && <th className="cl-th cl-th--biz">Business</th>}
            {showContact && <th className="cl-th cl-th--contact">Contact</th>}
            {showStatus && <th className="cl-th cl-th--status">Status</th>}
            {showAssignTo && <th className="cl-th cl-th--assign">Assign To</th>}
            {showRemark && <th className="cl-th cl-th--remark">Internal Remark</th>}
            {showUpdated && <th className="cl-th">Updated</th>}
          </tr>
        </thead>
        <motion.tbody
          variants={tbodyVariants}
          initial="hidden"
          animate="visible"
        >
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              assignees={assignees}
              onStatusChange={(status) =>
                onStatusChange(customer.id, status)
              }
              onAssigneeChange={(assigneeId) =>
                onAssigneeChange(customer.id, assigneeId)
              }
              onRemarkChange={(remark) =>
                onRemarkChange(customer.id, remark)
              }
              onOpenDetail={(tab) => onOpenDetail(customer, tab)}
              onOpenDuplicate={onOpenDuplicate ? () => onOpenDuplicate(customer) : undefined}
              canEdit={canEdit}
              showBusiness={showBusiness}
              showContact={showContact}
              showStatus={showStatus}
              canEditStatus={canEditStatus}
              showAssignTo={showAssignTo}
              canEditAssignTo={canEditAssignTo}
              showRemark={showRemark}
              canEditRemark={canEditRemark}
              showUpdated={showUpdated}
            />
          ))}
        </motion.tbody>
      </table>
    </div>
  )
}

/* ── AssigneeDropdown (with Search & Pagination) ────────── */

interface AssigneeDropdownProps {
  assigneeId: string | null
  assignees: OnboardingAssignee[]
  isEditable: boolean
  onAssigneeChange: (assigneeId: string | null) => void
}

function AssigneeDropdown({
  assigneeId,
  assignees,
  isEditable,
  onAssigneeChange,
}: AssigneeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const PAGE_SIZE = 5

  const matchedAssignee = useMemo(() => {
    if (!assigneeId) return null
    const target = assigneeId.toLowerCase()
    return (
      assignees.find(
        (a) =>
          a.id === assigneeId ||
          a.id.toLowerCase() === target ||
          a.name.toLowerCase().includes(target)
      ) || null
    )
  }, [assignees, assigneeId])

  const filteredAssignees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return assignees
    return assignees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    )
  }, [assignees, searchQuery])

  const showUnassigned = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return 'unassigned'.includes(q)
  }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredAssignees.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const paginatedAssignees = useMemo(() => {
    const start = safePage * PAGE_SIZE
    return filteredAssignees.slice(start, start + PAGE_SIZE)
  }, [filteredAssignees, safePage])

  // Close menus on outside click or escape
  useEffect(() => {
    if (!isOpen) return

    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Focus search input when menu opens, reset on close
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setSearchQuery('')
      setPage(0)
    }
  }, [isOpen])

  const isUnassignedSelected = !assigneeId

  return (
    <div className="cl-assign-wrap" ref={wrapRef}>
      <button
        type="button"
        className="cl-assign-btn"
        onClick={() => setIsOpen((o) => !o)}
        disabled={!isEditable}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {matchedAssignee ? (
          <Avatar name={matchedAssignee.name} size={20} tone="brand" />
        ) : (
          <Avatar
            name={assigneeId ? assigneeId.charAt(0).toUpperCase() : '?'}
            size={20}
            tone={assigneeId ? 'brand' : 'muted'}
          />
        )}
        <span className="cl-assign-name">
          {matchedAssignee
            ? matchedAssignee.name
            : assigneeId || 'Unassigned'}
        </span>
        {isEditable && (
          <Icon name="chevronDown" size={12} strokeWidth={2.5} />
        )}
      </button>

      {isEditable && isOpen && (
        <motion.div
          className="cl-assign-menu"
          role="listbox"
          variants={menuVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Search Box */}
          <div className="cl-assign-search-wrap">
            <Icon name="search" size={13} strokeWidth={2} className="cl-assign-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="cl-assign-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(0)
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search assignee..."
            />
            {searchQuery && (
              <button
                type="button"
                className="cl-assign-search-clear"
                onClick={(e) => {
                  e.stopPropagation()
                  setSearchQuery('')
                  setPage(0)
                  searchInputRef.current?.focus()
                }}
                title="Clear search"
                aria-label="Clear search"
              >
                <Icon name="x" size={11} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Unassigned Option */}
          {showUnassigned && (
            <button
              type="button"
              role="option"
              aria-selected={isUnassignedSelected}
              className={`cl-assign-opt ${isUnassignedSelected ? 'cl-assign-opt--active' : ''}`}
              onClick={() => {
                onAssigneeChange(null)
                setIsOpen(false)
              }}
            >
              <Avatar name="?" size={20} tone="muted" />
              <span className="cl-assign-opt-name">Unassigned</span>
              {isUnassignedSelected && (
                <Icon name="check" size={13} strokeWidth={2.5} className="cl-assign-check" />
              )}
            </button>
          )}

          {showUnassigned && paginatedAssignees.length > 0 && (
            <div className="cl-assign-divider" />
          )}

          {/* Paginated Assignees List */}
          <div className="cl-assign-list">
            {paginatedAssignees.map((a) => {
              const isSelected =
                assigneeId === a.id ||
                assigneeId?.toLowerCase() === a.id.toLowerCase()

              return (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`cl-assign-opt ${isSelected ? 'cl-assign-opt--active' : ''}`}
                  onClick={() => {
                    onAssigneeChange(a.id)
                    setIsOpen(false)
                  }}
                >
                  <Avatar name={a.name} size={20} tone="brand" />
                  <span className="cl-assign-opt-name" title={a.name}>
                    {a.name}
                  </span>
                  {isSelected && (
                    <Icon name="check" size={13} strokeWidth={2.5} className="cl-assign-check" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Empty state */}
          {!showUnassigned && filteredAssignees.length === 0 && (
            <div className="cl-assign-empty">No assignees found</div>
          )}

          {/* Pagination Controls */}
          {filteredAssignees.length > 0 && (
            <div className="cl-assign-pagination">
              <button
                type="button"
                className="cl-assign-page-btn"
                disabled={safePage === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  setPage((p) => Math.max(0, p - 1))
                }}
                title="Previous page"
              >
                <Icon name="chevronLeft" size={13} strokeWidth={2.5} />
                <span>Prev</span>
              </button>
              <span className="cl-assign-page-info">
                {safePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                className="cl-assign-page-btn"
                disabled={safePage >= totalPages - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }}
                title="Next page"
              >
                <span>Next</span>
                <Icon name="chevronRight" size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

/* ── CustomerRow (private, same file) ────────────────────── */

interface CustomerRowProps {
  customer: OnboardingCustomer
  assignees: OnboardingAssignee[]
  onStatusChange: (status: OnboardingStatus) => void
  onAssigneeChange: (assigneeId: string | null) => void
  onRemarkChange: (remark: string) => void
  onOpenDetail: (tab?: string) => void
  onOpenDuplicate?: () => void
  canEdit: boolean
  showBusiness?: boolean
  showContact?: boolean
  showStatus?: boolean
  canEditStatus?: boolean
  showAssignTo?: boolean
  canEditAssignTo?: boolean
  showRemark?: boolean
  canEditRemark?: boolean
  showUpdated?: boolean
}

function CustomerRow({
  customer,
  assignees,
  onStatusChange,
  onAssigneeChange,
  onRemarkChange,
  onOpenDetail,
  onOpenDuplicate,
  canEdit,
  showBusiness = true,
  showContact = true,
  showStatus = true,
  canEditStatus,
  showAssignTo = true,
  canEditAssignTo,
  showRemark = true,
  canEditRemark,
  showUpdated = false,
}: CustomerRowProps) {
  const [statusOpen, setStatusOpen] = useState(false)
  const [remarkEditing, setRemarkEditing] = useState(false)
  const [remarkDraft, setRemarkDraft] = useState('')

  const statusRef = useRef<HTMLDivElement>(null)

  /* Close menus on outside click */
  useEffect(() => {
    if (!statusOpen) return

    function handler(e: MouseEvent) {
      if (
        statusRef.current &&
        !statusRef.current.contains(e.target as Node)
      ) {
        setStatusOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen])

  const statusMeta = STATUS_META[customer.status]

  function startEditing() {
    if (!(canEditRemark !== undefined ? canEditRemark : canEdit)) return
    setRemarkDraft(customer.remark)
    setRemarkEditing(true)
  }

  function saveRemark() {
    onRemarkChange(remarkDraft)
    setRemarkEditing(false)
  }

  function cancelRemark() {
    setRemarkEditing(false)
  }

  /** Opens the client form in a new tab matching SMSF /customer-details parity */
  function openForm() {
    const isDuplicate = Boolean(
      customer.hasDuplicateCustomer || (customer.duplicateCount ?? 0) > 0,
    )
    const url =
      getCustomerFormUrl(customer.phone, isDuplicate) ||
      customer.formUrl

    if (!url) {
      alert('Phone number missing: Unable to open details without a contact number.')
      return
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`

    window.open(fullUrl, '_blank')
  }

  return (
    <motion.tr className="cl-row" variants={rowVariants}>

      {/* # */}
      <td className="cl-td cl-td--num" data-label="#">{customer.rowIndex}</td>

      {/* Business */}
      {showBusiness && (
        <td className="cl-td" data-label="Business">
          <div className="cl-biz-line">
            <button
              type="button"
              className="cl-biz-name cl-biz-name--link"
              onClick={() => onOpenDetail()}
              title="View customer detail"
            >
              {customer.businessName}
            </button>

            <button
              type="button"
              className="cl-biz-eye"
              title="View customer detail"
              aria-label="View customer detail"
              onClick={() => onOpenDetail()}
            >
              <Icon name="eye" size={14} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              className="cl-form-pill"
              title="Open client form"
              onClick={openForm}
            >
              <Icon
                d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6"
                name="eye"
                size={12}
                strokeWidth={2}
              />
              Form
            </button>

            {(Boolean(customer.hasDuplicateCustomer) || (customer.duplicateCount ?? 0) > 0) && (
              <button
                type="button"
                className="cl-dup-pill-btn"
                title="View duplicate businesses"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onOpenDuplicate) {
                    onOpenDuplicate()
                  } else {
                    onOpenDetail()
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '9999px',
                  border: '1px solid #ffe19a',
                  backgroundColor: '#fff5d6',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#8a5a00',
                  cursor: 'pointer',
                }}
              >
                <Icon name="copy" size={11} strokeWidth={2} />
                <span>
                  {customer.duplicateCount && customer.duplicateCount > 0
                    ? `${customer.duplicateCount} duplicate${customer.duplicateCount === 1 ? '' : 's'}`
                    : 'Duplicate'}
                </span>
              </button>
            )}
          </div>

          <div className="cl-biz-meta">
            {customer.contactName} · {customer.contactDate}
          </div>
        </td>
      )}

      {/* Contact */}
      {showContact && (
        <td className="cl-td" data-label="Contact">
          <div className="cl-email">{customer.email}</div>

          <div className="cl-phone-row">
            <span className="cl-phone-text">{customer.phone}</span>
            <button
              type="button"
              className="cl-icon-micro"
              title="Edit phone"
              aria-label="Edit phone number"
              disabled={!canEdit}
            >
              <Icon name="pencil" size={12} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="cl-call-icon"
              title="Call customer"
              aria-label="Call customer"
            >
              <Icon name="phone" size={13} strokeWidth={2} />
            </button>
          </div>

        <span
          className={`cl-contact-pill cl-contact-pill--${
            customer.callStatus === 'connected' ? 'connected' : 'not-answered'
          }`}
        >
          <span
            className={`cl-contact-dot cl-contact-dot--${
              customer.callStatus === 'connected'
                ? 'connected'
                : 'not-answered'
            }`}
          >
            <span
              className={`cl-contact-dot cl-contact-dot--${
                customer.callStatus === 'connected'
                  ? 'connected'
                  : 'not-answered'
              }`}
            />
            {customer.callStatus === 'connected' ? 'Connected' : 'Not answered'}
          </span>
        </span>
        </td>
      )}

      {/* Status */}
      {showStatus && (
        <td className="cl-td" data-label="Status">
          <div className="cl-status-wrap" ref={statusRef}>
            <button
              type="button"
              className={`cl-status-btn ${statusMeta.btnClass}`}
              onClick={() => setStatusOpen((o) => !o)}
              disabled={canEditStatus !== undefined ? !canEditStatus : !canEdit}
              aria-expanded={statusOpen}
              aria-haspopup="listbox"
            >
              <Icon name={statusMeta.icon} size={13} strokeWidth={2} />
              {statusMeta.label}
              {(canEditStatus !== undefined ? canEditStatus : canEdit) && (
                <Icon name="chevronDown" size={12} strokeWidth={2.5} />
              )}
            </button>

            {(canEditStatus !== undefined ? canEditStatus : canEdit) && statusOpen && (
              <motion.div
                className="cl-status-menu"
                role="listbox"
                variants={menuVariants}
                initial="hidden"
                animate="visible"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={customer.status === opt}
                    className="cl-status-opt"
                    onClick={() => {
                      onStatusChange(opt)
                      setStatusOpen(false)
                    }}
                  >
                    <Icon
                      name={STATUS_META[opt].icon}
                      size={13}
                      strokeWidth={1.8}
                    />
                    {STATUS_META[opt].label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </td>
      )}

      {/* Assign To */}
      {showAssignTo && (
        <td className="cl-td" data-label="Assign To">
          <AssigneeDropdown
            assigneeId={customer.assigneeId}
            assignees={assignees}
            isEditable={canEditAssignTo !== undefined ? canEditAssignTo : canEdit}
            onAssigneeChange={onAssigneeChange}
          />
        </td>
      )}

      {/* Internal Remark */}
      {showRemark && (
        <td className="cl-td" data-label="Internal Remark">
          {remarkEditing ? (
            <div className="cl-remark-editor">
              <textarea
                className="cl-remark-textarea"
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
                onBlur={saveRemark}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    saveRemark()
                  } else if (e.key === 'Escape') {
                    cancelRemark()
                  }
                }}
                autoFocus
                aria-label="Edit internal remark"
              />
              <div className="cl-remark-actions">
                <button
                  type="button"
                  className="cl-action"
                  title="Save remark"
                  aria-label="Save remark"
                  onClick={saveRemark}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="cl-action"
                  title="Cancel editing remark"
                  aria-label="Cancel editing remark"
                  onClick={cancelRemark}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cl-action"
                  title="View schedule"
                  aria-label="View schedule"
                >
                  <Icon name="calendarSmall" size={14} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  className="cl-action"
                  title="View customer detail"
                  aria-label="View customer detail"
                  onClick={() => onOpenDetail()}
                >
                  <Icon name="eye" size={14} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ) : (
            <div className="cl-remark-display-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                className={`cl-remark${
                  !customer.remark ? ' cl-remark--placeholder' : ''
                }`}
                style={{
                  position: 'relative',
                  padding: '6px 8px',
                  paddingRight: (canEditRemark !== undefined ? canEditRemark : canEdit) ? '28px' : '8px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  minHeight: '32px',
                  cursor: (canEditRemark !== undefined ? canEditRemark : canEdit) ? 'pointer' : 'default',
                }}
                role="button"
                tabIndex={(canEditRemark !== undefined ? canEditRemark : canEdit) ? 0 : -1}
                onClick={(canEditRemark !== undefined ? canEditRemark : canEdit) ? startEditing : undefined}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && (canEditRemark !== undefined ? canEditRemark : canEdit)) {
                    startEditing()
                  }
                }}
                title={
                  (canEditRemark !== undefined ? canEditRemark : canEdit)
                    ? 'Click to edit remark'
                    : 'Read-only remark'
                }
              >
                {customer.remark || 'Add remark...'}
                
                {(canEditRemark !== undefined ? canEditRemark : canEdit) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing()
                    }}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#475569',
                    }}
                    title="Edit internal remark"
                  >
                    <Icon name="pencil" size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenDetail('internal-remarks')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 4px',
                  width: 'fit-content'
                }}
              >
                <Icon name="messageSquare" size={10} strokeWidth={2} />
                view remark history
              </button>
            </div>
          )}
        </td>
      )}

      {/* Optional Updated */}
      {showUpdated && (
        <td className="cl-td cl-td--updated" data-label="Updated">
          <div className="cl-updated-cell">
            <span className="cl-updated-text">{customer.updatedLabel}</span>
          </div>
        </td>
      )}
    </motion.tr>
  )
}
