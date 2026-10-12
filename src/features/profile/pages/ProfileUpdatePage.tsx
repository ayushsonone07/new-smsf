import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  getCurrentPhoneNumber,
  getSession,
  homeForRole,
  updateSessionPhoneNumber,
} from '../../../app/auth/session'
import {
  fetchCurrentUserProfileMeta,
  updateDepartmentUser,
} from '../../../api/department-users.api'

/**
 * Mirrors SMSF's ProfileUpdate page: read-only email/role,
 * editable 10-digit phone number saved via
 * PUT /api/auth/department/update?action=edit.
 * ADMIN has no department record, so the phone is
 * stored locally in sessionStorage only.
 */
export function ProfileUpdatePage() {
  const navigate = useNavigate()
  const session = getSession()

  const [phone, setPhone] = useState(() => getCurrentPhoneNumber())
  const [resolvedId, setResolvedId] = useState<number | string | undefined>(
    session?.user.id,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCurrentUserProfileMeta().then((meta) => {
      if (cancelled) return
      if (meta.id !== undefined) {
        setResolvedId(meta.id)
      }
      if (meta.phoneNumber && !getCurrentPhoneNumber()) {
        updateSessionPhoneNumber(meta.phoneNumber)
        setPhone(meta.phoneNumber)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back()
    } else if (session) {
      navigate({
        to: homeForRole(
          session.user.role as never,
          session.user.departmentType,
        ) as never,
      })
    } else {
      navigate({ to: '/login' })
    }
  }

  async function handleSave() {
    const trimmed = phone.trim()
    setError(null)
    setSuccess(null)

    if (!trimmed) {
      setError('Phone number cannot be empty.')
      return
    }
    if (!/^\d{10}$/.test(trimmed)) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }
    if (!session) {
      setError('Authentication information missing. Please login again.')
      return
    }

    setSaving(true)
    try {
      if (session.user.role === 'ADMIN') {
        updateSessionPhoneNumber(trimmed)
        setSuccess('Profile updated successfully.')
      } else {
        await updateDepartmentUser({
          id: resolvedId ?? session.user.id,
          phoneNumber: trimmed,
          email: session.user.email,
          departmentType: session.user.departmentType,
        })
        updateSessionPhoneNumber(trimmed)
        setSuccess('Profile updated successfully.')
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update profile. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-content">
      <div className="profile-update">
        <header className="profile-update__topbar">
          <button
            type="button"
            className="secondary-button"
            onClick={handleBack}
          >
            ← Back
          </button>
          <div className="profile-update__title">
            <span className="profile-update__mark">⚙</span>
            <h1>Profile Settings</h1>
          </div>
          <span className="profile-update__spacer" aria-hidden="true" />
        </header>

        <section className="content-card profile-update__card">
          <h2>Update your profile</h2>
          <p className="page-description">
            Manage your contact details and account information.
          </p>

          {error ? <p className="form-error">{error}</p> : null}
          {success ? (
            <p className="profile-update__success">{success}</p>
          ) : null}

          <label className="profile-update__field">
            Email Address{' '}
            <span className="profile-update__readonly-hint">
              (Cannot be changed)
            </span>
            <input
              type="email"
              value={session?.user.email ?? ''}
              disabled
              readOnly
            />
          </label>

          <label className="profile-update__field">
            Role
            <input
              value={session?.user.role.replace(/_/g, ' ') ?? ''}
              disabled
              readOnly
            />
          </label>

          <label className="profile-update__field">
            Phone Number
            <input
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value.replace(/\D/g, ''))
              }
              placeholder="Enter 10-digit phone number"
              maxLength={10}
              disabled={saving}
            />
            <span className="field-hint">
              Enter a 10-digit phone number without country code.
            </span>
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleBack}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
