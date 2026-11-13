import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  title?: ReactNode
  description?: ReactNode
  showCloseButton?: boolean
  /** Max width preset. Default `sm` (440px) keeps old behaviour. */
  size?: ModalSize
  /**
   * Edge-to-edge content (no inner padding, clipped
   * corners). Use with a custom header like
   * <ProfileHeader />.
   */
  flush?: boolean
  /** Close on Escape key. Default true. */
  closeOnEscape?: boolean
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: '',
  md: 'modal--md',
  lg: 'modal--lg',
  xl: 'modal--xl',
}

export function Modal({
  open,
  onClose,
  children,
  className,
  title,
  description,
  showCloseButton = true,
  size = 'sm',
  flush = false,
  closeOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEscape) {
      return
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)

    return () =>
      window.removeEventListener(
        'keydown',
        handleKey,
      )
  }, [open, closeOnEscape, onClose])

  const classes = [
    'modal',
    SIZE_CLASSES[size],
    flush ? 'modal--flush' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-backdrop"
          onMouseDown={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeInOut' }}
        >
          <motion.div
            className={classes}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
