import { useState, useRef, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Icon } from '../shared/Icon'
import { Avatar } from '../shared/Avatar'
import type { IconName } from '../shared/iconPaths'

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
  /** Updated column */
  updatedLabel: string
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
  onOpenDetail: (customer: OnboardingCustomer) => void
  canEdit?: boolean
  showStatus?: boolean
  canEditStatus?: boolean
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
  canEdit = true,
  showStatus = true,
  canEditStatus,
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
            <th className="cl-th cl-th--biz">Business</th>
            <th className="cl-th cl-th--contact">Contact</th>
            {showStatus && <th className="cl-th cl-th--status">Status</th>}
            <th className="cl-th cl-th--assign">Assign To</th>
            <th className="cl-th cl-th--remark">Internal Remark</th>
            <th className="cl-th">Updated</th>
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
              onOpenDetail={() => onOpenDetail(customer)}
              canEdit={canEdit}
              showStatus={showStatus}
              canEditStatus={canEditStatus}
            />
          ))}
        </motion.tbody>
      </table>
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
  onOpenDetail: () => void
  canEdit: boolean
  showStatus?: boolean
  canEditStatus?: boolean
}

function CustomerRow({
  customer,
  assignees,
  onStatusChange,
  onAssigneeChange,
  onRemarkChange,
  onOpenDetail,
  canEdit,
  showStatus = true,
  canEditStatus,
}: CustomerRowProps) {
  const [statusOpen, setStatusOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [remarkEditing, setRemarkEditing] = useState(false)
  const [remarkDraft, setRemarkDraft] = useState('')

  const statusRef = useRef<HTMLDivElement>(null)
  const assignRef = useRef<HTMLDivElement>(null)

  /* Close menus on outside click */
  useEffect(() => {
    if (!statusOpen && !assignOpen) return

    function handler(e: MouseEvent) {
      if (
        statusRef.current &&
        !statusRef.current.contains(e.target as Node)
      ) {
        setStatusOpen(false)
      }
      if (
        assignRef.current &&
        !assignRef.current.contains(e.target as Node)
      ) {
        setAssignOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [statusOpen, assignOpen])

  const assignee =
    assignees.find((a) => a.id === customer.assigneeId) ?? null

  const statusMeta = STATUS_META[customer.status]

  function startEditing() {
    if (!canEdit) return
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

  /** Opens the client form in a new tab; falls back to the drawer until a link exists */
  function openForm() {
    if (!customer.formUrl) return
    window.open(customer.formUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.tr className="cl-row" variants={rowVariants}>

      {/* # */}
      <td className="cl-td cl-td--num" data-label="#">{customer.rowIndex}</td>

      {/* Business */}
      <td className="cl-td" data-label="Business">
        <div className="cl-biz-line">
          <button
            type="button"
            className="cl-biz-name cl-biz-name--link"
            onClick={onOpenDetail}
            title="View customer detail"
          >
            {customer.businessName}
          </button>

          <button
            type="button"
            className="cl-biz-eye"
            title="View customer detail"
            aria-label="View customer detail"
            onClick={onOpenDetail}
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
        </div>

        <div className="cl-biz-meta">
          {customer.contactName} · {customer.contactDate}
        </div>
      </td>

      {/* Contact */}
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
          />
          {customer.callStatus === 'connected' ? 'Connected' : 'Not answered'}
        </span>
      </td>

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
              <Icon name="chevronDown" size={12} strokeWidth={2.5} />
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
      <td className="cl-td" data-label="Assign To">
        <div className="cl-assign-wrap" ref={assignRef}>
          <button
            type="button"
            className="cl-assign-btn"
            onClick={() => setAssignOpen((o) => !o)}
            disabled={!canEdit}
            aria-expanded={assignOpen}
            aria-haspopup="listbox"
          >
            {assignee ? (
              <Avatar name={assignee.name} size={20} tone="brand" />
            ) : (
              <Avatar name="?" size={20} tone="muted" />
            )}
            <span className="cl-assign-name">
              {assignee ? assignee.name : 'Unassigned'}
            </span>
            <Icon name="chevronDown" size={12} strokeWidth={2.5} />
          </button>

{canEdit && assignOpen && (
            <motion.div
              className="cl-assign-menu"
              role="listbox"
              variants={menuVariants}
              initial="hidden"
              animate="visible"
            >
              <button
                type="button"
                role="option"
                aria-selected={customer.assigneeId === null}
                className="cl-assign-opt"
                onClick={() => {
                  onAssigneeChange(null)
                  setAssignOpen(false)
                }}
              >
                <Avatar name="?" size={20} tone="muted" />
                Unassigned
              </button>

              {assignees.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={customer.assigneeId === a.id}
                  className="cl-assign-opt"
                  onClick={() => {
                    onAssigneeChange(a.id)
                    setAssignOpen(false)
                  }}
                >
                  <Avatar name={a.name} size={20} tone="brand" />
                  {a.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </td>

      {/* Internal Remark */}
      <td className="cl-td" data-label="Internal Remark">
        {remarkEditing ? (
          <div className="cl-remark-editor">
            <textarea
              className="cl-remark-textarea"
              value={remarkDraft}
              onChange={(e) => setRemarkDraft(e.target.value)}
              autoFocus
              aria-label="Edit internal remark"
            />
            <div className="cl-remark-actions">
              <button
                type="button"
                className="cl-remark-save"
                onClick={saveRemark}
              >
                Save
              </button>
              <button
                type="button"
                className="cl-remark-cancel"
                onClick={cancelRemark}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <span
            className={`cl-remark${
              !customer.remark ? ' cl-remark--placeholder' : ''
            }`}
            role="button"
            tabIndex={canEdit ? 0 : -1}
            onClick={startEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') startEditing()
            }}
            title={canEdit ? 'Click to edit remark' : 'Read-only remark'}
          >
            {customer.remark || 'Add remark...'}
          </span>
        )}
      </td>

      {/* Updated */}
      <td className="cl-td cl-td--updated" data-label="Updated">
        <div className="cl-updated-cell">
          <span className="cl-updated-text">{customer.updatedLabel}</span>
        </div>
      </td>
    </motion.tr>
  )
}
