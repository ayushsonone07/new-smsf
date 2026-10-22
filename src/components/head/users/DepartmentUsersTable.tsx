import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Avatar } from '../shared/Avatar'
import { RolePill } from './RolePill'
import { AchievedPill, AttendancePills } from './MetricPill'
import { Icon } from '../shared/Icon'
import type { DepartmentUser } from '../../../features/departments/head/types/head.types'

/** Column keys an admin can switch off from the permissions page. */
export type DepartmentUserColumnKey =
  | 'name'
  | 'phone'
  | 'email'
  | 'role'
  | 'target'
  | 'achieved'
  | 'attendance'
  | 'actions'

const tbodyVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

const expandedRowVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

interface DepartmentUsersTableProps {
  users: DepartmentUser[]
  onView?: (user: DepartmentUser) => void
  onEdit?: (user: DepartmentUser) => void
  onDelete?: (user: DepartmentUser) => void
  /** "Login as this user" button. Hidden when omitted. */
  onLoginAs?: (user: DepartmentUser) => void
  /**
   * Content for the expandable row under each user.
   * Chevron is hidden when omitted.
   */
  renderExpanded?: (user: DepartmentUser) => ReactNode
  emptyMessage?: string
  /** Column keys disabled by the admin — rendered nowhere. */
  hiddenColumns?: string[]
  /**
   * Read-only mode for the actions column: view stays,
   * edit/delete disappear (Role B with CAN_READ).
   */
  canEditActions?: boolean
  dynamicColumns?: Array<{ key: string; label: string }>
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  totalUsers?: number
}

/**
 * Department users list — name / number / email /
 * role / target / achieved / attendance / actions.
 * All actions are optional callbacks so the table can
 * be used read-only too.
 */
export function DepartmentUsersTable({
  users,
  onView,
  onEdit,
  onDelete,
  onLoginAs,
  renderExpanded,
  emptyMessage = 'No users found.',
  hiddenColumns,
  canEditActions = true,
  dynamicColumns = [],
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  totalUsers,
}: DepartmentUsersTableProps) {
  const [expandedId, setExpandedId] = useState<
    string | null
  >(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLTableRowElement>(null)

  // Latest state/callback for the observer so it isn't re-created on every
  // render (which re-fired "load more" for an already-visible sentinel).
  const onLoadMoreRef = useRef(onLoadMore)
  const hasNextPageRef = useRef(hasNextPage)
  const isFetchingNextPageRef = useRef(isFetchingNextPage)

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
    hasNextPageRef.current = hasNextPage
    isFetchingNextPageRef.current = isFetchingNextPage
  })

  // Use a single load trigger so the same next page is not requested twice.
  useEffect(() => {
    if (!hasNextPage) return

    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (!hasNextPageRef.current || isFetchingNextPageRef.current) return
        onLoadMoreRef.current?.()
      },
      {
        root: containerRef.current,
        rootMargin: '250px',
        threshold: 0,
      },
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage])

  const visible = (key: DepartmentUserColumnKey) =>
    !hiddenColumns?.includes(key)

  const showActions =
    visible('actions') &&
    Boolean(onView || onEdit || onDelete)

  const visibleColumnCount = (
    [
      'name',
      'phone',
      'email',
      'role',
      'target',
      'achieved',
      'attendance',
    ] as DepartmentUserColumnKey[]
  ).reduce(
    (count, key) => (visible(key) ? count + 1 : count),
    0,
  )

  const columnCount =
    visibleColumnCount +
    dynamicColumns.length +
    (renderExpanded ? 1 : 0) +
    (showActions ? 1 : 0)

  return (
    <div
      className="table-wrapper users-table"
      ref={containerRef}
      style={{ maxHeight: '720px', overflowY: 'auto' }}
    >
      <table>
        <thead>
          <tr>
            {renderExpanded ? <th className="users-table__expand-column" aria-label="Expand" /> : null}
            {visible('name') ? <th className="users-table__name-column">Name</th> : null}
            {visible('phone') ? <th className="users-table__phone-column">Number</th> : null}
            {visible('email') ? <th className="users-table__email-column">Email</th> : null}
            {visible('role') ? <th className="users-table__role-column">Role</th> : null}
            {visible('target') ? (
              <th className="is-right users-table__target-column">Target</th>
            ) : null}
            {visible('achieved') ? (
              <th className="is-center users-table__achieved-column">Achieved</th>
            ) : null}
            {visible('attendance') ? (
              <th className="is-center users-table__attendance-column">P / A days</th>
            ) : null}
            {dynamicColumns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {showActions ? (
              <th className="is-right users-table__actions-head users-table__actions-column">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>

        <motion.tbody
          initial="hidden"
          animate="visible"
          variants={tbodyVariants}
        >
          {users.length === 0 ? (
            <tr>
              <td
                colSpan={columnCount}
                className="table-empty-cell"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : null}

          {users.map((user) => {
            const expanded = expandedId === user.id

            return (
              <UserRow
                key={user.id}
                user={user}
                expanded={expanded}
                visible={visible}
                onToggle={
                  renderExpanded
                    ? () =>
                        setExpandedId(
                          expanded ? null : user.id,
                        )
                    : undefined
                }
                expandedContent={
                  expanded && renderExpanded
                    ? renderExpanded(user)
                    : null
                }
                columnCount={columnCount}
                showActions={showActions}
                canEditActions={canEditActions}
                dynamicColumns={dynamicColumns}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onLoginAs={onLoginAs}
              />
            )
          })}

          {/* Sentinel row for IntersectionObserver */}
          {hasNextPage && (
            <tr ref={sentinelRef} style={{ height: 1 }}>
              <td colSpan={columnCount} style={{ padding: 0, height: 1, border: 'none', background: 'transparent' }} />
            </tr>
          )}

          {/* Loading indicator when fetching next 10 users */}
          {isFetchingNextPage && (
            <tr>
              <td
                colSpan={columnCount}
                style={{
                  textAlign: 'center',
                  padding: '14px',
                  color: '#2563eb',
                  fontSize: 13,
                  fontWeight: 500,
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      border: '2px solid #93c5fd',
                      borderTopColor: '#2563eb',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Loading more users...</span>
                </div>
              </td>
            </tr>
          )}
        </motion.tbody>
      </table>

      {/* Footer bar with user count & pagination state */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--surface-color, #ffffff)',
          fontSize: '13px',
          color: 'var(--text-secondary, #64748b)',
        }}
      >
        <span>
          Showing <strong>{users.length}</strong>
          {totalUsers && totalUsers > users.length ? ` of ${totalUsers}` : ''} users
        </span>

        {hasNextPage ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              Scroll down to load more
            </span>
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isFetchingNextPage ? 'not-allowed' : 'pointer',
              }}
            >
              {isFetchingNextPage ? 'Loading...' : 'Load more 10'}
            </button>
          </div>
        ) : users.length > 0 ? (
          <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 500 }}>
            ✓ All {users.length} users loaded
          </span>
        ) : null}
      </div>
    </div>
  )
}

interface UserRowProps {
  user: DepartmentUser
  expanded: boolean
  visible: (key: DepartmentUserColumnKey) => boolean
  onToggle?: () => void
  expandedContent: ReactNode
  columnCount: number
  showActions: boolean
  canEditActions: boolean
  dynamicColumns: Array<{ key: string; label: string }>
  onView?: (user: DepartmentUser) => void
  onEdit?: (user: DepartmentUser) => void
  onDelete?: (user: DepartmentUser) => void
  onLoginAs?: (user: DepartmentUser) => void
}

function UserRow({
  user,
  expanded,
  visible,
  onToggle,
  expandedContent,
  columnCount,
  showActions,
  canEditActions,
  dynamicColumns,
  onView,
  onEdit,
  onDelete,
  onLoginAs,
}: UserRowProps) {
  return (
    <>
      <motion.tr
        variants={rowVariants}
        className={expanded ? 'is-expanded' : undefined}
      >
        {onToggle ? (
          <td className="users-table__chevron users-table__expand-column" data-label="Details">
            <button
              type="button"
              className={`chevron-button${
                expanded ? ' is-open' : ''
              }`}
              aria-expanded={expanded}
              aria-label={
                expanded ? 'Collapse' : 'Expand'
              }
              onClick={onToggle}
            >
              <Icon name="chevronDown" size={16} />
            </button>
          </td>
        ) : null}

        {visible('name') ? (
          <td className="users-table__name-column" data-label="User">
            <div className="user-cell">
              <Avatar name={user.name} src={user.avatarSrc} />

              <div className="user-cell__text">
                <strong title={user.name}>{user.name}</strong>
                <span>Joined {user.joinedLabel}</span>
              </div>

              {onLoginAs ? (
                <button
                  type="button"
                  className={`login-as-button${
                    user.isPresentToday ? ' is-online' : ''
                  }`}
                  title={`Login as ${user.name}`}
                  aria-label={`Login as ${user.name}`}
                  onClick={() => onLoginAs(user)}
                >
                  <Icon name="login" size={18} />
                </button>
              ) : null}
            </div>
          </td>
        ) : null}

        {visible('phone') ? (
          <td className="users-table__mono users-table__phone-column" data-label="Number">{user.phone}</td>
        ) : null}

        {visible('email') ? (
          <td className="users-table__email users-table__email-column" data-label="Email" title={user.email}>
            {user.email}
          </td>
        ) : null}

        {visible('role') ? (
          <td className="users-table__role-column" data-label="Role">
            <RolePill role={user.role} />
          </td>
        ) : null}

        {visible('target') ? (
          <td className="is-right users-table__target users-table__target-column" data-label="Target">
            {user.target}
          </td>
        ) : null}

        {visible('achieved') ? (
          <td className="is-center users-table__achieved-column" data-label="Achieved">
            <AchievedPill percent={user.achievedPercent} />
          </td>
        ) : null}

        {visible('attendance') ? (
          <td className="is-center users-table__attendance-column" data-label="P / A days">
            <AttendancePills
              present={user.presentDays}
              absent={user.absentDays}
            />
          </td>
        ) : null}

        {dynamicColumns.map((column) => {
          const value = user.dynamicValues?.[column.key]
          const displayValue =
            value === null || value === undefined
              ? ''
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value)

          return <td key={column.key} data-label={column.label}>{displayValue}</td>
        })}

        {showActions ? (
          <td className="is-right users-table__actions-column" data-label="Actions">
            <div className="users-table__actions">
              {onView ? (
                <button
                  type="button"
                  className="icon-action icon-action--view"
                  title="View report"
                  aria-label="View report"
                  onClick={() => onView(user)}
                >
                  <Icon name="eye" />
                </button>
              ) : null}

              {canEditActions && onEdit ? (
                <button
                  type="button"
                  className="icon-action icon-action--edit"
                  title="Edit"
                  aria-label="Edit"
                  onClick={() => onEdit(user)}
                >
                  <Icon name="pencil" />
                </button>
              ) : null}

              {canEditActions && onDelete ? (
                <button
                  type="button"
                  className="icon-action icon-action--delete"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => onDelete(user)}
                >
                  <Icon name="trash" />
                </button>
              ) : null}
            </div>
          </td>
        ) : null}
      </motion.tr>

      {expanded && expandedContent ? (
        <motion.tr
          variants={expandedRowVariants}
          className="users-table__expanded-row"
        >
          <td colSpan={columnCount}>{expandedContent}</td>
        </motion.tr>
      ) : null}
    </>
  )
}
