import type { ButtonHTMLAttributes } from 'react'
import { Icon } from './Icon'
import type { IconName } from './iconPaths'

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName
  label: string
  size?: number
  iconSize?: number
  /** `ghost` = no border, `outline` = white with border, `tint` = soft blue. */
  variant?: 'ghost' | 'outline' | 'tint'
}

/** Square icon-only button with accessible label. */
export function IconButton({
  icon,
  label,
  size = 34,
  iconSize = 16,
  variant = 'outline',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={['icon-btn', `icon-btn--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  )
}
