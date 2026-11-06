import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Building2, ChevronDown, Search, Check, X, Layers, AlertCircle } from 'lucide-react'
import type { ServiceDropdownOption } from './DepartmentFormModal'

interface DepartmentServiceSelectProps {
  options: ServiceDropdownOption[]
  value: string
  onChange: (key: string) => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
}

export function DepartmentServiceSelect({
  options,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  placeholder = 'Select a Service (Department Type)...',
}: DepartmentServiceSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [menuPos, setMenuPos] = useState<{
    top: number
    left: number
    width: number
    openUpwards: boolean
  } | null>(null)

  const selectedOption = useMemo(() => {
    if (!value) return null
    return (
      options.find((opt) => opt.key === value) ||
      options.find(
        (opt) =>
          opt.departmentType.toUpperCase() === value.toUpperCase() ||
          opt.serviceType.toUpperCase() === value.toUpperCase(),
      ) ||
      null
    )
  }, [options, value])

  const handleOpen = () => {
    if (disabled || isLoading) return
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 320
      const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight
      const width = Math.max(rect.width, 360)
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - width - 12,
      )

      setMenuPos({
        top: openUpwards ? rect.top - menuHeight - 6 : rect.bottom + 6,
        left,
        width,
        openUpwards,
      })
      setSearch('')
      setIsOpen(true)
    }
  }

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Click outside and scroll listeners
  useEffect(() => {
    if (!isOpen) return

    const handleClose = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleScroll = (e: Event) => {
      if (
        menuRef.current &&
        (menuRef.current === e.target ||
          menuRef.current.contains(e.target as Node))
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleResize = () => setIsOpen(false)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClose)
    document.addEventListener('touchstart', handleClose)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClose)
      document.removeEventListener('touchstart', handleClose)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.serviceType.toLowerCase().includes(q) ||
        opt.departmentType.toLowerCase().includes(q),
    )
  }, [options, search])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id="service-department-select-trigger"
        disabled={disabled || isLoading}
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 shadow-2xs ${
          isOpen
            ? 'border-blue-500 ring-3 ring-blue-500/15 bg-white'
            : selectedOption
            ? 'border-slate-300 bg-white hover:border-slate-400 hover:shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-300'
        } ${
          disabled || isLoading
            ? 'opacity-60 cursor-not-allowed bg-slate-50'
            : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              selectedOption
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
          </div>

          {selectedOption ? (
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {selectedOption.serviceType}
              </span>
              <span className="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                {selectedOption.departmentType}
              </span>
              {selectedOption.isServiceActive === false ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Inactive
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400 font-normal">
              {isLoading ? 'Loading available services...' : placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              minWidth: '320px',
              maxWidth: 'calc(100vw - 24px)',
              zIndex: 99999,
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-100"
            role="listbox"
          >
            {/* Search Header */}
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search service or department..."
                  className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  autoComplete="off"
                />
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-100/60">
              {filteredOptions.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    No services found
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-[240px] mx-auto">
                    No department service matched "{search}". Check spelling or create a new service.
                  </p>
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedOption?.key === opt.key
                  const isActive = opt.isServiceActive !== false

                  return (
                    <div
                      key={opt.key}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.key)
                        setIsOpen(false)
                      }}
                      className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/90 text-blue-900 font-medium'
                          : 'hover:bg-slate-50/90 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={isActive ? 'Active Service' : 'Inactive Service'}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {opt.serviceType}
                            </span>
                            {!isActive && (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                            {opt.departmentType}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer with count */}
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {filteredOptions.length} of {options.length} services
              </span>
              <span className="text-slate-400">Esc to close</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

