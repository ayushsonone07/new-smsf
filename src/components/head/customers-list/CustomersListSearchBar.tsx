import { motion } from 'framer-motion'
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
    <motion.label
      className="cl-search"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Icon name="search" size={15} strokeWidth={2} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search customers"
      />
    </motion.label>
  )
}
