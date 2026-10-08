import { SearchBar } from '../shared/SearchBar'

/**
 * Meeting-specific search bar matching the screenshot design.
 * Compact height, white background, search icon on left.
 */
export interface MeetingSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function MeetingSearchBar({
  value,
  onChange,
  placeholder = 'Search customer, email, or business...',
  className,
}: MeetingSearchBarProps) {
  return (
    <SearchBar
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={['meeting-search', className].filter(Boolean).join(' ')}
    />
  )
}