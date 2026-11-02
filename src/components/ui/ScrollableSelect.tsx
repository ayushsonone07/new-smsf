import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

export interface ScrollableSelectOption {
  value: string
  label: string
}

export interface ScrollableSelectProps {
  value: string
  onChange: (value: string) => void
  options: (ScrollableSelectOption | string)[]
  pinnedOption?: ScrollableSelectOption
  placeholder?: string
  searchable?: boolean
  maxHeight?: number
  pageSize?: number
  width?: string
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export function ScrollableSelect({
  value,
  onChange,
  options,
  pinnedOption,
  placeholder = 'Select an option',
  searchable = true,
  maxHeight = 220,
  pageSize,
  width = '240px',
  disabled = false,
  className = '',
  style = {},
}: ScrollableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleOptionCount, setVisibleOptionCount] = useState(pageSize ?? 0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Normalize options to { value, label }
  const normalizedOptions = useMemo<ScrollableSelectOption[]>(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt }
      }
      return opt
    })
  }, [options])

  // Current selected label
  const selectedOption =
    normalizedOptions.find((opt) => opt.value === value) ??
    (pinnedOption?.value === value ? pinnedOption : undefined)
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions
    const query = searchTerm.toLowerCase().trim()
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    )
  }, [normalizedOptions, searchTerm])
  const filteredPinnedOption =
    pinnedOption &&
    (!searchTerm.trim() ||
      pinnedOption.label.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      pinnedOption.value.toLowerCase().includes(searchTerm.toLowerCase().trim()))
      ? pinnedOption
      : undefined
  const visibleOptions = [
    ...(filteredPinnedOption ? [filteredPinnedOption] : []),
    ...(pageSize ? filteredOptions.slice(0, visibleOptionCount) : filteredOptions),
  ]

  // Handle clicking outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, searchable])

  // Handle keyboard ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!pageSize || visibleOptionCount >= filteredOptions.length) return

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    if (scrollHeight - scrollTop - clientHeight <= 24) {
      setVisibleOptionCount((count) => Math.min(count + pageSize, filteredOptions.length))
    }
  }

  return (
    <div
      ref={containerRef}
      className={`scrollable-select-container ${className}`}
      style={{
        position: 'relative',
        width: width,
        minWidth: width,
        display: 'inline-block',
        ...style,
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '7px 12px',
          fontSize: '13px',
          fontWeight: 500,
          borderRadius: '8px',
          border: isOpen ? '1px solid #3b82f6' : '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: selectedOption ? '#0f172a' : '#64748b',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.15s ease',
        }}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'left',
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            color: '#64748b',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search box if enabled and many items */}
          {searchable && normalizedOptions.length + (pinnedOption ? 1 : 0) > 5 && (
            <div
              style={{
                padding: '8px',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setVisibleOptionCount(pageSize ?? 0)
                }}
                placeholder="Search..."
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '12px',
                  color: '#1e293b',
                  padding: '2px 0',
                }}
              />
            </div>
          )}

          {/* Scrollable list with fixed maxHeight */}
          <div
            style={{
              maxHeight: `${maxHeight}px`,
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f8fafc',
            }}
            className="scrollable-select-menu"
            onScroll={handleListScroll}
          >
            {visibleOptions.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}
              >
                No options found
              </div>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: isSelected ? '#1d4ed8' : '#334155',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f8fafc'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {opt.label}
                    </span>
                    {isSelected && (
                      <Check size={14} style={{ color: '#2563eb', flexShrink: 0, marginLeft: '6px' }} />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
