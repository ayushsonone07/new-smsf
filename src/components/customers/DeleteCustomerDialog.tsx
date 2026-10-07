import type { ReactNode } from 'react'
import type { Customer } from '../../features/departments/types/customer.types'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface DeleteCustomerDialogProps {
  customer: Customer | null
  isDeleting: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteCustomerDialog({
  customer,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteCustomerDialogProps) {
  const open = customer !== null

  const message: ReactNode = (
    <>
      This will remove{' '}
      <strong>{customer?.name}</strong> from
      this department. This action cannot be
      undone.
    </>
  )

  return (
    <ConfirmDialog
      open={open}
      title="Delete Customer?"
      message={message}
      confirmLabel="Delete Customer"
      confirmLoadingLabel="Deleting..."
      isLoading={isDeleting}
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}
