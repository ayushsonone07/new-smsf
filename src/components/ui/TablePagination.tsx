import { Icon } from '../head/shared/Icon'
import './TablePagination.css'

export interface TablePaginationProps {
  page: number // 0-indexed
  pageSize: number
  totalResults: number
  onPageChange: (newPage: number) => void
  onPageSizeChange?: (newSize: number) => void
  pageSizeOptions?: number[]
  disabled?: boolean
  className?: string
}

export function TablePagination({
  page,
  pageSize,
  totalResults,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  disabled = false,
  className = '',
}: TablePaginationProps) {
  const totalPages = totalResults > 0 ? Math.ceil(totalResults / pageSize) : 1
  const displayStart = totalResults > 0 ? page * pageSize + 1 : 0
  const displayEnd = totalResults > 0 ? Math.min((page + 1) * pageSize, totalResults) : 0

  const handlePrev = () => {
    if (page > 0 && !disabled) {
      onPageChange(page - 1)
    }
  }

  const handleNext = () => {
    if (page < totalPages - 1 && !disabled) {
      onPageChange(page + 1)
    }
  }

  // Generate page pills (e.g., [1, 2, 3])
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(0)
      if (page > 2) {
        pages.push('ellipsis-start')
      }

      const start = Math.max(1, page - 1)
      const end = Math.min(totalPages - 2, page + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (page < totalPages - 3) {
        pages.push('ellipsis-end')
      }
      pages.push(totalPages - 1)
    }

    return pages
  }

  return (
    <div className={`table-pagination-root ${className}`}>
      {/* Left: Rows per page selector */}
      <div className="table-pagination-left">
        {onPageSizeChange ? (
          <div className="table-pagination-size-wrap">
            <span className="table-pagination-size-label">Rows per page:</span>
            <select
              className="table-pagination-select"
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Center: Pagination controls */}
      <div className="table-pagination-center">
        <button
          type="button"
          className="table-pagination-nav-btn"
          onClick={handlePrev}
          disabled={page === 0 || disabled || totalResults === 0}
          aria-label="Previous page"
          title="Previous page"
        >
          <Icon name="chevronLeft" size={16} strokeWidth={2.2} />
        </button>

        <div className="table-pagination-pages">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`${p}-${idx}`} className="table-pagination-ellipsis">
                  …
                </span>
              )
            }

            const isActive = p === page
            return (
              <button
                key={p}
                type="button"
                className={`table-pagination-page-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => !disabled && onPageChange(p)}
                disabled={disabled}
              >
                {p + 1}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="table-pagination-nav-btn"
          onClick={handleNext}
          disabled={page >= totalPages - 1 || disabled || totalResults === 0}
          aria-label="Next page"
          title="Next page"
        >
          <Icon name="chevronRight" size={16} strokeWidth={2.2} />
        </button>
      </div>

      {/* Right: Results info */}
      <div className="table-pagination-right">
        <span className="table-pagination-info">
          Showing <strong>{displayStart}</strong> to <strong>{displayEnd}</strong> of{' '}
          <strong>{totalResults}</strong> results
        </span>
      </div>
    </div>
  )
}

