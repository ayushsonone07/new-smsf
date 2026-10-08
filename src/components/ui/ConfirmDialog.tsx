import type { ReactNode } from 'react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  message: ReactNode
  confirmLabel?: string
  confirmLoadingLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmLoadingLabel = 'Please wait...',
  cancelLabel = 'Cancel',
  isLoading = false,
  error,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      className="delete-modal"
      showCloseButton={false}
    >
      <div className="warning-icon">!</div>

      <h2>{title}</h2>

      <p>{message}</p>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="modal-actions">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelLabel}
        </Button>

        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? confirmLoadingLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
