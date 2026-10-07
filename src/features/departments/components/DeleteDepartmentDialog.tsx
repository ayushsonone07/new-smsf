import type { Department } from '../types/department.types'

interface DeleteDepartmentDialogProps {
  department: Department | null
  isDeleting: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteDepartmentDialog({
  department,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteDepartmentDialogProps) {
  if (!department) {
    return null
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="delete-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="warning-icon">!</div>

        <h2>Delete Department?</h2>

        <p>
          This will remove the department login account
          for <strong>{department.name}</strong>.
          This action cannot be undone.
        </p>

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
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting
              ? 'Deleting...'
              : 'Delete Department'}
          </button>
        </div>
      </div>
    </div>
  )
}