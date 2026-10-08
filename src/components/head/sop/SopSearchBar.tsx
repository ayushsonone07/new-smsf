import { SearchBar } from '../shared/SearchBar'

/**
 * SOP-specific search bar with defaults matching the SOP page design.
 * Wraps the shared SearchBar to provide a consistent SOP interface.
 */
export interface SopSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SopSearchBar({
  value,
  onChange,
  placeholder = 'Search by service name...',
  className,
}: SopSearchBarProps) {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  )
}