import { useState } from 'react'
import type { ReactNode } from 'react'
import { Avatar } from '../shared/Avatar'
import { RolePill } from './RolePill'
import { AchievedPill, AttendancePills } from './MetricPill'
import { Icon } from '../shared/Icon'
import type { DepartmentUser } from '../../../features/departments/head/types/head.types'

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
}: DepartmentUsersTableProps) {
  const [expandedId, setExpandedId] = useState<
    string | null
  >(null)

  const showActions = Boolean(onView || onEdit || onDelete)
  const columnCount =
    6 +
    (renderExpanded ? 1 : 0) +
    (showActions ? 1 : 0) +
    1

  return (
    <div className="table-wrapper users-table">
      <table>
        <thead>
          <tr>
            {renderExpanded ? <th aria-label="Expand" /> : null}
            <th>Name</th>
            <th>Number</th>
            <th>Email</th>
            <th>Role</th>
            <th className="is-right">Target</th>
            <th className="is-center">Achieved</th>
            <th className="is-center">P / A days</th>
            {showActions ? (
              <th className="is-right users-table__actions-head">
                Actions
              </th>
            ) : null}
          </tr>
        </thead>

        <tbody>
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
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onLoginAs={onLoginAs}
              />
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface UserRowProps {
  user: DepartmentUser
  expanded: boolean
  onToggle?: () => void
  expandedContent: ReactNode
  columnCount: number
  showActions: boolean
  onView?: (user: DepartmentUser) => void
  onEdit?: (user: DepartmentUser) => void
  onDelete?: (user: DepartmentUser) => void
  onLoginAs?: (user: DepartmentUser) => void
}

function UserRow({
  user,
  expanded,
  onToggle,
  expandedContent,
  columnCount,
  showActions,
  onView,
  onEdit,
  onDelete,
  onLoginAs,
}: UserRowProps) {
  return (
    <>
      <tr className={expanded ? 'is-expanded' : undefined}>
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

        <td className="users-table__mono">{user.phone}</td>

        <td className="users-table__email" title={user.email}>
          {user.email}
        </td>

        <td>
          <RolePill role={user.role} />
        </td>

        <td className="is-right users-table__target">
          {user.target}
        </td>

        <td className="is-center">
          <AchievedPill percent={user.achievedPercent} />
        </td>

        <td className="is-center">
          <AttendancePills
            present={user.presentDays}
            absent={user.absentDays}
          />
        </td>

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

              {onEdit ? (
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

              {onDelete ? (
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
      </tr>

      {expanded && expandedContent ? (
        <tr className="users-table__expanded-row">
          <td colSpan={columnCount}>{expandedContent}</td>
        </tr>
      ) : null}
    </>
  )
}
