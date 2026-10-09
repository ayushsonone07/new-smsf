import type { ReactNode } from 'react'

export interface FilterTab<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTab<T>[]
  value: T
  onChange: (value: T) => void
  /** Optional content rendered on the right (hint, action). */
  trailing?: ReactNode
  ariaLabel?: string
}

/**
 * Segmented tab strip with optional counts.
 * Generic over the tab value type so callers get
 * a typed onChange.
 */
export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  trailing,
  ariaLabel = 'Filter',
}: FilterTabsProps<T>) {
  return (
    <div className="filter-tabs-bar">
      <div
        className="filter-tabs"
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const active = tab.value === value

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`filter-tab${
                active ? ' active' : ''
              }`}
              onClick={() => onChange(tab.value)}
            >
              {tab.label}

              {tab.count !== undefined ? (
                <span className="filter-tab__count">
                  {tab.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {trailing ? (
        <div className="filter-tabs-trailing">
          {trailing}
        </div>
      ) : null}
    </div>
  )
}
