import type { InputHTMLAttributes } from 'react'
import { Icon } from './Icon'

interface SearchBarProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
  > {
  value: string
  onChange: (value: string) => void
}

/** Controlled search input with a leading icon. */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search',
  className,
  ...props
}: SearchBarProps) {
  return (
    <label
      className={['head-search', className]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon name="search" className="head-search__icon" />

      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        {...props}
      />
    </label>
  )
}
