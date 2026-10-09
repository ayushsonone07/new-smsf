import type { AuthUser } from '../types/auth.types'

interface IssueTokenTableProps {
  users: AuthUser[]
  isIssuing: boolean
  issuingUserId?: string
  onIssue: (userId: string) => void
}

export function IssueTokenTable({
  users,
  isIssuing,
  issuingUserId,
  onIssue,
}: IssueTokenTableProps) {
  const eligibleUsers = users.filter(
    (user) => user.role !== 'ADMIN',
  )

  if (eligibleUsers.length === 0) {
    return (
      <div className="empty-state">
        <div>⌗</div>

        <strong>No users to issue tokens</strong>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>USER</th>
            <th>EMAIL</th>
            <th>ROLE</th>
            <th className="actions-heading">
              ACTIONS
            </th>
          </tr>
        </thead>

        <tbody>
          {eligibleUsers.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
              </td>

              <td>{user.email}</td>

              <td>
                <span
                  className={`role-badge ${user.role.toLowerCase()}`}
                >
                  {user.role}
                </span>
              </td>

              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="primary-button token-issue-button"
                    disabled={
                      isIssuing &&
                      issuingUserId === user.id
                    }
                    onClick={() =>
                      onIssue(user.id)
                    }
                  >
                    {isIssuing &&
                    issuingUserId === user.id
                      ? 'Generating...'
                      : 'Generate Token'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
