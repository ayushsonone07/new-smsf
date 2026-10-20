import { useState, useRef, useEffect, useCallback } from 'react'
import { Globe, Bot, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { getCustomerInternalRemarks, type CustomerRemark } from '../../../api/customer-drawer.api'
import type { AutowebsionCustomerLightDTO } from '../../../api/autowebsion.api'

// Module-level cache for internal remark history
const internalRemarkHistoryCache = new Map<string, CustomerRemark[]>()

export function invalidateInternalRemarkHistoryCache(
  customerId?: number,
  departmentType?: string,
) {
  if (customerId && departmentType) {
    internalRemarkHistoryCache.delete(`${customerId}:${departmentType}`)
  } else if (customerId) {
    for (const key of internalRemarkHistoryCache.keys()) {
      if (key.startsWith(`${customerId}:`)) {
        internalRemarkHistoryCache.delete(key)
      }
    }
  } else {
    internalRemarkHistoryCache.clear()
  }
}

export function formatRemarkTimestamp(ts?: string): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  const dateStr = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  return `${dateStr}, ${timeStr}`
}

export function getInternalRemarkForDepartment(
  customer: AutowebsionCustomerLightDTO,
  dept: 'WEBSITE' | 'AUTOMATION',
): string {
  if (!customer) return ''
  const services = Array.isArray(customer.services) ? customer.services : []
  for (const service of services) {
    const st = String(service?.serviceType || '').toUpperCase()
    if (st.includes(dept)) {
      const rem =
        service?.internalRemark || service?.departmentRemark || service?.remark || ''
      if (
        rem &&
        String(rem).trim().toUpperCase() !== 'NO REMARKS' &&
        String(rem).trim().toUpperCase() !== 'NO REMARK'
      ) {
        return String(rem).trim()
      }
    }
  }

  const customerRemark = customer.internalRemark || ''
  if (
    customerRemark &&
    String(customerRemark).trim().toUpperCase() !== 'NO REMARKS' &&
    String(customerRemark).trim().toUpperCase() !== 'NO REMARK'
  ) {
    return String(customerRemark).trim()
  }

  return ''
}

export interface InternalRemarkBadgeProps {
  customer: AutowebsionCustomerLightDTO
  customerId: number
  customerName: string
  departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT'
  userEmail?: string
  activePopoverKey: string | null
  setActivePopoverKey: (key: string | null) => void
  onOpenFullDialog: (
    customer: AutowebsionCustomerLightDTO,
    departmentType: 'WEBSITE_DEPARTMENT' | 'AUTOMATION_DEPARTMENT',
    remarks: CustomerRemark[],
  ) => void
}

export function InternalRemarkBadge({
  customer,
  customerId,
  customerName,
  departmentType,
  userEmail,
  activePopoverKey,
  setActivePopoverKey,
  onOpenFullDialog,
}: InternalRemarkBadgeProps) {
  const isWebsite = departmentType === 'WEBSITE_DEPARTMENT'
  const deptKey: 'WEBSITE' | 'AUTOMATION' = isWebsite ? 'WEBSITE' : 'AUTOMATION'
  const popoverKey = `${customerId}:${departmentType}`
  const isOpen = activePopoverKey === popoverKey

  const containerRef = useRef<HTMLDivElement>(null)
  const [remarks, setRemarks] = useState<CustomerRemark[] | null>(() => {
    return internalRemarkHistoryCache.get(popoverKey) || null
  })
  const [isLoading, setIsLoading] = useState(false)

  const localRemark = getInternalRemarkForDepartment(customer, deptKey)
  const hasRemark = remarks !== null ? remarks.length > 0 : Boolean(localRemark)

  const fetchHistory = useCallback(async () => {
    const cached = internalRemarkHistoryCache.get(popoverKey)
    if (cached) {
      setRemarks(cached)
      return
    }

    setIsLoading(true)
    try {
      const data = await getCustomerInternalRemarks(customerId, departmentType, userEmail)
      const list = Array.isArray(data) ? data : []
      internalRemarkHistoryCache.set(popoverKey, list)
      setRemarks(list)
    } catch {
      setRemarks([])
    } finally {
      setIsLoading(false)
    }
  }, [customerId, departmentType, popoverKey, userEmail])

  const togglePopover = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isOpen) {
        setActivePopoverKey(null)
      } else {
        setActivePopoverKey(popoverKey)
        fetchHistory()
      }
    },
    [isOpen, popoverKey, setActivePopoverKey, fetchHistory],
  )

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePopoverKey(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, setActivePopoverKey])

  const sortedRemarks = (remarks ?? []).slice().sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0
    return tB - tA
  })

  const previewEntries = sortedRemarks.slice(0, 2)

  const pillClass = isWebsite
    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'

  const icon = isWebsite ? (
    <Globe size={11} className="text-blue-600 flex-shrink-0" />
  ) : (
    <Bot size={11} className="text-purple-600 flex-shrink-0" />
  )

  const label = isWebsite ? 'Website' : 'Automation'
  const displayText = hasRemark ? 'View Remark' : 'No Remarks'

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 ${isOpen ? 'z-40' : 'z-10'}`}
    >
      {/* Pill Badge */}
      <button
        type="button"
        onClick={togglePopover}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${pillClass}`}
        title={
          hasRemark
            ? `${customerName} (${label}): Click to view remark history`
            : `${customerName} (${label}): No Remarks`
        }
      >
        {icon}
        <span className="truncate max-w-[130px] font-semibold">{displayText}</span>
      </button>

      {/* Small Chevron Down Button */}
      <button
        type="button"
        onClick={togglePopover}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-xs cursor-pointer"
        title={`View ${label} remark history`}
      >
        <ChevronDown size={10} />
      </button>

      {/* Popover Card matching screenshot */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 animate-in fade-in duration-100 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-sm font-bold text-slate-800 mb-2">History</div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-slate-500 text-xs gap-2">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span>Loading history...</span>
            </div>
          ) : sortedRemarks.length === 0 ? (
            <div className="py-2 text-xs text-slate-500">No history found</div>
          ) : (
            <div className="space-y-2">
              {previewEntries.map((entry, index) => (
                <div key={index}>
                  {index > 0 && <div className="my-2 border-t border-slate-100" />}
                  <div className="text-xs font-semibold text-slate-700">
                    {formatRemarkTimestamp(entry.timestamp)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Updated by:{' '}
                    <span className="font-semibold text-indigo-600">
                      {entry.staffName || 'Unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setActivePopoverKey(null)
              onOpenFullDialog(customer, departmentType, sortedRemarks)
            }}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            <span>View All History</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
