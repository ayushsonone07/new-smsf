import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'icon'
  | 'action-features'
  | 'action-edit'
  | 'action-delete'
  | 'action-dashboard'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'primary-button',
  secondary: 'secondary-button',
  danger: 'danger-button',
  icon: 'icon-button',
  'action-features': 'action-button features',
  'action-edit': 'action-button edit',
  'action-delete': 'action-button delete',
  'action-dashboard': 'action-button dashboard',
}

export function Button({
  variant = 'primary',
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      {...props}
    >
      {children}
    </button>
  )
}
