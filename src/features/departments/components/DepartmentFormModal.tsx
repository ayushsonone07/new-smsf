import { useState } from 'react'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../types/department.types'

interface DepartmentFormModalProps {
  open: boolean
  department: Department | null
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onCreate: (data: CreateDepartmentRequest) => void
  onUpdate: (
    data: UpdateDepartmentRequest,
  ) => void
}

export function DepartmentFormModal({
  open,
  department,
  isSubmitting,
  error,
  onClose,
  onCreate,
  onUpdate,
}: DepartmentFormModalProps) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [wasOpen, setWasOpen] = useState(open)

  const isEdit = Boolean(department)

  if (open !== wasOpen) {
    setWasOpen(open)

    if (open) {
      setName(department?.name ?? '')
      setUsername(department?.username ?? '')
      setEmail(department?.email ?? '')
      setPassword('')
    }
  }

  if (!open) {
    return null
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isEdit) {
      onUpdate({
        name,
        username,
        email,
      })

      return
    }

    onCreate({
      name,
      username,
      email,
      password,
    })
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <div>
            <h2>
              {isEdit
                ? 'Edit Department Login'
                : 'Create Department Login'}
            </h2>

            <p>
              {isEdit
                ? 'Update department account details.'
                : 'Create login credentials for a department.'}
            </p>
          </div>

          <button
            type="button"
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Department Name

            <input
              required
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Customer Support"
            />
          </label>

          <label>
            Login Username

            <input
              required
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              placeholder="e.g. customer.support"
            />
          </label>

          <label>
            Email Address

            <input
              required
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="department@company.com"
            />
          </label>

          {!isEdit && (
            <label>
              Password

              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Minimum 6 characters"
              />
            </label>
          )}

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}