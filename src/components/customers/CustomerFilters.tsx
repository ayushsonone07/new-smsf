import { SearchInput } from '../ui/SearchInput'
import { Select } from '../ui/Select'

export type CustomerStatusFilter =
  | 'ALL'
  | 'ACTIVE'
  | 'INACTIVE'

interface CustomerFiltersProps {
  search: string
  statusFilter: CustomerStatusFilter
  onSearchChange: (value: string) => void
  onStatusFilterChange: (
    value: CustomerStatusFilter,
  ) => void
}

export function CustomerFilters({
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
}: CustomerFiltersProps) {
  return (
    <div className="filter-row filter-row-split">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search customers, company or email..."
        ariaLabel="Search customers"
      />

      <Select
        className="permission-select"
        aria-label="Filter by status"
        value={statusFilter}
        onChange={(event) =>
          onStatusFilterChange(
            event.target
              .value as CustomerStatusFilter,
          )
        }
      >
        <option value="ALL">
          All statuses
        </option>

        <option value="ACTIVE">
          Active
        </option>

        <option value="INACTIVE">
          Inactive
        </option>
      </Select>
    </div>
  )
}
