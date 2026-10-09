import { useState } from 'react'
import { buildLoginLink } from '../utils/loginLink'
import type { IssuedLoginToken } from '../types/auth.types'

interface IssuedTokensTableProps {
  tokens: IssuedLoginToken[]
  revokingToken?: string
  onRevoke: (token: string) => void
}

export function IssuedTokensTable({
  tokens,
  revokingToken,
  onRevoke,
}: IssuedTokensTableProps) {
  const [copiedToken, setCopiedToken] =
    useState('')

  if (tokens.length === 0) {
    return (
      <div className="empty-state">
        <div>⌗</div>

        <strong>No tokens issued yet</strong>

        <span>
          Generate a token from the table above.
        </span>
      </div>
    )
  }

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(
        buildLoginLink(token),
      )
      setCopiedToken(token)
      setTimeout(
        () => setCopiedToken(''),
        1500,
      )
    } catch {
      setCopiedToken('')
    }
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>LOGIN LINK</th>
            <th>USER</th>
            <th>ROLE</th>
            <th>ISSUED</th>
            <th>STATUS</th>
            <th className="actions-heading">
              ACTIONS
            </th>
          </tr>
        </thead>

        <tbody>
          {tokens.map((record) => (
            <tr key={record.token}>
              <td>
                <span
                  className="token-code"
                  title={buildLoginLink(
                    record.token,
                  )}
                >
                  {buildLoginLink(record.token)}
                </span>
              </td>

              <td>
                <strong>{record.user.name}</strong>
              </td>

              <td>
                <span
                  className={`role-badge ${record.user.role.toLowerCase()}`}
                >
                  {record.user.role}
                </span>
              </td>

              <td>
                {new Date(
                  record.createdAt,
                ).toLocaleString()}
              </td>

              <td>
                <span
                  className={`status-badge ${
                    record.revoked
                      ? 'inactive'
                      : 'active'
                  }`}
                >
                  <span />
                  {record.revoked
                    ? 'REVOKED'
                    : 'ACTIVE'}
                </span>
              </td>

              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="action-button"
                    title="Copy login link"
                    onClick={() =>
                      handleCopy(record.token)
                    }
                  >
                    {copiedToken === record.token
                      ? '✓'
                      : '⧉'}
                  </button>

                  <button
                    type="button"
                    className="action-button delete"
                    title="Revoke token"
                    disabled={
                      record.revoked ||
                      revokingToken ===
                        record.token
                    }
                    onClick={() =>
                      onRevoke(record.token)
                    }
                  >
                    ⌫
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
