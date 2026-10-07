import type { InputHTMLAttributes } from 'react'
import { Input } from '../ui/Input'

interface FormFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function FormField({
  label,
  id,
  ...inputProps
}: FormFieldProps) {
  return (
    <label htmlFor={id}>
      {label}

      <Input id={id} {...inputProps} />
    </label>
  )
}
