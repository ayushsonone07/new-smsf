import { SearchInput } from '../ui/SearchInput'

interface DepartmentFiltersProps {
  search: string
  onSearchChange: (value: string) => void
}

export function DepartmentFilters({
  search,
  onSearchChange,
}: DepartmentFiltersProps) {
  return (
    <div className="filter-row">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search departments, username or email..."
        ariaLabel="Search departments"
      />
    </div>
  )
}
