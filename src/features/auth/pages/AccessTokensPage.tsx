import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IssueTokenTable } from '../components/IssueTokenTable'
import { IssuedTokensTable } from '../components/IssuedTokensTable'
import { useIssuedTokens } from '../hooks/useIssuedTokens'
import { useIssueLoginToken } from '../hooks/useIssueLoginToken'
import { useRevokeLoginToken } from '../hooks/useRevokeLoginToken'
import { useUsers } from '../hooks/useUsers'
import { buildLoginLink } from '../utils/loginLink'
import { getSession } from '../../../app/auth/session'
import type { IssuedLoginToken } from '../types/auth.types'

export function AccessTokensPage() {
  const [lastIssued, setLastIssued] =
    useState<IssuedLoginToken | null>(null)
  const [copied, setCopied] = useState(false)

  const usersQuery = useUsers()
  const tokensQuery = useIssuedTokens()
  const issueMutation = useIssueLoginToken()
  const revokeMutation = useRevokeLoginToken()

  const session = getSession()

  function handleIssue(userId: string) {
    if (!session) return

    issueMutation.mutate(
      {
        targetUserId: userId,
        issuedBy: session.user.name,
      },
      {
        onSuccess: (record) => {
          setLastIssued(record)
          setCopied(false)
        },
      },
    )
  }

  function handleRevoke(token: string) {
    revokeMutation.mutate(token, {
      onSuccess: () => {
        setLastIssued((current) =>
          current &&
          current.token === token &&
          !current.revoked
            ? { ...current, revoked: true }
            : current,
        )
      },
    })
  }

  async function handleCopyLast() {
    if (!lastIssued) return

    try {
      await navigator.clipboard.writeText(
        buildLoginLink(lastIssued.token),
      )
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (tokensQuery.isPending) {
    return (
      <main className="page-content">
        <div className="loading-state">
          Loading tokens...
        </div>
      </main>
    )
  }

  if (tokensQuery.isError) {
    return (
      <main className="page-content">
        <div className="error-state">
          <strong>Unable to load tokens</strong>

          <p>{tokensQuery.error.message}</p>

          <button
            className="primary-button"
            onClick={() => tokensQuery.refetch()}
          >
            Try Again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page-content">
      <header className="topbar">
        <div>
          <p className="breadcrumb">
            <Link to="/admin">
              Administration
            </Link>
            {' / '}
            Access Tokens
          </p>

          <h1>Access Tokens</h1>

          <p className="page-description">
            Generate login links so Head and User
            accounts can sign in directly to their
            dashboard.
          </p>
        </div>

        <div className="topbar-actions">
          <Link
            to="/admin"
            className="secondary-button back-link"
          >
            ← Back to Departments
          </Link>

          <div className="profile-chip">
            <div className="admin-avatar small">
              A
            </div>

            <div>
              <strong>
                {session?.user.name ?? 'Admin'}
              </strong>
              <span>
                {session?.user.role ?? 'ADMIN'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="content-card">
        <div className="table-toolbar">
          <div>
            <h2>Issue Login Link</h2>

            <p>
              Pick a Head or User account and
              generate a shareable auto-login
              link.
            </p>
          </div>
        </div>

        {issueMutation.isError && (
          <p className="form-error">
            {issueMutation.error.message}
          </p>
        )}

        {lastIssued && (
          <div className="issue-banner">
            <div>
              <strong>
                Login link generated for{' '}
                {lastIssued.user.name}
              </strong>

              <span
                className="token-code wide"
                title={buildLoginLink(
                  lastIssued.token,
                )}
              >
                {lastIssued.revoked
                  ? 'Revoked'
                  : buildLoginLink(
                      lastIssued.token,
                    )}
              </span>
            </div>

            <div className="row-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={lastIssued.revoked}
                onClick={handleCopyLast}
              >
                {copied ? 'Copied ✓' : 'Copy Link'}
              </button>

              <button
                type="button"
                className="close-button"
                onClick={() => setLastIssued(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <IssueTokenTable
          users={usersQuery.data ?? []}
          isIssuing={issueMutation.isPending}
          issuingUserId={
            issueMutation.variables?.targetUserId
          }
          onIssue={handleIssue}
        />
      </section>

      <section className="content-card">
        <div className="table-toolbar">
          <div>
            <h2>Issued Tokens</h2>

            <p>
              Tokens stay valid until revoked by the
              admin.
            </p>
          </div>
        </div>

        {revokeMutation.isError && (
          <p className="form-error">
            {revokeMutation.error.message}
          </p>
        )}

        <IssuedTokensTable
          tokens={tokensQuery.data}
          revokingToken={
            revokeMutation.isPending
              ? revokeMutation.variables
              : undefined
          }
          onRevoke={handleRevoke}
        />
      </section>
    </main>
  )
}
