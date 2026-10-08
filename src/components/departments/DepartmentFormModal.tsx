import { useState } from 'react'
import type {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../../features/departments/types/department.types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import {
  DepartmentForm,
  type DepartmentFormField,
  type DepartmentFormValues,
} from './DepartmentForm'

interface DepartmentFormModalProps {
  open: boolean
  department: Department | null
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onCreate: (
    data: CreateDepartmentRequest,
  ) => void
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

  function handleFieldChange(
    field: DepartmentFormField,
    value: string,
  ) {
    if (field === 'name') {
      setName(value)
    } else if (field === 'username') {
      setUsername(value)
    } else if (field === 'email') {
      setEmail(value)
    } else {
      setPassword(value)
    }
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isEdit) {
      onUpdate({ name, username, email })

      return
    }

    onCreate({ name, username, email, password })
  }

  const values: DepartmentFormValues = {
    name,
    username,
    email,
    password,
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? 'Edit Department Login'
          : 'Create Department Login'
      }
      description={
        isEdit
          ? 'Update department account details.'
          : 'Create login credentials for a department.'
      }
    >
      <form onSubmit={handleSubmit}>
        <DepartmentForm
          values={values}
          isEdit={isEdit}
          onChange={handleFieldChange}
        />

        {error ? (
          <div className="form-error">
            {error}
          </div>
        ) : null}

        <div className="modal-actions">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Create Login'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
