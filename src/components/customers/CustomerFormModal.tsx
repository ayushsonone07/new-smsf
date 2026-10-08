import { useState } from 'react'  
import type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from '../../features/departments/types/customer.types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import {
  CustomerForm,
  type CustomerFormField,
  type CustomerFormValues,
} from './CustomerForm'

interface CustomerFormModalProps {
  open: boolean
  customer: Customer | null
  isSubmitting: boolean
  error?: string
  onClose: () => void
  onCreate: (
    data: CreateCustomerRequest,
  ) => void
  onUpdate: (
    data: UpdateCustomerRequest,
  ) => void
}

export function CustomerFormModal({
  open,
  customer,
  isSubmitting,
  error,
  onClose,
  onCreate,
  onUpdate,
}: CustomerFormModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [wasOpen, setWasOpen] = useState(open)

  const isEdit = Boolean(customer)

  if (open !== wasOpen) {
    setWasOpen(open)

    if (open) {
      setName(customer?.name ?? '')
      setEmail(customer?.email ?? '')
      setPhone(customer?.phone ?? '')
      setCompany(customer?.company ?? '')
    }
  }

  function handleFieldChange(
    field: CustomerFormField,
    value: string,
  ) {
    if (field === 'name') {
      setName(value)
    } else if (field === 'email') {
      setEmail(value)
    } else if (field === 'phone') {
      setPhone(value)
    } else {
      setCompany(value)
    }
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (isEdit) {
      onUpdate({ name, email, phone, company })

      return
    }

    onCreate({ name, email, phone, company })
  }

  const values: CustomerFormValues = {
    name,
    email,
    phone,
    company,
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? 'Edit Customer'
          : 'Add Customer'
      }
      description={
        isEdit
          ? 'Update customer details.'
          : 'Add a new customer to this department.'
      }
    >
      <form onSubmit={handleSubmit}>
        <CustomerForm
          values={values}
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
                : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
