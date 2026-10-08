import type { InputHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
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
    <motion.label
      className={['head-search', className]
        .filter(Boolean)
        .join(' ')}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
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
    </motion.label>
  )
}
