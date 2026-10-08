import { Icon } from '../shared/Icon'

export interface CustomersListSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * Controlled search input for the Customer Onboarding list.
 * Renders a `.cl-search` label with a leading Icon and <input>.
 * Receives value / onChange through props — contains no customer data.
 */
export function CustomersListSearchBar({
  value,
  onChange,
  placeholder = 'Search name, email, phone...',
}: CustomersListSearchBarProps) {
  return (
    <label className="cl-search">
      <Icon name="search" size={15} strokeWidth={2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search customers"
      />
    </label>
  )
}
