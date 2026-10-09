import { FormField } from '../common/FormField'

export interface CustomerFormValues {
  name: string
  email: string
  phone: string
  company: string
}

export type CustomerFormField =
  keyof CustomerFormValues

interface CustomerFormProps {
  values: CustomerFormValues
  onChange: (
    field: CustomerFormField,
    value: string,
  ) => void
}

export function CustomerForm({
  values,
  onChange,
}: CustomerFormProps) {
  return (
    <>
      <FormField
        id="customer-name"
        label="Full Name"
        required
        value={values.name}
        onChange={(event) =>
          onChange('name', event.target.value)
        }
        placeholder="e.g. Aarav Sharma"
      />

      <FormField
        id="customer-email"
        label="Email Address"
        required
        type="email"
        value={values.email}
        onChange={(event) =>
          onChange('email', event.target.value)
        }
        placeholder="customer@company.com"
      />

      <FormField
        id="customer-phone"
        label="Phone Number"
        value={values.phone}
        onChange={(event) =>
          onChange('phone', event.target.value)
        }
        placeholder="+1 555 0000"
      />

      <FormField
        id="customer-company"
        label="Company"
        value={values.company}
        onChange={(event) =>
          onChange('company', event.target.value)
        }
        placeholder="e.g. Northwind Traders"
      />
    </>
  )
}
