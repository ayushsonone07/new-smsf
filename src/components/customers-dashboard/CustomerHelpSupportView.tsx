import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  connectCustomerHelpCenter,
  fetchCustomerTicketsPage,
  fetchCustomerTicketDetails,
  createCustomerTicket,
  fetchHelpCenterDepartmentsList,
  fetchCustomerStatusSummary,
  fetchCustomerTicketHistory,
  type CustomerTicketItem,
  type HelpCenterStatusSummary,
  type TicketHistoryEntry,
  type HelpCenterDepartment,
} from './api/customer-features.api'
import { useCustomerSession } from '../../features/customers/hooks/useCustomerSession'
import {
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  Lock,
  Hourglass,
  CircleDot,
  X,
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Ticket,
  Phone,
  CalendarCheck,
  Building2,
  Eye,
  EyeOff,
  Copy,
  UserCircle2,
  Megaphone,
  Cpu,
  Globe,
  FileText,
  CheckCircle,
} from 'lucide-react'

// ─── Department Meta & Icon helper ────────────────────────────────────────────
function getDeptMeta(deptName?: string) {
  const d = (deptName || '').toUpperCase()
  if (d.includes('ADS') || d.includes('ADVERTISEMENT') || d.includes('MARKETING')) {
    return {
      label: deptName || 'Advertisement',
      tagClass: 'dept-tag dept-ads',
      icon: Megaphone,
      iconBg: '#fef2f2',
      iconColor: '#ef4444',
      color: '#f87171',
    }
  }
  if (d.includes('AUTO') || d.includes('AUTOMATION')) {
    return {
      label: deptName || 'Automation',
      tagClass: 'dept-tag dept-auto',
      icon: Cpu,
      iconBg: '#ecfdf5',
      iconColor: '#10b981',
      color: '#34d399',
    }
  }
  if (d.includes('GOOGLE') || d.includes('GMB')) {
    return {
      label: deptName || 'Google',
      tagClass: 'dept-tag dept-google',
      icon: Search,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
      color: '#60a5fa',
    }
  }
  if (d.includes('WEB') || d.includes('WEBSITE') || d.includes('SEO')) {
    return {
      label: deptName || 'Website',
      tagClass: 'dept-tag dept-website',
      icon: Globe,
      iconBg: '#eef2ff',
      iconColor: '#6366f1',
      color: '#818cf8',
    }
  }
  if (d.includes('BILLING') || d.includes('INVOICE') || d.includes('PAYMENT')) {
    return {
      label: deptName || 'Billing',
      tagClass: 'dept-tag dept-billing',
      icon: FileText,
      iconBg: '#fefce8',
      iconColor: '#eab308',
      color: '#fbbf24',
    }
  }
  return {
    label: deptName || 'General Support',
    tagClass: 'dept-tag dept-general',
    icon: Ticket,
    iconBg: '#f8fafc',
    iconColor: '#64748b',
    color: '#94a3b8',
  }
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status?: string }) {
  const s = (status || '').toUpperCase()
  if (s === 'RESOLVED' || s === 'SOLVED') {
    return (
      <span className="pill pill-resolved">
        <Check size={10} strokeWidth={3} /> Resolved
      </span>
    )
  }
  if (s === 'WAITING_ON_CUSTOMER') {
    return (
      <span className="pill pill-waiting">
        <Hourglass size={10} /> Waiting on Customer
      </span>
    )
  }
  if (s === 'IN_PROGRESS' || s === 'ON PROCESS') {
    return (
      <span className="pill pill-progress">
        <RefreshCw size={10} className="animate-spin" /> In Progress
      </span>
    )
  }
  if (s === 'OPEN' || s === 'PENDING') {
    return (
      <span className="pill pill-open">
        <CircleDot size={10} /> Open
      </span>
    )
  }
  if (s === 'CLOSED') {
    return (
      <span className="pill pill-closed">
        <Lock size={10} /> Closed
      </span>
    )
  }
  if (s === 'ESCALATED') {
    return (
      <span className="pill pill-high">
        <AlertCircle size={10} /> Escalated
      </span>
    )
  }
  const cleanLabel = (status || 'Unknown').replace(/_/g, ' ')
  return <span className="pill pill-low">{cleanLabel}</span>
}

// ─── Priority Pill ────────────────────────────────────────────────────────────
function PriorityPill({ priority }: { priority?: string }) {
  const p = (priority || '').toUpperCase()
  if (p === 'HIGH' || p === 'CRITICAL' || p === 'URGENT') {
    return <span className="pill pill-high">{priority || 'High'}</span>
  }
  if (p === 'MEDIUM') {
    return <span className="pill pill-medium">Medium</span>
  }
  return <span className="pill pill-low">{priority || 'Low'}</span>
}

// ─── Format time helper ───────────────────────────────────────────────────────
function formatTimeAgo(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Invalid Date'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Invalid Date'
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  } catch {
    return 'Invalid Date'
  }
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
function DeptDonutChart({ data }: { data: { name: string; count: number; color: string }[] }) {
  const total = data.reduce((acc, curr) => acc + curr.count, 0)
  const size = 130
  const strokeWidth = 16
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius

  let accumulatedOffset = 0

  if (total === 0) {
    return (
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="transparent" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>No tickets</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
        {data.map((item, idx) => {
          const sliceLength = (item.count / total) * circumference
          const strokeDashoffset = -accumulatedOffset
          accumulatedOffset += sliceLength
          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${sliceLength} ${circumference - sliceLength}`}
              strokeDashoffset={strokeDashoffset}
              fill="transparent"
            />
          )
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>Tickets</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function CustomerHelpSupportView() {
  const { session } = useCustomerSession()
  const customerEmail = session?.email || session?.username || ''
  const customerName = session?.name || session?.company || 'Customer'

  // Loading & State
  const [loading, setLoading] = useState(true)
  const [ticketsList, setTicketsList] = useState<CustomerTicketItem[]>([])
  const [summary, setSummary] = useState<HelpCenterStatusSummary | null>(null)
  const [ticketDetailsMap, setTicketDetailsMap] = useState<Record<string, CustomerTicketItem>>({})
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set())

  // Pagination & Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [departments, setDepartments] = useState<HelpCenterDepartment[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string | number>('')
  const [newPriority, setNewPriority] = useState('MEDIUM')
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Success Modal
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null)

  // History Modal
  const [historyModalTicket, setHistoryModalTicket] = useState<{
    ticketNumber: string
    priority?: string
    status?: string
  } | null>(null)
  const [historyEntries, setHistoryEntries] = useState<TicketHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null)

  const ticketsRef = useRef<HTMLDivElement>(null)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTicketId(text)
    setTimeout(() => setCopiedTicketId(null), 2000)
  }

  const initialLoadDone = useRef(false)

  // Load departments & initialize session
  useEffect(() => {
    let active = true
    const init = async () => {
      if (!customerEmail) return
      try {
        await connectCustomerHelpCenter({ email: customerEmail, name: customerName })
        const depts = await fetchHelpCenterDepartmentsList()
        if (active) {
          setDepartments(depts)
          if (depts.length > 0) setSelectedDeptId(depts[0].id)
        }
        if (active) {
          await loadData(0)
        }
      } catch (err) {
        console.warn('Help Center init warning:', err)
        if (active) {
          await loadData(0)
        }
      }
    }
    init()
    return () => { active = false }
  }, [customerEmail, customerName])

  // Load Status Summary & Tickets
  const loadData = async (targetPage = page) => {
    if (!customerEmail) return
    setLoading(true)
    try {
      const [sumRes, pageRes] = await Promise.all([
        fetchCustomerStatusSummary(customerEmail),
        fetchCustomerTicketsPage({
          email: customerEmail,
          page: targetPage,
          size: pageSize,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: search || undefined,
        }),
      ])

      if (sumRes) setSummary(sumRes)

      // Normalize tickets list
      let parsedItems: CustomerTicketItem[] = []
      if (Array.isArray(pageRes.content) && pageRes.content.length > 0) {
        parsedItems = pageRes.content
      } else if (pageRes.tickets && typeof pageRes.tickets === 'object') {
        const rawMap = pageRes.tickets
        parsedItems = Object.entries(rawMap).map(([ticketNumber, subject]) => {
          const deptName = pageRes.departments?.[ticketNumber]
          return {
            ticketNumber,
            subject: typeof subject === 'string' ? subject : String((subject as any)?.subject || ticketNumber),
            departmentName: deptName,
            status: 'OPEN',
            priority: 'MEDIUM',
          }
        })
      }

      setTicketsList(parsedItems)
      setTotalRecords(pageRes.totalRecords || parsedItems.length)
      setTotalPages(pageRes.totalPages || 1)
      setPage(targetPage)

      // Eagerly pre-fetch details for visible tickets
      parsedItems.forEach((t) => {
        if (!ticketDetailsMap[t.ticketNumber]) {
          fetchCustomerTicketDetails(t.ticketNumber, customerEmail).then((res) => {
            if (res) {
              setTicketDetailsMap((prev) => ({ ...prev, [t.ticketNumber]: res }))
            }
          })
        }
      })
    } catch {
      // keep fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      return
    }
    loadData(0)
  }, [statusFilter, priorityFilter])

  // Toggle Accordion View
  const toggleTicketView = (ticketNumber: string) => {
    setExpandedTickets((prev) => {
      const next = new Set(prev)
      if (next.has(ticketNumber)) {
        next.delete(ticketNumber)
      } else {
        next.add(ticketNumber)
        if (!ticketDetailsMap[ticketNumber]) {
          fetchCustomerTicketDetails(ticketNumber, customerEmail).then((res) => {
            if (res) setTicketDetailsMap((m) => ({ ...m, [ticketNumber]: res }))
          })
        }
      }
      return next
    })
  }

  // View History
  const handleOpenHistory = async (ticketNumber: string, priority?: string, status?: string) => {
    setHistoryModalTicket({ ticketNumber, priority, status })
    setHistoryLoading(true)
    try {
      const entries = await fetchCustomerTicketHistory(ticketNumber, 0, 20)
      setHistoryEntries(entries)
    } catch {
      setHistoryEntries([])
    } finally {
      setHistoryLoading(false)
    }
  }

  // Create Ticket Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubject.trim() || !newDescription.trim()) return

    setIsSubmitting(true)
    try {
      const selectedDept = departments.find((d) => String(d.id) === String(selectedDeptId))
      const deptName = selectedDept?.name || 'General Support'

      const res = await createCustomerTicket({
        email: customerEmail,
        phoneNumber: newPhone.trim() || undefined,
        phone: newPhone.trim() || undefined,
        subject: newSubject.trim(),
        description: newDescription.trim(),
        departmentId: selectedDeptId,
        departmentName: deptName,
        priority: newPriority,
      })

      setCreateOpen(false)
      setNewSubject('')
      setNewDescription('')
      setNewPhone('')
      setSuccessTicketId(res.ticketNumber)
      showToast(`Ticket #${res.ticketNumber} created successfully!`)
      await loadData(0)
    } catch (err: any) {
      showToast(err.message || 'Failed to create ticket', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Monthly Tickets Calculations ──────────────────────────────────────────
  const now = new Date()
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'long' })
  const currentYear = now.getFullYear()
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthShort = nextMonthDate.toLocaleDateString('en-US', { month: 'short' })
  const resetDateLabel = `${currentMonthName} ${currentYear} · resets ${nextMonthShort} 1`

  const monthlyLimit = summary?.monthlyLimit ?? 10
  const monthlyUsed = summary?.monthlyUsed ?? ticketsList.length
  const effectiveRemaining = summary?.monthlyRemaining ?? Math.max(0, monthlyLimit - monthlyUsed)

  const getZone = (remaining: number) => {
    if (remaining >= 7) return { text: '#10b981', bg: '#10b981' }
    if (remaining >= 4) return { text: '#f59e0b', bg: '#f59e0b' }
    return { text: '#ef4444', bg: '#ef4444' }
  }
  const zone = getZone(effectiveRemaining)

  // ─── KPI Strip Counts ──────────────────────────────────────────────────────
  const statusCounts = summary?.statusCounts || {}
  const totalCount = summary?.totalCount ?? totalRecords
  const openCount = statusCounts.OPEN ?? ticketsList.filter((t) => (t.status || '').toUpperCase() === 'OPEN').length
  const inProgressCount =
    statusCounts.IN_PROGRESS ?? ticketsList.filter((t) => (t.status || '').toUpperCase().includes('PROGRESS')).length
  const resolvedCount =
    statusCounts.RESOLVED ?? ticketsList.filter((t) => ['RESOLVED', 'CLOSED'].includes((t.status || '').toUpperCase())).length
  const closedCount = statusCounts.CLOSED ?? ticketsList.filter((t) => (t.status || '').toUpperCase() === 'CLOSED').length

  // Distinct departments
  const distinctDeptsCount = useMemo(() => {
    const s = new Set<string>()
    ticketsList.forEach((t) => {
      const d = ticketDetailsMap[t.ticketNumber]?.department?.name || t.departmentName
      if (d) s.add(d)
    })
    return Math.max(1, s.size)
  }, [ticketsList, ticketDetailsMap])

  // ─── Analytics: By Department & Priority Mix ──────────────────────────────
  const departmentChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    ticketsList.forEach((t) => {
      const detail = ticketDetailsMap[t.ticketNumber]
      const rawDept = detail?.department?.name || t.departmentName || 'General Support'
      const meta = getDeptMeta(rawDept)
      counts[meta.label] = (counts[meta.label] || 0) + 1
    })

    return Object.entries(counts).map(([name, count]) => {
      const meta = getDeptMeta(name)
      return { name, count, color: meta.color }
    })
  }, [ticketsList, ticketDetailsMap])

  const priorityCounts = useMemo(() => {
    let high = 0
    let medium = 0
    let low = 0
    ticketsList.forEach((t) => {
      const pri = (ticketDetailsMap[t.ticketNumber]?.priority || t.priority || 'MEDIUM').toUpperCase()
      if (pri === 'HIGH' || pri === 'CRITICAL' || pri === 'URGENT') high++
      else if (pri === 'MEDIUM') medium++
      else low++
    })
    const total = ticketsList.length || 1
    return {
      high,
      medium,
      low,
      highPct: Math.round((high / total) * 100),
      mediumPct: Math.round((medium / total) * 100),
      lowPct: Math.round((low / total) * 100),
      total: ticketsList.length,
    }
  }, [ticketsList, ticketDetailsMap])

  return (
    <div style={{ padding: '24px 32px', minHeight: 'calc(100vh - 64px)', background: '#f8fafc', color: '#0f172a' }}>
      {/* Embedded CSS matching SMSF 1:1 */}
      <style>{`
        .kpi-card { transition: all .2s ease; }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px -12px rgba(30,64,175,.18); }
        .chart-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; }
        .pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; }
        .pill-medium { background: #fef3c7; color: #b45309; }
        .pill-high { background: #fee2e2; color: #b91c1c; }
        .pill-low { background: #f1f5f9; color: #475569; }
        .pill-resolved { background: #dcfce7; color: #15803d; }
        .pill-waiting { background: #f5f3ff; color: #6d28d9; }
        .pill-open { background: #dbeafe; color: #1d4ed8; }
        .pill-closed { background: #f1f5f9; color: #475569; }
        .pill-progress { background: #fef9c3; color: #a16207; }
        .dept-tag { font-size: 10px; font-weight: 700; letter-spacing: .04em; padding: 3px 9px; border-radius: 6px; }
        .dept-ads { background: #fef2f2; color: #b91c1c; }
        .dept-auto { background: #ecfdf5; color: #047857; }
        .dept-google { background: #eff6ff; color: #1d4ed8; }
        .dept-website { background: #eef2ff; color: #4338ca; }
        .dept-billing { background: #fefce8; color: #a16207; }
        .dept-general { background: #f8fafc; color: #475569; }
        .ticket-view { max-height: 0; overflow: hidden; transition: max-height .35s cubic-bezier(0.4, 0, 0.2, 1); }
        .ticket-view.open { max-height: 500px; }
      `}</style>

      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* ══════ HERO BANNER ══════ */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #1d4ed8 100%)',
          padding: '24px 28px',
          boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
          color: '#ffffff',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-64px',
            right: '-40px',
            width: '256px',
            height: '256px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            filter: 'blur(48px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#dbeafe',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '4px 10px',
                borderRadius: '999px',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              MBG CARD
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 2px 0' }}>Help &amp; Support</h2>
            <p style={{ fontSize: '13px', color: '#bfdbfe', margin: 0 }}>Raise tickets and manage your support requests.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCreateOpen(true)}
              style={{
                background: '#ffffff',
                color: '#1d4ed8',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <Plus size={14} /> Create New Ticket
            </button>

            <button
              onClick={() => ticketsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Ticket size={14} /> View Tickets
            </button>

            <a
              href="tel:18001037"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                padding: '8px 14px',
                borderRadius: '8px',
                textDecoration: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Phone size={14} /> Support: 1800 1037
            </a>
          </div>
        </div>
      </div>

      {/* ══════ MONTHLY TICKETS + KPI STRIP ROW ══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Monthly Tickets Widget */}
        <div
          className="chart-card"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                  Monthly Tickets
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{resetDateLabel}</p>
              </div>
              <CalendarCheck size={18} color="#94a3b8" />
            </div>

            {/* Big Number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: zone.text, lineHeight: 1 }}>
                {effectiveRemaining}
              </span>
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>remaining</span>
            </div>

            {/* 10 Segmented Slots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px', marginBottom: '14px' }}>
              {Array.from({ length: 10 }).map((_, i) => {
                const isUsed = i < monthlyUsed
                return (
                  <div
                    key={i}
                    style={{
                      height: '32px',
                      borderRadius: '6px',
                      background: isUsed ? '#e2e8f0' : zone.bg,
                      transition: 'all 0.3s ease',
                    }}
                    title={isUsed ? `Used ticket #${i + 1}` : `Available slot #${i + 1}`}
                  />
                )
              })}
            </div>
          </div>

          {/* Zones legend */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: '#475569', fontWeight: 500 }}>10 → 7 remaining</span>
              </div>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Safe</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ color: '#475569', fontWeight: 500 }}>6 → 4 remaining</span>
              </div>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Low</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: '#475569', fontWeight: 500 }}>3 → 0 remaining</span>
              </div>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Critical</span>
            </div>
          </div>
        </div>

        {/* KPI Strip (6 Cards in 3x2 Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {/* Total */}
          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ticket size={14} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
          </div>

          {/* Open */}
          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircleDot size={14} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{openCount}</div>
          </div>

          {/* In Progress */}
          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Progress</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={14} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{inProgressCount}</div>
          </div>

          {/* Resolved */}
          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={14} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{resolvedCount}</div>
          </div>

          {/* Closed */}
          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closed</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={14} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{closedCount}</div>
          </div>

          {/* Depts */}
          <div className="kpi-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Depts</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={14} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{distinctDeptsCount}</div>
          </div>
        </div>
      </div>

      {/* ══════ ANALYTICS ROW (By Department + Priority Mix) ══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* By Department Card */}
        <div className="chart-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>By Department</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#64748b' }}>
            Your {ticketsList.length} tickets across departments
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <DeptDonutChart data={departmentChartData} />

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto' }}>
              {departmentChartData.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No department tickets to display</p>
              ) : (
                departmentChartData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color }} />
                      <span style={{ color: '#475569', fontWeight: 600 }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Priority Mix Card */}
        <div className="chart-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Priority Mix</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#64748b' }}>
              From your {ticketsList.length} tickets
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* High / Critical */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
                    High / Critical
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>
                    {priorityCounts.high} {priorityCounts.high === 1 ? 'ticket' : 'tickets'} ({priorityCounts.highPct}%)
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(to right, #f43f5e, #dc2626)',
                      width: `${priorityCounts.highPct}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Medium */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
                    Medium
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>
                    {priorityCounts.medium} {priorityCounts.medium === 1 ? 'ticket' : 'tickets'} ({priorityCounts.mediumPct}%)
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
                      width: `${priorityCounts.mediumPct}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Low */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                    Low
                  </span>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>
                    {priorityCounts.low} {priorityCounts.low === 1 ? 'ticket' : 'tickets'} ({priorityCounts.lowPct}%)
                  </span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(to right, #cbd5e1, #94a3b8)',
                      width: `${priorityCounts.lowPct}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ MY TICKETS SECTION ══════ */}
      <div ref={ticketsRef} className="chart-card" style={{ overflow: 'hidden' }}>
        {/* Section Top Controls */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>My tickets</h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              {totalRecords > 0 ? `${totalRecords} tickets · ` : ''}
              {currentMonthName} {currentYear}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadData(0)
                }}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12px',
                color: '#334155',
              }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="ESCALATED">Escalated</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setPage(0)
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12px',
                color: '#334155',
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(0)}
              disabled={loading}
              title="Refresh tickets"
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tickets Cards List */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#4f46e5' }} />
            <span>Loading tickets...</span>
          </div>
        ) : ticketsList.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>
            <Ticket size={36} style={{ margin: '0 auto 10px', display: 'block' }} />
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#1e293b' }}>No tickets found</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              {statusFilter || priorityFilter || search ? 'No tickets match your filters' : 'Create a new ticket to get started'}
            </p>
          </div>
        ) : (
          <div>
            {ticketsList.map((ticket) => {
              const isExpanded = expandedTickets.has(ticket.ticketNumber)
              const detail = ticketDetailsMap[ticket.ticketNumber]
              const rawDept = detail?.department?.name || ticket.departmentName || 'General Support'
              const deptMeta = getDeptMeta(rawDept)
              const DeptIconComp = deptMeta.icon
              const timeAgo = formatTimeAgo(detail?.updatedAt || detail?.createdAt)

              return (
                <div key={ticket.ticketNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Ticket Front Row */}
                  <div
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      flexWrap: 'wrap',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Icon Box */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: deptMeta.iconBg,
                        color: deptMeta.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <DeptIconComp size={18} />
                    </div>

                    {/* Title and tags */}
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {ticket.subject || '(no subject)'}
                        </span>
                        <span className={deptMeta.tagClass}>{rawDept}</span>
                        <PriorityPill priority={detail?.priority || ticket.priority} />
                        <StatusPill status={detail?.status || ticket.status} />
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{ticket.ticketNumber}</span>
                        {timeAgo && (
                          <>
                            <span>·</span>
                            <span>Updated {timeAgo}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => toggleTicketView(ticket.ticketNumber)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
                        {isExpanded ? 'Hide' : 'View'}
                      </button>

                      <button
                        onClick={() =>
                          handleOpenHistory(
                            ticket.ticketNumber,
                            detail?.priority || ticket.priority,
                            detail?.status || ticket.status
                          )
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <History size={13} /> History
                      </button>

                      <button
                        onClick={() => copyToClipboard(ticket.ticketNumber)}
                        title="Copy ticket ID"
                        style={{
                          padding: '7px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: copiedTicketId === ticket.ticketNumber ? '#10b981' : '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {copiedTicketId === ticket.ticketNumber ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Expanded Details (Image 1) */}
                  <div className={`ticket-view ${isExpanded ? 'open' : ''}`} style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Description Box */}
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                          DESCRIPTION
                        </span>
                        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '12px 14px' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {detail?.description || 'Only for Help Center Testing'}
                          </p>
                        </div>
                      </div>

                      {/* 6-Item Meta Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        {/* Raised by */}
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            RAISED BY
                          </span>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                            {detail?.userDto?.name || customerName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {detail?.userDto?.email || customerEmail}
                          </div>
                        </div>

                        {/* Assigned to */}
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            ASSIGNED TO
                          </span>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                            {detail?.assignedTo || 'Unassigned'}
                          </div>
                        </div>

                        {/* Full Ticket ID */}
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            FULL TICKET ID
                          </span>
                          <div
                            style={{
                              display: 'inline-block',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '4px 10px',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#334155',
                            }}
                          >
                            {ticket.ticketNumber}
                          </div>
                        </div>

                        {/* Created */}
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            CREATED
                          </span>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                            {formatDate(detail?.createdAt)}
                          </div>
                        </div>

                        {/* Resolved */}
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            RESOLVED
                          </span>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                            {formatDate(detail?.resolvedAt)}
                          </div>
                        </div>

                        {/* Last Updated */}
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                            LAST UPDATED
                          </span>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                            {formatDate(detail?.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing page {page + 1} of {totalPages}
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    disabled={page === 0}
                    onClick={() => loadData(page - 1)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: page === 0 ? 'not-allowed' : 'pointer',
                      opacity: page === 0 ? 0.5 : 1,
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => loadData(page + 1)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                      opacity: page >= totalPages - 1 ? 0.5 : 1,
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* TICKET HISTORY MODAL (Matching Image 2 1:1) */}
      {/* ────────────────────────────────────────────────────────────── */}
      {historyModalTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setHistoryModalTicket(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Ticket History</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                    {historyModalTicket.ticketNumber}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {historyModalTicket.status && <StatusPill status={historyModalTicket.status} />}
                {historyModalTicket.priority && <PriorityPill priority={historyModalTicket.priority} />}
                <button
                  onClick={() => setHistoryModalTicket(null)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Timeline Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {historyLoading ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#4f46e5' }} />
                  <span>Loading timeline...</span>
                </div>
              ) : historyEntries.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8' }}>
                  <History size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>No status changes recorded yet.</p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '32px' }}>
                  {/* Vertical connecting line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '11px',
                      top: '12px',
                      bottom: '12px',
                      width: '2px',
                      background: '#e2e8f0',
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {historyEntries.map((entry, idx) => {
                      const s = (entry.status || '').toUpperCase()
                      const isResolved = s === 'RESOLVED' || s === 'SOLVED'
                      const isWaiting = s === 'WAITING_ON_CUSTOMER'
                      const isOpen = s === 'OPEN' || s === 'PENDING'

                      const nodeBg = isResolved ? '#dcfce7' : isWaiting ? '#f3e8ff' : isOpen ? '#dbeafe' : '#fef3c7'
                      const nodeColor = isResolved ? '#15803d' : isWaiting ? '#7e22ce' : isOpen ? '#1d4ed8' : '#b45309'

                      return (
                        <div key={`${entry.id}-${idx}`} style={{ position: 'relative' }}>
                          {/* Circular status node */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '-32px',
                              top: '2px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: nodeBg,
                              color: nodeColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 0 4px #ffffff',
                            }}
                          >
                            {isResolved ? (
                              <Check size={12} strokeWidth={3} />
                            ) : isWaiting ? (
                              <Hourglass size={12} />
                            ) : isOpen ? (
                              <CircleDot size={12} />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                          </div>

                          {/* Entry card */}
                          <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <StatusPill status={entry.status} />
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {new Date(entry.updatedAt).toLocaleString(undefined, {
                                  month: '2-digit',
                                  day: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {entry.previousStatus && (
                              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569' }}>
                                Status changed from{' '}
                                <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>
                                  {entry.previousStatus.replace(/_/g, ' ')}
                                </strong>{' '}
                                <span style={{ color: '#94a3b8' }}>→</span>{' '}
                                <strong style={{ color: nodeColor, textTransform: 'uppercase' }}>
                                  {entry.status.replace(/_/g, ' ')}
                                </strong>
                              </p>
                            )}

                            {entry.remark && (
                              <div
                                style={{
                                  background: '#ffffff',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  padding: '10px 12px',
                                  fontSize: '13px',
                                  color: '#334155',
                                  marginBottom: '10px',
                                }}
                              >
                                {entry.remark}
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                              <span>
                                <UserCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: '#3b82f6' }} />
                                Updated by <strong style={{ color: '#1e293b' }}>{entry.updatedBy || 'System'}</strong>
                              </span>
                              {entry.assignedTo && <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{entry.assignedTo}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setHistoryModalTicket(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* CREATE TICKET MODAL */}
      {/* ────────────────────────────────────────────────────────────── */}
      {createOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Create New Ticket</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  Fill in the details to raise a support request
                </p>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {/* Information box */}
              <div style={{ background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', padding: '14px', marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Your Account Information
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>Email</label>
                    <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {customerEmail}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>Account Name</label>
                    <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>{customerName}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>Customer ID</label>
                    <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>{session?.customerId || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Subject <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Optional Phone Number */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Phone Number <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Optional contact number"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Department & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Department <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Priority <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your issue or request in detail..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* SUCCESS MODAL */}
      {/* ────────────────────────────────────────────────────────────── */}
      {successTicketId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSuccessTicketId(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle size={32} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
              Ticket Created Successfully!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Your ticket <strong style={{ color: '#0f172a' }}>#{successTicketId}</strong> has been assigned to our support team.
            </p>

            <button
              onClick={() => setSuccessTicketId(null)}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* DIRECT CONTACT SUPPORT MODAL */}
      {/* ────────────────────────────────────────────────────────────── */}
      {/* (Accessible via the 1800 helpline button in banner) */}
    </div>
  )
}
