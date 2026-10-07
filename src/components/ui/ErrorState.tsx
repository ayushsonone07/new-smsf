import type { ReactNode } from 'react'
import { Button } from './Button'

interface ErrorStateProps {
  title: ReactNode
  message?: ReactNode
  retryLabel?: string
  onRetry?: () => void
}

export function ErrorState({
  title,
  message,
  retryLabel = 'Try Again',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <strong>{title}</strong>

      {message ? <p>{message}</p> : null}

      {onRetry ? (
        <Button onClick={onRetry}>{retryLabel}</Button>
      ) : null}
    </div>
  )
}
