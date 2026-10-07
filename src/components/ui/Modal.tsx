import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  title?: ReactNode
  description?: ReactNode
  showCloseButton?: boolean
}

export function Modal({
  open,
  onClose,
  children,
  className,
  title,
  description,
  showCloseButton = true,
}: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className={className ?? 'modal'}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {title ? (
          <div className="modal-header">
            <div>
              <h2>{title}</h2>

              {description ? (
                <p>{description}</p>
              ) : null}
            </div>

            {showCloseButton ? (
              <button
                type="button"
                className="close-button"
                onClick={onClose}
                aria-label="Close"
              >
                ×
              </button>
            ) : null}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  )
}
