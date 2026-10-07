import type { ReactNode } from 'react'
import type { Department } from '../../features/departments/types/department.types'
import { ConfirmDialog } from '../ui/ConfirmDialog'

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
  const open = department !== null

  const message: ReactNode = (
    <>
      This will remove the department login
      account for{' '}
      <strong>{department?.name}</strong>. This
      action cannot be undone.
    </>
  )

  return (
    <ConfirmDialog
      open={open}
      title="Delete Department?"
      message={message}
      confirmLabel="Delete Department"
      confirmLoadingLabel="Deleting..."
      isLoading={isDeleting}
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
}
