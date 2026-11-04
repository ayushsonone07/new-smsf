import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Search,
  SlidersHorizontal,
  Upload,
  RefreshCw,
  X,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  CheckCircle2,
  Check,
  Trash2,
  Copy,
  ExternalLink,
  Loader2,
  TrendingUp,
  LayoutGrid,
  CreditCard,
  UserPlus,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'
import {
  getLeads,
  deleteLeads,
  fetchFunnels,
  fetchAssignableUsers,
  assignLeadToUser,
  type LeadInfo,
  type AssignableUser,
  type FunnelItem,
} from '../../../api/leads.api'
import { DateRangePicker } from '../../../components/head/customers-list/CustomersListFilters'
import { UploadLeadModal } from '../components/UploadLeadModal'
import { AddLeadModal } from '../components/AddLeadModal'
import { LeadDetailsModal } from '../components/LeadDetailsModal'
import { TelecallerActionModal } from '../components/TelecallerActionModal'
import { UpdateLeadStatusModal } from '../components/UpdateLeadStatusModal'
import { GeneratePaymentModal } from '../components/GeneratePaymentModal'
import { TransferLeadModal } from '../components/TransferLeadModal'
import { DeleteLeadsModal } from '../components/DeleteLeadsModal'
import { SalesSummaryView } from '../components/SalesSummaryView'
import { CustomerPaymentView } from '../../payment/components/CustomerPaymentView'
import { ScrollableSelect } from '../../../components/ui/ScrollableSelect'
import '../../customers/pages/AdminCustomersPage.css'

const LEAD_STATUS_OPTIONS = [
  'PENDING',
  'FOLLOW_UP',
  'MEETING_SCHEDULED_AT',
  'NOT_CONNECTED',
  'NOT_INTERESTED',
  'DONE',
]

const TELECALLER_STATUS_OPTIONS = [
  'PENDING',
  'FOLLOW_UP',
  'NOT_CONNECTED',
  'ASSIGNED',
]

const LEAD_TYPE_OPTIONS = ['Webinar 999', 'Direct', 'Inbound', 'Referral', 'Campaign']

function isNa(val?: string | null): boolean {
  if (!val) return true
  const v = val.trim().toLowerCase()
  return v === '' || v === 'na' || v === 'n/a' || v === 'null' || v === 'undefined'
}

function getCustomerDisplay(lead: LeadInfo): { name: string; initial: string } {
  if (!isNa(lead.ownerName)) {
    const trimmed = lead.ownerName!.trim()
    return { name: trimmed, initial: trimmed.charAt(0).toUpperCase() }
  }

  if (!isNa(lead.businessName)) {
    const trimmed = lead.businessName!.trim()
    return { name: trimmed, initial: trimmed.charAt(0).toUpperCase() }
  }

  if (lead.businessEmail && lead.businessEmail.includes('@')) {
    const emailPrefix = lead.businessEmail.split('@')[0].replace(/[._0-9]/g, ' ').trim()
    if (emailPrefix) {
      const formatted = emailPrefix
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
      return { name: formatted, initial: formatted.charAt(0).toUpperCase() }
    }
  }

  if (lead.contact) {
    return { name: `Lead ${lead.contact}`, initial: 'L' }
  }

  return { name: `Lead #${lead.leadId?.slice(-4) || '—'}`, initial: 'L' }
}


function formatRepLabel(name?: string, email?: string): string {
  const n = (name || '').trim()
  const e = (email || '').trim()

  if (n && !n.includes('@')) {
    return n
  }

  const target = n || e
  if (!target) return 'Not Assigned'

  if (target.includes('@')) {
    const prefix = target.split('@')[0]
    const parts = prefix.split(/[._-]/).filter(Boolean)
    if (parts.length > 1) {
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    }
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }

  return target
}

export interface LeadsManagementPageProps {
  initialTab?: 'leads' | 'summary' | 'payments'
  feature?: any
  [key: string]: any
}


interface AssignedRepSelectProps {
  leadId: string
  currentVal: string
  options: { value: string; label: string }[]
  onAssign: (leadId: string, userValue: string) => void
}

function AssignedRepSelect({ leadId, currentVal, options, onAssign }: AssignedRepSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const hasMatch = Boolean(
    currentVal && options.some((opt) => opt.value.toLowerCase() === currentVal.toLowerCase())
  )
  const displayLabel = formatRepLabel(currentVal)

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 220
      const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight
      setMenuPos({
        top: openUpwards ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: Math.max(8, rect.left),
        width: Math.max(160, rect.width),
      })
      setSearch('')
      setIsOpen(true)
    }
  }

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
      // Do not close when scrolling inside the dropdown list
      if (
        menuRef.current &&
        (menuRef.current === e.target || menuRef.current.contains(e.target as Node))
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleResize = () => {
      setIsOpen(false)
    }

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
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    )
  }, [options, search])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`h-7 w-[112px] px-2 text-[11px] font-semibold rounded-lg border transition-all flex items-center justify-between gap-1 cursor-pointer truncate ${
          currentVal
            ? 'bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100/70 hover:border-blue-300'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        } focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs`}
        title={currentVal ? `Assigned to: ${displayLabel}` : 'Not Assigned'}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''} ${
            currentVal ? 'text-blue-500' : 'text-slate-400'
          }`}
        />
      </button>

      {isOpen &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              minWidth: `${menuPos.width}px`,
              maxWidth: '200px',
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Quick search input if there are more than 5 options */}
            {options.length > 5 && (
              <div className="relative mb-1">
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user..."
                  className="w-full h-6.5 pl-2 pr-6 text-[11px] bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable list with reduced, compact length (max 175px - approx 5 items) */}
            <div onScroll={(e) => e.stopPropagation()} className="max-h-[175px] overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
              <button
                type="button"
                onClick={() => {
                  onAssign(leadId, '')
                  setIsOpen(false)
                }}
                className={`w-full h-7 px-2 flex items-center justify-between text-[11px] rounded-md transition-colors cursor-pointer ${
                  !currentVal
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <span>Not Assigned</span>
                {!currentVal && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
              </button>

              {/* If current value is not in options, show it */}
              {currentVal && !hasMatch && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full h-7 px-2 flex items-center justify-between text-[11px] rounded-md bg-blue-50 text-blue-700 font-semibold cursor-pointer"
                >
                  <span className="truncate">{displayLabel}</span>
                  <Check className="w-3 h-3 text-blue-600 shrink-0" />
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <div className="py-2 text-center text-[10px] text-slate-400">No users found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected =
                    Boolean(currentVal) && opt.value.toLowerCase() === currentVal.toLowerCase()
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onAssign(leadId, opt.value)
                        setIsOpen(false)
                      }}
                      className={`w-full h-7 px-2 flex items-center justify-between text-[11px] rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate text-left">{opt.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}


interface FilterDropdownOption {
  value: string
  label: string
  dotColor?: string
}

const SALES_STATUS_FILTER_OPTIONS: FilterDropdownOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'PENDING', dotColor: 'bg-amber-500' },
  { value: 'FOLLOW_UP', label: 'FOLLOW UP', dotColor: 'bg-indigo-500' },
  { value: 'MEETING_SCHEDULED_AT', label: 'MEETING SCHEDULED AT', dotColor: 'bg-cyan-500' },
  { value: 'NOT_CONNECTED', label: 'NOT CONNECTED', dotColor: 'bg-rose-500' },
  { value: 'NOT_INTERESTED', label: 'NOT INTERESTED', dotColor: 'bg-slate-400' },
  { value: 'DONE', label: 'SALE WON', dotColor: 'bg-emerald-500' },
]

const TELECALLER_STATUS_FILTER_OPTIONS: FilterDropdownOption[] = [
  { value: 'all', label: 'All Telecaller Statuses' },
  { value: 'PENDING', label: 'PENDING', dotColor: 'bg-amber-500' },
  { value: 'FOLLOW_UP', label: 'FOLLOW UP', dotColor: 'bg-indigo-500' },
  { value: 'NOT_CONNECTED', label: 'NOT CONNECTED', dotColor: 'bg-rose-500' },
  { value: 'ASSIGNED', label: 'ASSIGNED', dotColor: 'bg-emerald-500' },
]

const LEAD_TYPE_FILTER_OPTIONS: FilterDropdownOption[] = [
  { value: 'all', label: 'All Lead Types' },
  { value: 'Webinar 999', label: 'Webinar 999', dotColor: 'bg-purple-500' },
  { value: 'Direct', label: 'Direct', dotColor: 'bg-blue-500' },
  { value: 'Inbound', label: 'Inbound', dotColor: 'bg-teal-500' },
  { value: 'Referral', label: 'Referral', dotColor: 'bg-amber-500' },
  { value: 'Campaign', label: 'Campaign', dotColor: 'bg-rose-500' },
]

interface FilterDropdownSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterDropdownOption[]
  allLabel: string
}

function FilterDropdownSelect({ value, onChange, options, allLabel }: FilterDropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selectedOption = options.find(
    (opt) =>
      opt.value.toLowerCase() === (value || '').toLowerCase() ||
      (opt.value === 'DONE' && ((value || '').toLowerCase() === 'sale_won' || (value || '').toLowerCase() === 'sale won'))
  )
  const displayLabel = value === 'all' || !value ? allLabel : selectedOption?.label || value

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = Math.min(options.length * 36 + 16, 260)
      const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight
      const width = Math.max(rect.width, 180)
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
      setMenuPos({
        top: openUpwards ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left,
        width,
      })
      setIsOpen(true)
    }
  }

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
        (menuRef.current === e.target || menuRef.current.contains(e.target as Node))
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

  const isSelectedActive = Boolean(value && value !== 'all')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`w-full h-9 px-3 bg-white border rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs ${
          isSelectedActive
            ? 'bg-blue-50/60 border-blue-400 text-blue-900 font-semibold ring-2 ring-blue-500/10'
            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
        title={displayLabel}
      >
        <span className="flex items-center gap-1.5 truncate text-left font-medium min-w-0">
          {isSelectedActive && selectedOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`} />
          )}
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              minWidth: '180px',
              maxWidth: '260px',
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="max-h-[240px] overflow-y-auto space-y-0.5 custom-scrollbar">
              {options.map((opt) => {
                const isSelected =
                  (opt.value === 'all' && (!value || value === 'all')) ||
                  (opt.value !== 'all' &&
                    (opt.value.toLowerCase() === (value || '').toLowerCase() ||
                      (opt.value === 'DONE' &&
                        ((value || '').toLowerCase() === 'sale_won' ||
                          (value || '').toLowerCase() === 'sale won'))))

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`w-full px-2.5 py-1.5 flex items-center justify-between text-xs rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.dotColor ? (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                      ) : (
                        <span className="w-2 h-2 rounded-full shrink-0 bg-slate-300" />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

interface FunnelFilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

function FunnelFilterSelect({ value, onChange, options }: FunnelFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selectedOption = options.find(
    (opt) => opt.value.toLowerCase() === value.toLowerCase()
  )
  const displayLabel = value === 'all' || !value ? 'All Funnels' : selectedOption?.label || value

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 220
      const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight
      setMenuPos({
        top: openUpwards ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width, 180),
      })
      setSearch('')
      setIsOpen(true)
    }
  }

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
        (menuRef.current === e.target || menuRef.current.contains(e.target as Node))
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleResize = () => {
      setIsOpen(false)
    }

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
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    )
  }, [options, search])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`w-full h-9 px-3 bg-white border rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs ${
          value && value !== 'all'
            ? 'bg-blue-50/60 border-blue-400 text-blue-900 font-semibold ring-2 ring-blue-500/10'
            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
        title={displayLabel}
      >
        <span className="truncate text-left font-medium">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      {isOpen &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              minWidth: '180px',
              maxWidth: '280px',
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Quick search input */}
            {options.length > 5 && (
              <div className="relative mb-1">
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search funnel..."
                  className="w-full h-7 pl-2 pr-6 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable list with reduced length */}
            <div
              onScroll={(e) => e.stopPropagation()}
              className="max-h-[175px] overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar"
            >
              <button
                type="button"
                onClick={() => {
                  onChange('all')
                  setIsOpen(false)
                }}
                className={`w-full h-7 px-2 flex items-center justify-between text-xs rounded-md transition-colors cursor-pointer ${
                  value === 'all' || !value
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <span>All Funnels</span>
                {(value === 'all' || !value) && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>

              {filteredOptions.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-400">No funnels found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value.toLowerCase() === opt.value.toLowerCase()
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value)
                        setIsOpen(false)
                      }}
                      className={`w-full h-7 px-2 flex items-center justify-between text-xs rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate text-left">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}


interface DepartmentUserFilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

function DepartmentUserFilterSelect({ value, onChange, options }: DepartmentUserFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const selectedOption = options.find(
    (opt) => opt.value.toLowerCase() === value.toLowerCase()
  )
  const displayLabel =
    value === 'all' || !value
      ? 'All Users'
      : value === 'unassigned'
      ? 'Unassigned'
      : selectedOption?.label || formatRepLabel(value)

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 220
      const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight
      setMenuPos({
        top: openUpwards ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: Math.max(8, rect.left),
        width: Math.max(rect.width, 180),
      })
      setSearch('')
      setIsOpen(true)
    }
  }

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
        (menuRef.current === e.target || menuRef.current.contains(e.target as Node))
      ) {
        return
      }
      setIsOpen(false)
    }

    const handleResize = () => {
      setIsOpen(false)
    }

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
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    )
  }, [options, search])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className={`w-full h-9 px-3 bg-white border rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 shadow-2xs ${
          value && value !== 'all'
            ? 'bg-blue-50/60 border-blue-400 text-blue-900 font-semibold ring-2 ring-blue-500/10'
            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
        }`}
        title={displayLabel}
      >
        <span className="truncate text-left font-medium">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      {isOpen &&
        menuPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              width: `${menuPos.width}px`,
              minWidth: '180px',
              maxWidth: '280px',
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Quick search input */}
            {options.length > 5 && (
              <div className="relative mb-1">
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user..."
                  className="w-full h-7 pl-2 pr-6 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable list with reduced length */}
            <div
              onScroll={(e) => e.stopPropagation()}
              className="max-h-[175px] overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar"
            >
              <button
                type="button"
                onClick={() => {
                  onChange('all')
                  setIsOpen(false)
                }}
                className={`w-full h-7 px-2 flex items-center justify-between text-xs rounded-md transition-colors cursor-pointer ${
                  value === 'all' || !value
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <span>All Department Users</span>
                {(value === 'all' || !value) && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange('unassigned')
                  setIsOpen(false)
                }}
                className={`w-full h-7 px-2 flex items-center justify-between text-xs rounded-md transition-colors cursor-pointer ${
                  value === 'unassigned'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <span>Unassigned</span>
                {value === 'unassigned' && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
              </button>

              {filteredOptions.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-400">No users found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value.toLowerCase() === opt.value.toLowerCase()
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onChange(opt.value)
                        setIsOpen(false)
                      }}
                      className={`w-full h-7 px-2 flex items-center justify-between text-xs rounded-md transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate text-left">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export function LeadsManagementPage({ initialTab }: LeadsManagementPageProps = {}) {
  const [activeMainTab, setActiveMainTab] = useState<'leads' | 'summary' | 'payments'>(() => {
    if (initialTab) return initialTab
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('tab')?.toLowerCase()
      if (t === 'summary' || t === 'sales-summary') return 'summary'
      if (t === 'payments' || t === 'payment') return 'payments'
      if (window.location.pathname.includes('payment')) return 'payments'
      if (window.location.pathname.includes('sales-summary')) return 'summary'
    }
    return 'leads'
  })

  const [leads, setLeads] = useState<LeadInfo[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLeadStatus, setSelectedLeadStatus] = useState('all')
  const [selectedTelecallerStatus, setSelectedTelecallerStatus] = useState('all')
  const [selectedLeadType, setSelectedLeadType] = useState('all')
  const [selectedFunnel, setSelectedFunnel] = useState('all')
  const [selectedDepartmentUser, setSelectedDepartmentUser] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [funnels, setFunnels] = useState<FunnelItem[]>([])
  // Memoized, deduplicated, sorted funnels list
  const cleanFunnelOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: { value: string; label: string }[] = []

    funnels.forEach((f) => {
      const val = (f.funnelName || f.funnelType || '').trim()
      if (!val) return
      const key = val.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          value: val,
          label: val,
        })
      }
    })

    return list.sort((a, b) => a.label.localeCompare(b.label))
  }, [funnels])

  const funnelOptions = useMemo(() => {
    const seen = new Set<string>()
    return funnels.flatMap((funnel) => {
      const name = funnel.funnelName || funnel.funnelType || ''
      if (!name || seen.has(name)) return []
      seen.add(name)
      return [{ value: name, label: name }]
    })
  }, [funnels])
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  // Memoized, deduplicated, sorted assignable users list with clean labels
  const cleanAssignableOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: { value: string; label: string }[] = []

    assignableUsers.forEach((u) => {
      const val = (u.email || u.username || '').trim()
      if (!val) return
      const key = val.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          value: val,
          label: formatRepLabel(u.username, u.email),
        })
      }
    })

    return list.sort((a, b) => a.label.localeCompare(b.label))
  }, [assignableUsers])


  // Selection
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const singleSelectedLead = useMemo(() => {
    if (selectedLeads.length === 1) {
      return leads.find((l) => l.leadId === selectedLeads[0]) || null
    }
    return null
  }, [selectedLeads, leads])

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<LeadInfo | null>(null)

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [leadsToTransfer, setLeadsToTransfer] = useState<LeadInfo[]>([])
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedLeadForPayment, setSelectedLeadForPayment] = useState<LeadInfo | null>(null)

  const [telecallerModalOpen, setTelecallerModalOpen] = useState(false)
  const [telecallerMode, setTelecallerMode] = useState<'follow_up' | 'assign'>('follow_up')
  const [selectedLeadForTelecaller, setSelectedLeadForTelecaller] = useState<LeadInfo | null>(null)

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusModalData, setStatusModalData] = useState<{
    leadId: string
    leadName?: string
    currentStatus: string
    newStatus: string
  } | null>(null)

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }, [])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load funnels and assignable users once
  useEffect(() => {
    fetchFunnels().then((data) => setFunnels(data)).catch(() => {})
    fetchAssignableUsers().then((data) => setAssignableUsers(data)).catch(() => {})
  }, [])

  // Load leads
  const fetchLeadsData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await getLeads({
        page: currentPage,
        size: pageSize,
        search: debouncedSearch,
        leadStatus: selectedLeadStatus,
        telecallerStatus: selectedTelecallerStatus,
        leadType: selectedLeadType,
        funnelType: selectedFunnel,
        assignedUser: selectedDepartmentUser,
        startDate: startDate ? `${startDate}T00:00:00` : undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
      })
      setLeads(res.leads)
      setTotalElements(res.totalElements)
      setTotalPages(res.totalPages)

      // Auto-extract and populate any assigned users present in the fetched leads
      if (res.leads && res.leads.length > 0) {
        const assignedEmails = res.leads
          .map((l: any) => (l.assginedUser || l.telecallerAssigned || '').trim())
          .filter(Boolean)
        if (assignedEmails.length > 0) {
          setAssignableUsers((prev) => {
            const existing = new Set(prev.map((u) => (u.email || u.username).toLowerCase()))
            const additions: typeof prev = []
            assignedEmails.forEach((em: string) => {
              if (!existing.has(em.toLowerCase())) {
                existing.add(em.toLowerCase())
                additions.push({
                  email: em,
                  username: em.split('@')[0] || em,
                })
              }
            })
            return additions.length > 0 ? [...prev, ...additions] : prev
          })
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load leads from server.')
      setLeads([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    selectedLeadStatus,
    selectedTelecallerStatus,
    selectedLeadType,
    selectedFunnel,
    selectedDepartmentUser,
    startDate,
    endDate,
  ])

  useEffect(() => {
    if (activeMainTab === 'leads') {
      void fetchLeadsData()
    }
  }, [fetchLeadsData, activeMainTab])

  // Table selection
  const allCurrentPageSelected =
    leads.length > 0 && leads.every((l) => selectedLeads.includes(l.leadId))

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const currentIds = new Set(leads.map((l) => l.leadId))
      setSelectedLeads((prev) => prev.filter((id) => !currentIds.has(id)))
    } else {
      const combined = new Set([...selectedLeads, ...leads.map((l) => l.leadId)])
      setSelectedLeads(Array.from(combined))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Delete
  const handleDeleteSelected = () => {
    if (selectedLeads.length === 0) return
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteLeads(selectedLeads, false)
      showToast(`${selectedLeads.length} lead(s) deleted successfully.`, 'success')
      setSelectedLeads([])
      setDeleteModalOpen(false)
      await fetchLeadsData()
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete selected leads.', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Assign user to lead
  const handleAssignUser = async (leadId: string, assignedEmail: string) => {
    try {
      await assignLeadToUser(leadId, assignedEmail)
      showToast('Lead assigned successfully.', 'success')
      await fetchLeadsData()
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign lead.', 'error')
    }
  }

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    selectedLeadStatus !== 'all' ||
    selectedTelecallerStatus !== 'all' ||
    selectedLeadType !== 'all' ||
    selectedFunnel !== 'all' ||
    selectedDepartmentUser !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate)

  const activeFiltersCount = [
    selectedLeadStatus !== 'all',
    selectedTelecallerStatus !== 'all',
    selectedLeadType !== 'all',
    selectedFunnel !== 'all',
    selectedDepartmentUser !== 'all',
    Boolean(startDate || endDate),
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchTerm('')
    setDebouncedSearch('')
    setSelectedLeadStatus('all')
    setSelectedTelecallerStatus('all')
    setSelectedLeadType('all')
    setSelectedFunnel('all')
    setSelectedDepartmentUser('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(0)
  }

  const start = totalElements === 0 ? 0 : currentPage * pageSize + 1
  const end = Math.min((currentPage + 1) * pageSize, totalElements)

  return (
    <div className="space-y-4 px-3 py-4 font-sans sm:px-5 lg:px-6 xl:px-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-start gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl max-w-sm animate-in fade-in slide-in-from-top-4">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-xs font-bold text-slate-900 leading-snug">
              {toast.type === 'success' ? 'Success' : 'Notice'}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation (Leads, Summary, Payments) */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveMainTab('leads')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'leads'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Leads Management</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('summary')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'summary'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Sales Summary</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('payments')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'payments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Customer Payments</span>
        </button>
      </div>

      {activeMainTab === 'summary' && <SalesSummaryView />}
      {activeMainTab === 'payments' && <CustomerPaymentView />}

      {activeMainTab === 'leads' && (
        <section className="content-card admin-customers-card border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-visible">
          {/* Card Heading with Title, Subtitle & Action Toolbar */}
          <div className="admin-customers-card__heading flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Customers</h2>
              <p className="text-xs text-slate-500 mt-0.5">{totalElements.toLocaleString('en-IN')} customer accounts</p>
            </div>

            {/* Action Bar Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Box */}
              <div className="relative w-64 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedLeads.length > 0 && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedLeads.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAddLeadModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Lead</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Leads</span>
              </button>

              <button
                type="button"
                disabled={refreshing}
                onClick={() => fetchLeadsData(true)}
                aria-label="Refresh"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {showFilters && (
            <div className="px-5 py-3.5 border-t border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-slate-100/50">
              {/* Header row inside filter bar with active count and clear all */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>Filter Leads</span>
                  </span>
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      {activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'}
                    </span>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset all filters</span>
                  </button>
                )}
              </div>

              {/* 6 Filter inputs in a clean responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* 1. Sales Status */}
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Sales Status</span>
                    {selectedLeadStatus !== 'all' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </label>
                  <FilterDropdownSelect
                    value={selectedLeadStatus}
                    onChange={(val) => {
                      setSelectedLeadStatus(val)
                      setCurrentPage(0)
                    }}
                    options={SALES_STATUS_FILTER_OPTIONS}
                    allLabel="All Statuses"
                  />
                </div>

                {/* 2. Telecaller Status */}
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Telecaller Status</span>
                    {selectedTelecallerStatus !== 'all' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </label>
                  <FilterDropdownSelect
                    value={selectedTelecallerStatus}
                    onChange={(val) => {
                      setSelectedTelecallerStatus(val)
                      setCurrentPage(0)
                    }}
                    options={TELECALLER_STATUS_FILTER_OPTIONS}
                    allLabel="All Telecaller Statuses"
                  />
                </div>

                {/* 3. Lead Type */}
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Lead Type</span>
                    {selectedLeadType !== 'all' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </label>
                  <FilterDropdownSelect
                    value={selectedLeadType}
                    onChange={(val) => {
                      setSelectedLeadType(val)
                      setCurrentPage(0)
                    }}
                    options={LEAD_TYPE_FILTER_OPTIONS}
                    allLabel="All Lead Types"
                  />
                </div>

                {/* 4. Funnel Type */}
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Funnel Type</span>
                    {selectedFunnel !== 'all' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </label>
                  <FunnelFilterSelect
                    value={selectedFunnel}
                    onChange={(val) => {
                      setSelectedFunnel(val)
                      setCurrentPage(0)
                    }}
                    options={cleanFunnelOptions}
                  />
                </div>

                {/* 5. Department User */}
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Department User</span>
                    {selectedDepartmentUser !== 'all' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </label>
                  <DepartmentUserFilterSelect
                    value={selectedDepartmentUser}
                    onChange={(val) => {
                      setSelectedDepartmentUser(val)
                      setCurrentPage(0)
                    }}
                    options={cleanAssignableOptions}
                  />
                </div>

                {/* 6. Date Range */}
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Date Range</span>
                    {(startDate || endDate) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </label>
                  <div className="leads-filter-date-picker relative z-30">
                    <DateRangePicker
                      label="Date Range"
                      from={startDate}
                      to={endDate}
                      onChange={(start, end) => {
                        setStartDate(start)
                        setEndDate(end)
                        setCurrentPage(0)
                      }}
                      onReset={() => {
                        setStartDate('')
                        setEndDate('')
                        setCurrentPage(0)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table matching AdminCustomersPage / DataTable layout */}
          <div className="table-wrapper border-0 rounded-none overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
              <thead>
                <tr className="border-b border-slate-200/80">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="rounded w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 min-w-[200px]">CUSTOMER</th>
                  <th className="py-3 px-4 min-w-[190px]">EMAIL</th>
                  <th className="py-3 px-4 min-w-[130px]">PHONE</th>
                  <th className="py-3 px-4 min-w-[160px]">BUSINESS</th>
                  <th className="py-3 px-4 min-w-[120px]">FUNNEL TYPE</th>
                  <th className="py-3 px-4 min-w-[120px]">STATUS</th>
                  <th className="py-3 px-4 min-w-[140px]">ASSIGNED REP</th>
                  <th className="py-3 px-4 min-w-[110px] text-center">PAYMENT</th>
                  <th className="py-3 px-4 w-14 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading && !refreshing ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Loading leads data...</span>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="max-w-md mx-auto p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                        <p className="font-semibold text-xs mb-1">Failed to fetch leads</p>
                        <p className="text-xs text-rose-600 mb-2">{error}</p>
                        <button
                          type="button"
                          onClick={() => fetchLeadsData(true)}
                          className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                        >
                          Try Again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 mb-1">No Leads Found</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {hasActiveFilters
                          ? 'Try adjusting your search query or filter options.'
                          : 'No leads available yet. Use "Import Leads" to upload your Excel sheet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.leadId)
                    const customerInfo = getCustomerDisplay(lead)
                    const isPending = (lead.leadStatus || 'PENDING') === 'PENDING'
                    const isDone =
                      (lead.leadStatus || '').toUpperCase() === 'DONE' ||
                      (lead.leadStatus || '').toUpperCase() === 'SALE_WON' ||
                      (lead.leadStatus || '').toUpperCase() === 'SALE WON'
                    const displayStatus = isDone ? 'SALE WON' : (lead.leadStatus || 'PENDING')

                    return (
                      <tr
                        key={lead.leadId}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(lead.leadId)}
                            className="rounded w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Customer Identity matching AdminCustomersPage */}
                        <td className="py-3 px-4">
                          <div className="admin-customer-identity">
                            <span className="admin-customer-avatar">
                              {customerInfo.initial}
                            </span>
                            <div>
                              <strong>{customerInfo.name}</strong>
                              <span>Customer account</span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="truncate block max-w-[180px]" title={lead.businessEmail || ''}>
                            {lead.businessEmail || '—'}
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 font-bold text-slate-800 font-mono tracking-tight">
                          {lead.contact || '—'}
                        </td>

                        {/* Business */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="truncate block max-w-[160px]" title={lead.businessName || ''}>
                            {!isNa(lead.businessName) ? lead.businessName : '—'}
                          </span>
                        </td>

                        {/* Funnel Type */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                            {lead.funnelType || 'General'}
                          </span>
                        </td>

                        {/* Status matching admin-customer-status */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalData({
                                leadId: lead.leadId,
                                leadName: customerInfo.name,
                                currentStatus: lead.leadStatus || 'PENDING',
                                newStatus: isDone ? 'PENDING' : 'DONE',
                              })
                              setStatusModalOpen(true)
                            }}
                            className={`admin-customer-status cursor-pointer border-0 ${
                              isDone
                                ? ''
                                : isPending
                                ? 'bg-amber-100/80 text-amber-800'
                                : 'admin-customer-status--inactive'
                            }`}
                            title="Click to update status"
                          >
                            {displayStatus}
                          </button>
                        </td>

                        {/* Assigned Rep */}
                        <td className="py-3 px-4">
                          <AssignedRepSelect
                            leadId={lead.leadId}
                            currentVal={(lead.assginedUser || lead.telecallerAssigned || '').trim()}
                            options={cleanAssignableOptions}
                            onAssign={handleAssignUser}
                          />
                        </td>

                        {/* Payment */}
                        <td className="py-3 px-4 text-center">
                          {lead.paymentLink ? (
                            <a
                              href={lead.paymentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-customer-status inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Active</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLeadForPayment(lead)
                                setPaymentModalOpen(true)
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                            >
                              Generate Link
                            </button>
                          )}
                        </td>

                        {/* Actions matching admin-customer-view-button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            className="admin-customer-view-button mx-auto"
                            onClick={() => {
                              setSelectedLeadForDetails(lead)
                              setDetailsModalOpen(true)
                            }}
                            title={`View details for ${customerInfo.name}`}
                            aria-label={`View details for ${customerInfo.name}`}
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer matching AdminCustomersPage */}
          <div className="admin-customers-pagination">
            <label>
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setCurrentPage(0)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <div className="admin-customers-pagination__buttons">
              <button
                type="button"
                disabled={currentPage === 0 || loading}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ← Previous
              </button>
              <span>Page {currentPage + 1} of {Math.max(1, totalPages)}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1 || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next →
              </button>
            </div>
            <span>Showing {start}–{end} of {totalElements.toLocaleString('en-IN')}</span>
          </div>
        </section>
      )}

      {/* Modals */}
      <TransferLeadModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        leads={leadsToTransfer}
        assignableUsers={assignableUsers}
        onTransferred={() => {
          showToast(
            leadsToTransfer.length > 1
              ? `${leadsToTransfer.length} leads transferred successfully!`
              : 'Lead transferred successfully!',
            'success',
          )
          fetchLeadsData()
          setSelectedLeads([])
        }}
      />

      <AddLeadModal
        isOpen={addLeadModalOpen}
        onClose={() => setAddLeadModalOpen(false)}
        onSuccess={() => {
          showToast('Lead added successfully!', 'success')
          void fetchLeadsData()
        }}
        funnels={funnels}
        leadStatusOptions={LEAD_STATUS_OPTIONS}
        platformOptions={LEAD_TYPE_OPTIONS}
        assignableUsers={assignableUsers}
      />

      <UploadLeadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          showToast('Leads Excel imported successfully!', 'success')
          fetchFunnels().then((data) => setFunnels(data)).catch(() => {})
          void fetchLeadsData()
        }}
      />

      <LeadDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        lead={selectedLeadForDetails}
        onTransferClick={(lead) => {
          setLeadsToTransfer([lead])
          setTransferModalOpen(true)
        }}
      />

      <GeneratePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false)
          setSelectedLeadForPayment(null)
        }}
        lead={selectedLeadForPayment}
        onSuccess={(url) => {
          showToast('Payment link generated and copied!', 'success')
          if (selectedLeadForPayment) {
            setLeads((prev) =>
              prev.map((l) =>
                l.leadId === selectedLeadForPayment.leadId ? { ...l, paymentLink: url } : l
              )
            )
          }
          void fetchLeadsData()
        }}
      />

      <TelecallerActionModal
        isOpen={telecallerModalOpen}
        onClose={() => setTelecallerModalOpen(false)}
        lead={selectedLeadForTelecaller}
        mode={telecallerMode}
        assignableUsers={assignableUsers}
        onSuccess={() => {
          showToast('Telecaller status updated successfully!', 'success')
          void fetchLeadsData()
        }}
      />

      {statusModalData && (
        <UpdateLeadStatusModal
          isOpen={statusModalOpen}
          onClose={() => {
            setStatusModalOpen(false)
            setStatusModalData(null)
          }}
          leadId={statusModalData.leadId}
          leadName={statusModalData.leadName}
          currentStatus={statusModalData.currentStatus}
          newStatus={statusModalData.newStatus}
          onSuccess={() => {
            showToast('Sales status updated successfully!', 'success')
            void fetchLeadsData()
          }}
        />
      )}

      <DeleteLeadsModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        selectedCount={selectedLeads.length}
        isDeleting={isDeleting}
        selectedLeadDetails={singleSelectedLead}
      />
    </div>
  )
}
