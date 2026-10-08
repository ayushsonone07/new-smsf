import { useState, useRef, useEffect } from 'react'
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
}

export interface CustomersListProps {
  customers: OnboardingCustomer[]
  assignees: OnboardingAssignee[]
  onStatusChange: (id: string, status: OnboardingStatus) => void
  onAssigneeChange: (id: string, assigneeId: string | null) => void
  onRemarkChange: (id: string, remark: string) => void
  onOpenDetail: (customer: OnboardingCustomer) => void
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
}: CustomersListProps) {
  if (customers.length === 0) {
    return (
      <div className="cl-table-wrapper">
        <div className="cl-empty">
          <Icon name="users" size={32} strokeWidth={1.4} />
          <p>No customers found</p>
        </div>
      </div>
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
            <th className="cl-th cl-th--status">Status</th>
            <th className="cl-th cl-th--assign">Assign To</th>
            <th className="cl-th cl-th--remark">Internal Remark</th>
            <th className="cl-th">Updated</th>
          </tr>
        </thead>
        <tbody>
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
            />
          ))}
        </tbody>
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
}

function CustomerRow({
  customer,
  assignees,
  onStatusChange,
  onAssigneeChange,
  onRemarkChange,
  onOpenDetail,
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

  const hasBizPill = customer.businessRelationType !== undefined
  const bizPillText =
    customer.businessRelationType === 'main'
      ? `Main · ${customer.businessCount} businesses`
      : `Business ${customer.businessIndex} of ${customer.businessCount}`

  function startEditing() {
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

  return (
    <tr className="cl-row">

      {/* # */}
      <td className="cl-td cl-td--num">{customer.rowIndex}</td>

      {/* Business */}
      <td className="cl-td">
        <div className="cl-biz-name">{customer.businessName}</div>

        {hasBizPill && (
          <div className="cl-biz-pills">
            <span className="cl-biz-pill">
              <Icon name="link" size={11} strokeWidth={2} />
              {bizPillText}
            </span>

            {customer.duplicateCount ? (
              <span className="cl-dup-pill">
                <Icon name="copy" size={11} strokeWidth={2} />
                {customer.duplicateCount}{' '}
                {customer.duplicateCount === 1 ? 'duplicate' : 'duplicates'}
              </span>
            ) : null}
          </div>
        )}

        <div className="cl-biz-meta">
          {customer.contactName} · {customer.contactDate}
        </div>
      </td>

      {/* Contact */}
      <td className="cl-td">
        <div className="cl-email">{customer.email}</div>

        <div className="cl-phone-row">
          <span className="cl-phone-text">{customer.phone}</span>
          <button
            type="button"
            className="cl-icon-micro"
            title="Edit phone"
            aria-label="Edit phone number"
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
      <td className="cl-td">
        <div className="cl-status-wrap" ref={statusRef}>
          <button
            type="button"
            className={`cl-status-btn ${statusMeta.btnClass}`}
            onClick={() => setStatusOpen((o) => !o)}
            aria-expanded={statusOpen}
            aria-haspopup="listbox"
          >
            <Icon name={statusMeta.icon} size={13} strokeWidth={2} />
            {statusMeta.label}
            <Icon name="chevronDown" size={12} strokeWidth={2.5} />
          </button>

          {statusOpen && (
            <div className="cl-status-menu" role="listbox">
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
            </div>
          )}
        </div>
      </td>

      {/* Assign To */}
      <td className="cl-td">
        <div className="cl-assign-wrap" ref={assignRef}>
          <button
            type="button"
            className="cl-assign-btn"
            onClick={() => setAssignOpen((o) => !o)}
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

          {assignOpen && (
            <div className="cl-assign-menu" role="listbox">
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
            </div>
          )}
        </div>
      </td>

      {/* Internal Remark */}
      <td className="cl-td">
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
            tabIndex={0}
            onClick={startEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') startEditing()
            }}
            title="Click to edit remark"
          >
            {customer.remark || 'Add remark...'}
          </span>
        )}
      </td>

      {/* Updated */}
      <td className="cl-td cl-td--updated">
        <div className="cl-updated-cell">
          <span className="cl-updated-text">{customer.updatedLabel}</span>
          <div className="cl-row-actions">
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
              onClick={onOpenDetail}
            >
              <Icon name="eye" size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}
