import { useState } from 'react'

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

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  fontWeight: 400,
  lineHeight: '1.25rem',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  border: '1.5px solid #cbd5e1',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '0.35rem',
}

export function DepartmentForm({
  values,
  isEdit,
  onChange,
}: DepartmentFormProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem',
      }}
    >
      {/* 1. Department Name / Username */}
      <div>
        <label htmlFor="department-username" style={labelStyle}>
          Department Name (Username) <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          id="department-username"
          required
          type="text"
          value={values.username}
          minLength={3}
          maxLength={20}
          onChange={(event) => {
            onChange('username', event.target.value)
            onChange('name', event.target.value)
          }}
          placeholder="e.g. WebsiteMBG or MarketingHead"
          style={inputStyle}
        />
        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          3-20 characters, used as login username
        </span>
      </div>

      {/* 2. Email Address */}
      <div>
        <label htmlFor="department-email" style={labelStyle}>
          Email Address <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          id="department-email"
          required
          type="email"
          value={values.email}
          onChange={(event) => onChange('email', event.target.value)}
          placeholder="e.g. websitembg@gmail.com"
          style={inputStyle}
        />
        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          Used for login and notifications
        </span>
      </div>

      {/* 3. Phone Number */}
      <div>
        <label htmlFor="department-contact" style={labelStyle}>
          Phone Number {!isEdit && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        <input
          id="department-contact"
          required={!isEdit}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          pattern="[0-9]{10}"
          minLength={10}
          maxLength={10}
          value={values.contact}
          onChange={(event) =>
            onChange('contact', event.target.value.replace(/\D/g, '').slice(0, 10))
          }
          placeholder="Enter 10-digit phone number"
          title="Phone number must contain exactly 10 digits"
          style={inputStyle}
        />
        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          Must be exactly 10 digits
        </span>
      </div>

      {/* 4. Password */}
      <div>
        <label htmlFor="department-password" style={labelStyle}>
          {isEdit ? 'New Password (optional)' : 'Password'}{' '}
          {!isEdit && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="department-password"
            required={!isEdit}
            type={showPassword ? 'text' : 'password'}
            minLength={6}
            maxLength={20}
            value={values.password}
            onChange={(event) => onChange('password', event.target.value)}
            placeholder={
              isEdit
                ? 'Leave blank to keep current password'
                : 'Enter password (6-20 characters)'
            }
            style={{ ...inputStyle, paddingRight: '2.75rem' }}
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
              fontSize: '1rem',
              color: '#64748b',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          Min 6 characters
        </span>
      </div>
    </div>
  )
}
