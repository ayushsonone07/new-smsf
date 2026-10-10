import { useState } from 'react'
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
}: DepartmentUsersTableProps) {
  const [expandedId, setExpandedId] = useState<
    string | null
  >(null)

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
    <div className="table-wrapper users-table">
      <table>
        <thead>
          <tr>
            {renderExpanded ? <th aria-label="Expand" /> : null}
            {visible('name') ? <th>Name</th> : null}
            {visible('phone') ? <th>Number</th> : null}
            {visible('email') ? <th>Email</th> : null}
            {visible('role') ? <th>Role</th> : null}
            {visible('target') ? (
              <th className="is-right">Target</th>
            ) : null}
            {visible('achieved') ? (
              <th className="is-center">Achieved</th>
            ) : null}
            {visible('attendance') ? (
              <th className="is-center">P / A days</th>
            ) : null}
            {dynamicColumns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {showActions ? (
              <th className="is-right users-table__actions-head">
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
        </motion.tbody>
      </table>
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
          <td className="users-table__chevron">
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
          <td>
            <div className="user-cell">
              <Avatar name={user.name} src={user.avatarSrc} />

              <div className="user-cell__text">
                <strong>{user.name}</strong>
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
          <td className="users-table__mono">{user.phone}</td>
        ) : null}

        {visible('email') ? (
          <td className="users-table__email" title={user.email}>
            {user.email}
          </td>
        ) : null}

        {visible('role') ? (
          <td>
            <RolePill role={user.role} />
          </td>
        ) : null}

        {visible('target') ? (
          <td className="is-right users-table__target">
            {user.target}
          </td>
        ) : null}

        {visible('achieved') ? (
          <td className="is-center">
            <AchievedPill percent={user.achievedPercent} />
          </td>
        ) : null}

        {visible('attendance') ? (
          <td className="is-center">
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

          return <td key={column.key}>{displayValue}</td>
        })}

        {showActions ? (
          <td className="is-right">
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
