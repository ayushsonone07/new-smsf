import { useState } from 'react'
import { FormField } from '../common/FormField'

export interface DepartmentFormValues {
  name: string
  username: string
  email: string
  contact: string
  password: string
}

export type DepartmentFormField = keyof DepartmentFormValues

interface DepartmentFormProps {
  values: DepartmentFormValues
  isEdit: boolean
  onChange: (field: DepartmentFormField, value: string) => void
}

export function DepartmentForm({
  values,
  isEdit,
  onChange,
}: DepartmentFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <FormField
        id="department-username"
        label="Department Name (Username)"
        required
        value={values.username}
        minLength={3}
        maxLength={20}
        onChange={(event) => {
          onChange('username', event.target.value)
          onChange('name', event.target.value)
        }}
        placeholder="Enter department name / username (3-20 characters)"
      />

      <FormField
        id="department-email"
        label="Email"
        required
        type="email"
        value={values.email}
        onChange={(event) => onChange('email', event.target.value)}
        placeholder="Enter email address"
      />

      <div className="form-field">
        <label htmlFor="department-password">
          {isEdit ? 'New Password (optional)' : 'Password'}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="department-password"
            required={!isEdit}
            type={showPassword ? 'text' : 'password'}
            minLength={6}
            maxLength={12}
            value={values.password}
            onChange={(event) => onChange('password', event.target.value)}
            placeholder={
              isEdit
                ? 'Leave blank to keep current password'
                : 'Enter password (6-12 characters)'
            }
            style={{ width: '100%', paddingRight: '2.75rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            title={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '0.65rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: '#64748b',
              padding: '0.2rem',
            }}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
      </div>
    </>
  )
}
