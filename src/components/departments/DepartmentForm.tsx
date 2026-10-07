import { FormField } from '../common/FormField'

export interface DepartmentFormValues {
  name: string
  username: string
  email: string
  password: string
}

export type DepartmentFormField =
  keyof DepartmentFormValues

interface DepartmentFormProps {
  values: DepartmentFormValues
  isEdit: boolean
  onChange: (
    field: DepartmentFormField,
    value: string,
  ) => void
}

export function DepartmentForm({
  values,
  isEdit,
  onChange,
}: DepartmentFormProps) {
  return (
    <>
      <FormField
        id="department-name"
        label="Department Name"
        required
        value={values.name}
        onChange={(event) =>
          onChange('name', event.target.value)
        }
        placeholder="e.g. Customer Support"
      />

      <FormField
        id="department-username"
        label="Login Username"
        required
        value={values.username}
        onChange={(event) =>
          onChange('username', event.target.value)
        }
        placeholder="e.g. customer.support"
      />

      <FormField
        id="department-email"
        label="Email Address"
        required
        type="email"
        value={values.email}
        onChange={(event) =>
          onChange('email', event.target.value)
        }
        placeholder="department@company.com"
      />

      {!isEdit && (
        <FormField
          id="department-password"
          label="Password"
          required
          type="password"
          minLength={6}
          value={values.password}
          onChange={(event) =>
            onChange('password', event.target.value)
          }
          placeholder="Minimum 6 characters"
        />
      )}
    </>
  )
}
